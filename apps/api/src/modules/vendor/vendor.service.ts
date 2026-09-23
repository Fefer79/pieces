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
    // Socle de reprise du contrat v1.3 : ce que doit tout vendeur, même sur une
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
          'Retour sous 24 h : pièce non conforme à l’annonce signalée après la livraison — reprise et remboursement',
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

const DELIVERED_ORDER_STATUSES = ['DELIVERED', 'CONFIRMED', 'COMPLETED'] as const

/**
 * Chiffre d'affaires des 30 derniers jours — commandes marketplace livrées
 * (revenu reconnu) + ventes hors-plateforme (VendorSale), par jour et par
 * article. Donne au vendeur une visibilité qu'aucun carnet papier n'offre.
 */
export async function getVendorSalesSummary(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  const since = new Date()
  since.setDate(since.getDate() - 30)

  const [orderItems, vendorSales] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        vendorId: vendor.id,
        createdAt: { gte: since },
        order: { status: { in: [...DELIVERED_ORDER_STATUSES] } },
      },
      select: { name: true, priceSnapshot: true, quantity: true, createdAt: true },
    }),
    prisma.vendorSale.findMany({
      where: { vendorId: vendor.id, soldAt: { gte: since } },
      select: { itemName: true, totalAmount: true, quantity: true, soldAt: true },
    }),
  ])

  const dayKey = (d: Date) => d.toISOString().slice(0, 10)
  const byDay = new Map<string, { orders: number; offPlatform: number }>()
  const byItem = new Map<string, { name: string; revenue: number; quantity: number }>()

  for (const i of orderItems) {
    const amount = i.priceSnapshot * i.quantity
    const day = byDay.get(dayKey(i.createdAt)) ?? { orders: 0, offPlatform: 0 }
    day.orders += amount
    byDay.set(dayKey(i.createdAt), day)

    const item = byItem.get(i.name) ?? { name: i.name, revenue: 0, quantity: 0 }
    item.revenue += amount
    item.quantity += i.quantity
    byItem.set(i.name, item)
  }

  for (const s of vendorSales) {
    const day = byDay.get(dayKey(s.soldAt)) ?? { orders: 0, offPlatform: 0 }
    day.offPlatform += s.totalAmount
    byDay.set(dayKey(s.soldAt), day)

    const item = byItem.get(s.itemName) ?? { name: s.itemName, revenue: 0, quantity: 0 }
    item.revenue += s.totalAmount
    item.quantity += s.quantity
    byItem.set(s.itemName, item)
  }

  const daily = [...byDay.entries()]
    .map(([date, v]) => ({ date, orders: v.orders, offPlatform: v.offPlatform, total: v.orders + v.offPlatform }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const topItems = [...byItem.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10)

  const totalOrdersRevenue = orderItems.reduce((sum, i) => sum + i.priceSnapshot * i.quantity, 0)
  const totalOffPlatformRevenue = vendorSales.reduce((sum, s) => sum + s.totalAmount, 0)

  return {
    periodDays: 30,
    totalRevenue: totalOrdersRevenue + totalOffPlatformRevenue,
    totalOrdersRevenue,
    totalOffPlatformRevenue,
    daily,
    topItems,
  }
}

/**
 * Historique client dérivé — regroupement par téléphone des commandes
 * marketplace et des ventes hors-plateforme. Vue calculée, pas de table
 * persistée : VendorContact est le CRM de prospection du liaison, pas le
 * carnet client d'un vendeur.
 */
export async function getVendorCustomers(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, {
      message: 'Aucun profil vendeur trouvé pour cet utilisateur',
    })
  }

  const ACTIVE_ORDER_STATUSES = [
    ...DELIVERED_ORDER_STATUSES,
    'PAID',
    'VENDOR_CONFIRMED',
    'DISPATCHED',
    'IN_TRANSIT',
  ] as const

  const [orders, vendorSales] = await Promise.all([
    prisma.order.findMany({
      where: {
        items: { some: { vendorId: vendor.id } },
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
      select: {
        totalAmount: true,
        createdAt: true,
        ownerPhone: true,
        initiator: { select: { phone: true, name: true } },
      },
    }),
    prisma.vendorSale.findMany({
      where: { vendorId: vendor.id, buyerPhone: { not: null } },
      select: { buyerPhone: true, buyerName: true, totalAmount: true, soldAt: true },
    }),
  ])

  interface CustomerAgg {
    phone: string
    name: string | null
    purchaseCount: number
    lastActivityAt: Date
    totalSpend: number
  }
  const byPhone = new Map<string, CustomerAgg>()

  for (const o of orders) {
    const phone = o.ownerPhone ?? o.initiator.phone
    if (!phone) continue
    const c = byPhone.get(phone) ?? {
      phone,
      name: o.initiator.name,
      purchaseCount: 0,
      lastActivityAt: o.createdAt,
      totalSpend: 0,
    }
    c.purchaseCount += 1
    c.totalSpend += o.totalAmount
    if (o.createdAt > c.lastActivityAt) c.lastActivityAt = o.createdAt
    if (!c.name && o.initiator.name) c.name = o.initiator.name
    byPhone.set(phone, c)
  }

  for (const s of vendorSales) {
    const phone = s.buyerPhone
    if (!phone) continue
    const c = byPhone.get(phone) ?? {
      phone,
      name: s.buyerName,
      purchaseCount: 0,
      lastActivityAt: s.soldAt,
      totalSpend: 0,
    }
    c.purchaseCount += 1
    c.totalSpend += s.totalAmount
    if (s.soldAt > c.lastActivityAt) c.lastActivityAt = s.soldAt
    if (!c.name && s.buyerName) c.name = s.buyerName
    byPhone.set(phone, c)
  }

  return [...byPhone.values()].sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime())
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
