import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  liaisonCreateVendorSchema,
  liaisonUpdateVendorSchema,
  liaisonCreatePartSchema,
  liaisonUpdatePartSchema,
  liaisonQuickPartSchema,
  minCommissionFor,
} from 'shared/validators'
import type { CatalogItemStatus, Prisma } from '@prisma/client'

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
        contactName: data.contactName ?? data.shopName,
        phone: data.phone,
        vendorType: data.vendorType,
        status: 'PENDING_ACTIVATION',
        commune: data.commune ?? null,
        address: data.address ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        deliveryZones: data.deliveryZones,
        managedByLiaisonId: liaisonId,
      },
    })

    // KYC facultatif à l'onboarding : créé seulement si un document est fourni.
    if (data.documentNumber && data.kycType) {
      await tx.vendorKyc.create({
        data: {
          vendorId: vendor.id,
          kycType: data.kycType,
          documentNumber: data.documentNumber,
          isPublic: data.kycType === 'RCCM',
        },
      })
    }

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

  const { documentNumber, kycType, ...vendorFields } = parsed.data

  const owned = await prisma.vendor.findFirst({
    where: { id: vendorId, managedByLiaisonId: liaisonId },
    select: { id: true, vendorType: true },
  })
  if (!owned) {
    throw new AppError('LIAISON_VENDOR_NOT_FOUND', 404, {
      message: 'Vendeur introuvable ou non géré par cette liaison',
    })
  }

  // Le type KYC doit correspondre au type vendeur effectif (FORMAL → RCCM, INFORMAL → CNI).
  if (documentNumber) {
    const effectiveType = vendorFields.vendorType ?? owned.vendorType
    const expected = effectiveType === 'FORMAL' ? 'RCCM' : 'CNI'
    if (kycType !== expected) {
      throw new AppError('LIAISON_VENDOR_INVALID', 422, {
        message: `Le type KYC doit être ${expected} pour un vendeur ${effectiveType === 'FORMAL' ? 'formel' : 'informel'}`,
      })
    }
  }

  await prisma.$transaction(async (tx) => {
    if (Object.keys(vendorFields).length > 0) {
      await tx.vendor.update({ where: { id: vendorId }, data: vendorFields })
    }
    if (documentNumber && kycType) {
      await tx.vendorKyc.upsert({
        where: { vendorId },
        create: { vendorId, kycType, documentNumber, isPublic: kycType === 'RCCM' },
        update: { kycType, documentNumber, isPublic: kycType === 'RCCM' },
      })
    }
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

  const price = parsed.data.price ?? 0
  const minRequired = minCommissionFor(price)
  const commissionAmount = Math.max(parsed.data.commissionAmount ?? minRequired, minRequired)
  const fitments = parsed.data.fitments ?? []

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
      warrantyValue: parsed.data.warrantyValue,
      warrantyUnit: parsed.data.warrantyUnit,
      commissionAmount,
      inStock: parsed.data.inStock,
      imageOriginalUrl: parsed.data.imageOriginalUrl,
      status: 'PUBLISHED',
      aiGenerated: false,
      ...(fitments.length > 0 && {
        fitments: {
          create: fitments.map((f) => ({
            brand: f.brand,
            model: f.model ?? null,
            yearFrom: f.yearFrom ?? null,
            yearTo: f.yearTo ?? null,
            engine: f.engine ?? null,
          })),
        },
      }),
    },
    select: {
      id: true,
      vendorId: true,
      name: true,
      category: true,
      condition: true,
      price: true,
      commissionAmount: true,
      status: true,
      inStock: true,
      createdAt: true,
    },
  })
}

/**
 * Saisie rapide : enregistre le vendeur tiers (nom, contact, location) ET publie
 * l'annonce en une seule étape. Le vendeur est dédupliqué sur (liaison, téléphone)
 * pour éviter de recréer une fiche à chaque annonce du même vendeur.
 */
