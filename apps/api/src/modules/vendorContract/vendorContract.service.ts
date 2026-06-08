import { randomBytes } from 'node:crypto'
import { VENDOR_CONTRACT, VENDOR_CONTRACT_VERSION } from 'shared/contracts'
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

/**
 * Génère un lien de contrat d'adhésion pour un vendeur (existant ou prospect).
 * Émis par un admin ou une liaison ; envoyé au vendeur via WhatsApp.
 */
export async function createVendorContract(createdById: string, input: CreateVendorContractInput) {
  if (input.vendorId) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { id: true },
    })
    if (!vendor) {
      throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Vendeur introuvable' })
    }
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
    select: {
      id: true,
      token: true,
      contractVersion: true,
      status: true,
      sellerName: true,
      shopName: true,
      phone: true,
      createdAt: true,
    },
  })

  return { ...contract, url: contractUrl(contract.token) }
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
    content: VENDOR_CONTRACT,
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
    select: { id: true, status: true },
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

  return updated
}
