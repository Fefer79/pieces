import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { createVendorSchema } from 'shared/validators'
import { ABIDJAN_COMMUNES } from 'shared/constants'
import type { CatalogItemStatus } from '@prisma/client'
import { storeKycPhoto, readKycPhoto } from '../../lib/kycPhoto.js'

export async function createVendor(userId: string, body: unknown) {
  const parsed = createVendorSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('VENDOR_INVALID_DATA', 422, {
      message: parsed.error.issues[0]?.message,
    })
  }

  const existingVendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (existingVendor) {
    throw new AppError('VENDOR_ALREADY_EXISTS', 409, {
      message: 'Un profil vendeur existe déjà pour cet utilisateur',
    })
  }

  const { shopName, contactName, phone, vendorType, documentNumber, kycType } =
    parsed.data

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        userId,
        shopName,
        contactName,
        phone,
        vendorType,
        status: 'PENDING_ACTIVATION',
      },
    })

    await tx.vendorKyc.create({
      data: {
        vendorId: vendor.id,
        kycType,
        // Informel sans numéro dicté : la fiche existe, la photo la complète.
        documentNumber: documentNumber ?? null,
        isPublic: kycType === 'RCCM',
      },
    })

    return tx.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      select: {
        id: true,
        shopName: true,
        contactName: true,
        phone: true,
        vendorType: true,
        status: true,
        createdAt: true,
        kyc: {
          select: {
            id: true,
            kycType: true,
            documentNumber: true,
            isPublic: true,
          },
        },
      },
    })
  })
}

export async function signGuarantees(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, status: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  if (vendor.status === 'ACTIVE') {
    throw new AppError('VENDOR_ALREADY_ACTIVE', 409, {
      message: 'Le profil vendeur est déjà activé',
    })
  }

  if (vendor.status !== 'PENDING_ACTIVATION') {
    throw new AppError('VENDOR_INVALID_STATUS', 422, {
      message: 'Le profil vendeur doit être en attente d\'activation pour signer les garanties',
    })
  }

  return prisma.$transaction(async (tx) => {
    await tx.vendorGuaranteeSignature.createMany({
      data: [
        { vendorId: vendor.id, guaranteeType: 'RETURN_48H' },
        { vendorId: vendor.id, guaranteeType: 'DELIVERY_REFUSAL' },
      ],
      // Le contrat d'adhésion signé sur le terrain a pu déjà les enregistrer.
      skipDuplicates: true,
    })

    await tx.vendor.update({
      where: { id: vendor.id },
      data: { status: 'ACTIVE' },
    })

    return tx.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      select: {
        id: true,
        shopName: true,
        contactName: true,
        phone: true,
        vendorType: true,
        status: true,
        createdAt: true,
        kyc: {
          select: {
            id: true,
            kycType: true,
            documentNumber: true,
            isPublic: true,
          },
        },
        guaranteeSignatures: {
          select: {
            id: true,
            guaranteeType: true,
            signedAt: true,
          },
        },
      },
    })
  })
}