export async function createPartWithQuickVendor(liaisonId: string, body: unknown) {
  const parsed = liaisonQuickPartSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('LIAISON_PART_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const { vendor: vendorInput, ...partInput } = parsed.data

  // Un vendeur déjà enregistré sous ce téléphone : réutilisé s'il est géré par cette
  // liaison, sinon conflit (le numéro appartient à un autre vendeur/compte).
  const existing = await prisma.vendor.findFirst({
    where: { phone: vendorInput.phone },
    select: { id: true, managedByLiaisonId: true },
  })
  if (existing && existing.managedByLiaisonId !== liaisonId) {
    throw new AppError('LIAISON_VENDOR_PHONE_TAKEN', 409, {
      message: 'Un vendeur avec ce numéro existe déjà',
    })
  }

  const price = partInput.price ?? 0
  const minRequired = minCommissionFor(price)
  const commissionAmount = Math.max(partInput.commissionAmount ?? minRequired, minRequired)
  const fitments = partInput.fitments ?? []

  return prisma.$transaction(async (tx) => {
    let vendorId: string
    if (existing) {
      // Réutilise et rafraîchit nom/location au cas où ils auraient changé.
      const updated = await tx.vendor.update({
        where: { id: existing.id },
        data: {
          shopName: vendorInput.shopName,
          contactName: vendorInput.contactName,
          commune: vendorInput.commune,
          address: vendorInput.address ?? undefined,
        },
        select: { id: true },
      })
      vendorId = updated.id
    } else {
      const created = await tx.vendor.create({
        data: {
          shopName: vendorInput.shopName,
          contactName: vendorInput.contactName,
          phone: vendorInput.phone,
          vendorType: 'INFORMAL',
          status: 'PENDING_ACTIVATION',
          commune: vendorInput.commune,
          address: vendorInput.address,
          managedByLiaisonId: liaisonId,
        },
        select: { id: true },
      })
      vendorId = created.id
    }

    const part = await tx.catalogItem.create({
      data: {
        vendorId,
        createdByLiaisonId: liaisonId,
        name: partInput.name,
        category: partInput.category,
        oemReference: partInput.oemReference,
        vehicleCompatibility: partInput.vehicleCompatibility,
        price: partInput.price,
        condition: partInput.condition,
        warrantyValue: partInput.warrantyValue,
        warrantyUnit: partInput.warrantyUnit,
        commissionAmount,
        inStock: partInput.inStock,
        imageOriginalUrl: partInput.imageOriginalUrl,
        status: 'PUBLISHED',
        aiGenerated: false,
        ...(fitments.length > 0 && {
          fitments: {
            create: fitments.map((f) => ({
              brand: f.brand,
              model: f.model ?? null,
              yearFrom: f.yearFrom ?? null,
              yearTo: f.yearTo ?? null,
              engine: f.engine ?? null,
            })),
          },
        }),
      },
      select: {
        id: true,
        vendorId: true,
        name: true,
        category: true,
        condition: true,
        price: true,
        commissionAmount: true,
        status: true,
        inStock: true,
        createdAt: true,
      },
    })

    return { ...part, vendorReused: Boolean(existing) }
  })
}

export async function getLiaisonPart(liaisonId: string, vendorId: string, partId: string) {
  const part = await prisma.catalogItem.findFirst({
    where: {
      id: partId,
      vendorId,
      vendor: { managedByLiaisonId: liaisonId },
    },
    select: {
      id: true,
      vendorId: true,
      name: true,
      category: true,
      oemReference: true,
      vehicleCompatibility: true,
      price: true,
      condition: true,
      warrantyValue: true,
      warrantyUnit: true,
      commissionAmount: true,
      commissionAcceptedAt: true,
      inStock: true,
      status: true,
      imageThumbUrl: true,
      imageOriginalUrl: true,
      createdAt: true,
      fitments: {
        select: {
          id: true,
          brand: true,
          model: true,
          yearFrom: true,
          yearTo: true,
          engine: true,
        },
        orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearFrom: 'asc' }],
      },
    },
  })

  if (!part) {
    throw new AppError('LIAISON_PART_NOT_FOUND', 404, {
      message: 'Pièce introuvable ou non gérée par cette liaison',
    })
  }

  return part
}

