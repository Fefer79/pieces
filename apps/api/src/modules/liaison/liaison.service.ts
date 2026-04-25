import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  liaisonCreateVendorSchema,
  liaisonUpdateVendorSchema,
  liaisonCreatePartSchema,
} from 'shared/validators'
import type { CatalogItemStatus } from '@prisma/client'

const VENDOR_DETAIL_SELECT = {
  id: true,
  shopName: true,
  contactName: true,
  phone: true,
  vendorType: true,
  status: true,
  commune: true,
  address: true,
  lat: true,
  lng: true,
  deliveryZones: true,
  managedByLiaisonId: true,
  userId: true,
  createdAt: true,
  kyc: {
    select: {
      id: true,
      kycType: true,
      documentNumber: true,
      isPublic: true,
    },
  },
} as const

export async function createVendorByLiaison(liaisonId: string, body: unknown) {
  const parsed = liaisonCreateVendorSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('LIAISON_VENDOR_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const data = parsed.data

  const phoneTaken = await prisma.vendor.findFirst({
    where: { phone: data.phone },
    select: { id: true },
  })
  if (phoneTaken) {
    throw new AppError('LIAISON_VENDOR_PHONE_TAKEN', 409, {
      message: 'Un vendeur avec ce numéro existe déjà',
    })
  }

  return prisma.$transaction(async (tx) => {
    const vendor = await tx.vendor.create({
      data: {
        shopName: data.shopName,
        contactName: data.contactName,
        phone: data.phone,
        vendorType: data.vendorType,
        status: 'PENDING_ACTIVATION',
        commune: data.commune,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        deliveryZones: data.deliveryZones,
        managedByLiaisonId: liaisonId,
      },
    })

    await tx.vendorKyc.create({
      data: {
        vendorId: vendor.id,
        kycType: data.kycType,
        documentNumber: data.documentNumber,
        isPublic: data.kycType === 'RCCM',
      },
    })

    return tx.vendor.findUniqueOrThrow({
      where: { id: vendor.id },
      select: VENDOR_DETAIL_SELECT,
    })
  })
}

export async function listLiaisonVendors(liaisonId: string) {
  const vendors = await prisma.vendor.findMany({
    where: { managedByLiaisonId: liaisonId },
    select: {
      ...VENDOR_DETAIL_SELECT,
      _count: { select: { catalogItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return vendors.map((v) => ({
    ...v,
    catalogCount: v._count.catalogItems,
    _count: undefined,
  }))
}

export async function getLiaisonVendor(liaisonId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, managedByLiaisonId: liaisonId },
    select: {
      ...VENDOR_DETAIL_SELECT,
      _count: { select: { catalogItems: true } },
    },
  })

  if (!vendor) {
    throw new AppError('LIAISON_VENDOR_NOT_FOUND', 404, {
      message: 'Vendeur introuvable ou non géré par cette liaison',
    })
  }

  return { ...vendor, catalogCount: vendor._count.catalogItems, _count: undefined }
}

export async function updateLiaisonVendor(
  liaisonId: string,
  vendorId: string,
  body: unknown,
) {
  const parsed = liaisonUpdateVendorSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('LIAISON_VENDOR_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const owned = await prisma.vendor.findFirst({
    where: { id: vendorId, managedByLiaisonId: liaisonId },
    select: { id: true },
  })
  if (!owned) {
    throw new AppError('LIAISON_VENDOR_NOT_FOUND', 404, {
      message: 'Vendeur introuvable ou non géré par cette liaison',
    })
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: parsed.data,
  })

  return prisma.vendor.findUniqueOrThrow({
    where: { id: vendorId },
    select: VENDOR_DETAIL_SELECT,
  })
}

export async function createPartForVendor(
  liaisonId: string,
  vendorId: string,
  body: unknown,
) {
  const parsed = liaisonCreatePartSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('LIAISON_PART_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, managedByLiaisonId: liaisonId },
    select: { id: true },
  })
  if (!vendor) {
    throw new AppError('LIAISON_VENDOR_NOT_FOUND', 404, {
      message: 'Vendeur introuvable ou non géré par cette liaison',
    })
  }

  return prisma.catalogItem.create({
    data: {
      vendorId,
      createdByLiaisonId: liaisonId,
      name: parsed.data.name,
      category: parsed.data.category,
      oemReference: parsed.data.oemReference,
      vehicleCompatibility: parsed.data.vehicleCompatibility,
      price: parsed.data.price,
      condition: parsed.data.condition,
      warrantyMonths: parsed.data.warrantyMonths,
      inStock: parsed.data.inStock,
      imageOriginalUrl: parsed.data.imageOriginalUrl,
      status: 'PUBLISHED',
      aiGenerated: false,
    },
    select: {
      id: true,
      vendorId: true,
      name: true,
      category: true,
      condition: true,
      price: true,
      status: true,
      inStock: true,
      createdAt: true,
    },
  })
}

export async function listVendorParts(liaisonId: string, vendorId: string) {
  const vendor = await prisma.vendor.findFirst({
    where: { id: vendorId, managedByLiaisonId: liaisonId },
    select: { id: true },
  })
  if (!vendor) {
    throw new AppError('LIAISON_VENDOR_NOT_FOUND', 404, {
      message: 'Vendeur introuvable ou non géré par cette liaison',
    })
  }

  return prisma.catalogItem.findMany({
    where: { vendorId },
    select: {
      id: true,
      name: true,
      category: true,
      condition: true,
      price: true,
      status: true,
      inStock: true,
      imageThumbUrl: true,
      createdAt: true,
      createdByLiaisonId: true,
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function listLiaisonParts(liaisonId: string) {
  return prisma.catalogItem.findMany({
    where: { createdByLiaisonId: liaisonId },
    select: {
      id: true,
      name: true,
      category: true,
      condition: true,
      price: true,
      status: true,
      inStock: true,
      imageThumbUrl: true,
      createdAt: true,
      vendor: {
        select: {
          id: true,
          shopName: true,
          contactName: true,
          phone: true,
          commune: true,
          address: true,
          lat: true,
          lng: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getLiaisonDashboard(liaisonId: string) {
  const [vendorTotal, vendorActive, partTotal, partsByStatus] = await Promise.all([
    prisma.vendor.count({ where: { managedByLiaisonId: liaisonId } }),
    prisma.vendor.count({
      where: { managedByLiaisonId: liaisonId, status: 'ACTIVE' },
    }),
    prisma.catalogItem.count({ where: { createdByLiaisonId: liaisonId } }),
    prisma.catalogItem.groupBy({
      by: ['status'],
      where: { createdByLiaisonId: liaisonId },
      _count: { status: true },
    }),
  ])

  const countByStatus = (s: CatalogItemStatus) =>
    partsByStatus.find((p) => p.status === s)?._count.status ?? 0

  return {
    vendors: {
      total: vendorTotal,
      active: vendorActive,
      pending: vendorTotal - vendorActive,
    },
    parts: {
      total: partTotal,
      published: countByStatus('PUBLISHED'),
      draft: countByStatus('DRAFT'),
      archived: countByStatus('ARCHIVED'),
    },
  }
}
