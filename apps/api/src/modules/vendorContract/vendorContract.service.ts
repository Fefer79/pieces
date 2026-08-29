import { randomBytes } from 'node:crypto'
import { VENDOR_CONTRACT_VERSION, getVendorContractVersion } from 'shared/contracts'
import type { CreateVendorContractInput, AcceptVendorContractInput } from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

/** Base URL publique du site (pour construire le lien partageable). */
function publicBaseUrl(): string {
  return process.env.WEB_BASE_URL?.replace(/\/$/, '') ?? 'https://pieces.ci'
}

function contractUrl(token: string): string {
  return `${publicBaseUrl()}/vendeur/contrat/${token}`
}

/** Projection commune des listes / créations de contrat. */
const CONTRACT_SUMMARY_SELECT = {
  id: true,
  token: true,
  contractVersion: true,
  status: true,
  vendorId: true,
  sellerName: true,
  shopName: true,
  phone: true,
  signedName: true,
  signedAt: true,
  createdAt: true,
} as const

/**
 * Génère un lien de contrat d'adhésion pour un vendeur (existant ou prospect).
 * Émis par un admin ou une liaison ; envoyé au vendeur via WhatsApp.
 */
export async function createVendorContract(
  createdById: string,
  input: CreateVendorContractInput,
  creatorRoles: string[] = [],
) {
  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { id: true, managedByLiaisonId: true },
    })
    if (!vendor) {
      throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Vendeur introuvable' })
    }
    // Une LIAISON ne peut émettre un contrat que pour un vendeur qu'elle gère.
    // Un ADMIN n'est pas restreint.
    if (!creatorRoles.includes('ADMIN') && vendor.managedByLiaisonId !== createdById) {
      throw new AppError('VENDOR_NOT_FOUND', 404, {
        message: 'Vendeur introuvable ou non géré par cette liaison',
      })
    }
  }

  // Idempotence terrain : deux appuis sur « Générer le lien » ne doivent pas
  // laisser deux contrats vivants pour le même vendeur. On réutilise le lien
  // en attente de la version courante s'il existe déjà.
  if (input.vendorId) {
    const pending = await prisma.vendorContract.findFirst({
      where: {
        vendorId: input.vendorId,
        status: 'PENDING',
        contractVersion: VENDOR_CONTRACT_VERSION,
      },
      orderBy: { createdAt: 'desc' },
      select: CONTRACT_SUMMARY_SELECT,
    })
    if (pending) return { ...pending, url: contractUrl(pending.token) }
  }

  const token = randomBytes(16).toString('hex')

  const contract = await prisma.vendorContract.create({
    data: {
      token,
      contractVersion: VENDOR_CONTRACT_VERSION,
      vendorId: input.vendorId ?? null,
      sellerName: input.sellerName,
      shopName: input.shopName ?? null,
      phone: input.phone ?? null,
      createdById,
    },
    select: CONTRACT_SUMMARY_SELECT,
  })

  return { ...contract, url: contractUrl(contract.token) }
}

/**
 * Liste des contrats émis — pour le suivi terrain (commercial, liaison) et le
 * back-office.
 *
 * `scopeToCreator` restreint la vue à ce que l'utilisateur a émis lui-même ou
 * aux vendeurs qu'il gère : c'est le cas d'une LIAISON, qui n'a pas à voir le
 * portefeuille des autres. Un ADMIN ou un membre d'équipe habilité voit tout.
 */