export async function updatePartForVendor(
  liaisonId: string,
  vendorId: string,
  partId: string,
  body: unknown,
) {
  const parsed = liaisonUpdatePartSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('LIAISON_PART_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const part = await prisma.catalogItem.findFirst({
    where: {
      id: partId,
      vendorId,
      vendor: { managedByLiaisonId: liaisonId },
    },
    select: { id: true, price: true, commissionAmount: true },
  })

  if (!part) {
    throw new AppError('LIAISON_PART_NOT_FOUND', 404, {
      message: 'Pièce introuvable ou non gérée par cette liaison',
    })
  }

  const updateData: Prisma.CatalogItemUpdateInput = {}
  const d = parsed.data
  if (d.name !== undefined) updateData.name = d.name
  if (d.category !== undefined) updateData.category = d.category
  if (d.oemReference !== undefined) updateData.oemReference = d.oemReference
  if (d.vehicleCompatibility !== undefined) updateData.vehicleCompatibility = d.vehicleCompatibility
  if (d.condition !== undefined) updateData.condition = d.condition
  if (d.warrantyValue !== undefined) updateData.warrantyValue = d.warrantyValue
  if (d.warrantyUnit !== undefined) updateData.warrantyUnit = d.warrantyUnit
  if (d.inStock !== undefined) updateData.inStock = d.inStock
  if (d.price !== undefined) {
    updateData.price = d.price
    updateData.priceUpdatedAt = new Date()
  }

  if (d.commissionAmount !== undefined || d.price !== undefined) {
    const effectivePrice = d.price ?? part.price ?? 0
    const minRequired = minCommissionFor(effectivePrice)
    const proposed = d.commissionAmount ?? part.commissionAmount ?? minRequired
    const finalCommission = Math.max(proposed, minRequired)
    updateData.commissionAmount = finalCommission
    if (finalCommission !== part.commissionAmount) {
      updateData.commissionAcceptedAt = null
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.catalogItem.update({
      where: { id: partId },
      data: updateData,
      select: {
        id: true,
        vendorId: true,
        name: true,
        category: true,
        condition: true,
        price: true,
        commissionAmount: true,
        commissionAcceptedAt: true,
        status: true,
        inStock: true,
      },
    })

    if (d.fitments !== undefined) {
      await tx.catalogItemFitment.deleteMany({ where: { catalogItemId: partId } })
      if (d.fitments.length > 0) {
        await tx.catalogItemFitment.createMany({
          data: d.fitments.map((f) => ({
            catalogItemId: partId,
            brand: f.brand,
            model: f.model ?? null,
            yearFrom: f.yearFrom ?? null,
            yearTo: f.yearTo ?? null,
            engine: f.engine ?? null,
          })),
        })
      }
    }

    return updated
  })
}

export async function acceptCommissionByLiaison(
  liaisonId: string,
  vendorId: string,
  partId: string,
) {
  const part = await prisma.catalogItem.findFirst({
    where: {
      id: partId,
      vendorId,
      vendor: { managedByLiaisonId: liaisonId },
    },
    select: { id: true, commissionAmount: true, commissionAcceptedAt: true },
  })

  if (!part) {
    throw new AppError('LIAISON_PART_NOT_FOUND', 404, {
      message: 'Pièce introuvable ou non gérée par cette liaison',
    })
  }

  if (part.commissionAmount == null) {
    throw new AppError('COMMISSION_NOT_SET', 422, {
      message: 'Aucune commission renseignée sur cette pièce',
    })
  }

  return prisma.catalogItem.update({
    where: { id: partId },
    data: { commissionAcceptedAt: new Date() },
    select: {
      id: true,
      commissionAmount: true,
      commissionAcceptedAt: true,
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
      commissionAmount: true,
      commissionAcceptedAt: true,
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
      commissionAmount: true,
      commissionAcceptedAt: true,
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
  const [vendorTotal, vendorActive, partTotal, partsByStatus, partsPendingAcceptance] =
    await Promise.all([
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
      prisma.catalogItem.count({
        where: { createdByLiaisonId: liaisonId, commissionAcceptedAt: null },
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
      pendingAcceptance: partsPendingAcceptance,
    },
  }
}