export async function getGuaranteeStatus(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      shopName: true,
      vendorType: true,
      status: true,
      guaranteeSignatures: {
        select: {
          id: true,
          guaranteeType: true,
          signedAt: true,
        },
      },
    },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  return {
    vendorId: vendor.id,
    shopName: vendor.shopName,
    vendorType: vendor.vendorType,
    status: vendor.status,
    // Socle de reprise du contrat v1.2 : ce que doit tout vendeur, même sur une
    // pièce vendue sans garantie. La garantie commerciale, elle, se décide
    // pièce par pièce à la publication.
    guarantees: [
      {
        type: 'DELIVERY_REFUSAL',
        label:
          'Reprise à la livraison : livraison non effectuée ou pièce refusée pour non-conformité — remboursement intégral',
        signed: vendor.guaranteeSignatures.some((s) => s.guaranteeType === 'DELIVERY_REFUSAL'),
        signedAt:
          vendor.guaranteeSignatures.find((s) => s.guaranteeType === 'DELIVERY_REFUSAL')?.signedAt ?? null,
      },
      {
        type: 'RETURN_48H',
        label:
          'Retour sous 48 h : pièce non conforme à l’annonce signalée après la livraison — reprise et remboursement',
        signed: vendor.guaranteeSignatures.some((s) => s.guaranteeType === 'RETURN_48H'),
        signedAt: vendor.guaranteeSignatures.find((s) => s.guaranteeType === 'RETURN_48H')?.signedAt ?? null,
      },
    ],
    // Les vendeurs de la v1.1 ont signé RETURN_48H + WARRANTY_30D : leur socle
    // est couvert, on ne les renvoie pas signer.
    allSigned:
      vendor.guaranteeSignatures.some((s) => s.guaranteeType === 'RETURN_48H') &&
      vendor.guaranteeSignatures.some(
        (s) => s.guaranteeType === 'DELIVERY_REFUSAL' || s.guaranteeType === 'WARRANTY_30D',
      ),
  }
}

export async function getMyVendor(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: {
      id: true,
      shopName: true,
      contactName: true,
      phone: true,
      vendorType: true,
      status: true,
      createdAt: true,
      kyc: {
        select: {
          id: true,
          kycType: true,
          documentNumber: true,
          isPublic: true,
        },
      },
    },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  return vendor
}

export async function getDeliveryZones(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, deliveryZones: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  const allCommunes = [...ABIDJAN_COMMUNES]
  const allAbidjan = allCommunes.length === vendor.deliveryZones.length &&
    allCommunes.every((c) => vendor.deliveryZones.includes(c))

  return {
    zones: vendor.deliveryZones,
    allAbidjan,
  }
}

export async function updateDeliveryZones(userId: string, zones: string[]) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  const updated = await prisma.vendor.update({
    where: { id: vendor.id },
    data: { deliveryZones: zones },
    select: { deliveryZones: true },
  })

  const allCommunes = [...ABIDJAN_COMMUNES]
  const allAbidjan = allCommunes.length === updated.deliveryZones.length &&
    allCommunes.every((c) => updated.deliveryZones.includes(c))

  return {
    zones: updated.deliveryZones,
    allAbidjan,
  }
}

export async function getVendorDashboard(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, shopName: true, status: true, deliveryZones: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  const statusCounts = await prisma.catalogItem.groupBy({
    by: ['status'],
    where: { vendorId: vendor.id },
    _count: { status: true },
  })

  const outOfStockCount = await prisma.catalogItem.count({
    where: { vendorId: vendor.id, status: 'PUBLISHED', inStock: false },
  })

  const countByStatus = (s: CatalogItemStatus) =>
    statusCounts.find((c) => c.status === s)?._count.status ?? 0

  return {
    vendor: {
      id: vendor.id,
      shopName: vendor.shopName,
      status: vendor.status,
      deliveryZonesCount: vendor.deliveryZones.length,
    },
    catalog: {
      published: countByStatus('PUBLISHED'),
      draft: countByStatus('DRAFT'),
      archived: countByStatus('ARCHIVED'),
      outOfStock: outOfStockCount,
    },
  }
}

/**
 * Photo de la pièce d'identité prise par le vendeur lui-même à l'inscription
 * (CNI, passeport, permis ou attestation pour un vendeur informel).
 */
export async function uploadMyKycPhoto(userId: string, fileBuffer: Buffer, mimeType: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, vendorType: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur pour cet utilisateur',
    })
  }
  const stored = await storeKycPhoto(vendor.id, vendor.vendorType, fileBuffer, mimeType)
  return { vendorId: vendor.id, kycType: stored.kycType, documentImageAt: stored.documentImageAt }
}

export async function getMyKycPhoto(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId }, select: { id: true } })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur pour cet utilisateur',
    })
  }
  return readKycPhoto(vendor.id)
}