export async function listVendorContracts(
  userId: string,
  options: { scopeToCreator: boolean; vendorId?: string; limit?: number },
) {
  const contracts = await prisma.vendorContract.findMany({
    where: {
      ...(options.vendorId ? { vendorId: options.vendorId } : {}),
      ...(options.scopeToCreator
        ? { OR: [{ createdById: userId }, { vendor: { managedByLiaisonId: userId } }] }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options.limit ?? 100,
    select: CONTRACT_SUMMARY_SELECT,
  })

  return contracts.map((c) => ({ ...c, url: contractUrl(c.token) }))
}

/**
 * Vue publique d'un contrat via son token : statut + infos pré-remplies +
 * contenu intégral du contrat (source unique partagée avec le PDF).
 */
export async function getVendorContractByToken(token: string) {
  const contract = await prisma.vendorContract.findUnique({
    where: { token },
    select: {
      token: true,
      contractVersion: true,
      status: true,
      sellerName: true,
      shopName: true,
      phone: true,
      signedName: true,
      signedAt: true,
      createdAt: true,
    },
  })
  if (!contract) {
    throw new AppError('CONTRACT_NOT_FOUND', 404, { message: 'Contrat introuvable' })
  }

  return {
    ...contract,
    url: contractUrl(token),
    // Le texte affiché est celui de la version figée sur le contrat : un lien
    // émis avant une mise à jour se lit et se signe dans sa version d'origine.
    content: getVendorContractVersion(contract.contractVersion).contract,
  }
}

/**
 * Acceptation / signature électronique. Idempotence stricte : un contrat déjà
 * signé ne peut pas être re-signé ; un contrat révoqué est refusé.
 */
export async function acceptVendorContract(
  token: string,
  input: AcceptVendorContractInput,
  meta: { ip?: string; userAgent?: string },
) {
  const contract = await prisma.vendorContract.findUnique({
    where: { token },
    select: { id: true, status: true, vendorId: true },
  })
  if (!contract) {
    throw new AppError('CONTRACT_NOT_FOUND', 404, { message: 'Contrat introuvable' })
  }
  if (contract.status === 'ACCEPTED') {
    throw new AppError('CONTRACT_ALREADY_ACCEPTED', 409, {
      message: 'Ce contrat a déjà été signé',
    })
  }
  if (contract.status === 'REVOKED') {
    throw new AppError('CONTRACT_REVOKED', 410, {
      message: 'Ce contrat n’est plus valable',
    })
  }

  const updated = await prisma.vendorContract.update({
    where: { id: contract.id },
    data: {
      status: 'ACCEPTED',
      signedName: input.signedName,
      signedAt: new Date(),
      acceptedIp: meta.ip ?? null,
      acceptedUserAgent: meta.userAgent ?? null,
    },
    select: {
      token: true,
      status: true,
      signedName: true,
      signedAt: true,
      contractVersion: true,
    },
  })

  const vendorActivated = contract.vendorId
    ? await activateVendorOnSignature(contract.vendorId)
    : false

  return { ...updated, vendorActivated }
}

/**
 * La signature du contrat vaut activation du vendeur.
 *
 * Le contrat porte lui-même le socle de reprise (article 7 : livraison non
 * effectuée, refus à la livraison, non-conformité signalée sous 48 h) — le même
 * que celui signé depuis l'espace vendeur via `signGuarantees`. Sans cette bascule, un vendeur onboardé sur le terrain
 * resterait en attente d'activation indéfiniment et ses pièces ne sortiraient
 * jamais dans la recherche, qui exige un vendeur ACTIVE.
 *
 * Idempotent : on ne touche qu'un vendeur en attente, et les signatures de
 * garanties sont créées en `skipDuplicates` (contrainte unique vendeur+type).
 */
async function activateVendorOnSignature(vendorId: string): Promise<boolean> {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { id: true, status: true },
  })
  if (!vendor || vendor.status !== 'PENDING_ACTIVATION') return false

  await prisma.$transaction(async (tx) => {
    await tx.vendorGuaranteeSignature.createMany({
      data: [
        { vendorId: vendor.id, guaranteeType: 'RETURN_48H' },
        { vendorId: vendor.id, guaranteeType: 'DELIVERY_REFUSAL' },
      ],
      skipDuplicates: true,
    })
    await tx.vendor.update({ where: { id: vendor.id }, data: { status: 'ACTIVE' } })
  })

  return true
}
