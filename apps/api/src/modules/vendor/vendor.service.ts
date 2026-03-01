import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { createVendorSchema } from 'shared/validators'
import { ABIDJAN_COMMUNES } from 'shared/constants'
import type { CatalogItemStatus } from '@prisma/client'

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
        documentNumber,
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
        { vendorId: vendor.id, guaranteeType: 'WARRANTY_30D' },
      ],
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
    guarantees: [
      {
        type: 'RETURN_48H',
        label: 'Garantie retour pièce incorrecte : reprise sous 48h, remboursement intégral',
        signed: vendor.guaranteeSignatures.some((s) => s.guaranteeType === 'RETURN_48H'),
        signedAt: vendor.guaranteeSignatures.find((s) => s.guaranteeType === 'RETURN_48H')?.signedAt ?? null,
      },
      {
        type: 'WARRANTY_30D',
        label: 'Garantie pièces d\'occasion : fonctionnement minimum 30 jours',
        signed: vendor.guaranteeSignatures.some((s) => s.guaranteeType === 'WARRANTY_30D'),
        signedAt: vendor.guaranteeSignatures.find((s) => s.guaranteeType === 'WARRANTY_30D')?.signedAt ?? null,
      },
    ],
    allSigned: vendor.guaranteeSignatures.length >= 2,
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
