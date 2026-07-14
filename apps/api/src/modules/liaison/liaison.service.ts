import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { uploadToR2 } from '../../lib/r2.js'
import { processVariants } from '../../lib/imageProcessor.js'
import { scanOemLabel } from '../../lib/oemScan.js'
import { subcategoryOf } from 'shared/constants'
import {
  liaisonCreateVendorSchema,
  liaisonUpdateVendorSchema,
  liaisonCreatePartSchema,
  liaisonUpdatePartSchema,
  liaisonQuickPartSchema,
} from 'shared/validators'
import type { CatalogItemStatus, Prisma } from '@prisma/client'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Upload d'une photo de pièce par une liaison. Contrairement au flux vendeur
 * (catalog.service), la liaison n'a pas de fiche Vendor propre : on scope la clé
 * R2 sur son id d'utilisateur. L'original + les 4 variantes WebP sont générés en
 * ligne (~200 ms) puis renvoyés pour être joints au payload de création.
 */
export async function uploadLiaisonPartImage(
  liaisonId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  if (fileBuffer.length > MAX_IMAGE_BYTES) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!ALLOWED_IMAGE_MIME.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const baseKey = `catalog/liaison/${liaisonId}/${timestamp}_${safeName}`

  const variants = await processVariants(fileBuffer)
  const [imageOriginalUrl, imageThumbUrl, imageSmallUrl, imageMediumUrl, imageLargeUrl] =
    await Promise.all([
      uploadToR2(`${baseKey}.${ext}`, fileBuffer, mimeType),
      uploadToR2(`${baseKey}_thumb.webp`, variants.thumb, 'image/webp'),
      uploadToR2(`${baseKey}_small.webp`, variants.small, 'image/webp'),
      uploadToR2(`${baseKey}_medium.webp`, variants.medium, 'image/webp'),
      uploadToR2(`${baseKey}_large.webp`, variants.large, 'image/webp'),
    ])

  return { imageOriginalUrl, imageThumbUrl, imageSmallUrl, imageMediumUrl, imageLargeUrl }
}

/**
 * Scan d'une étiquette / code-barres OEM — wrapper partagé avec le flux
 * vendeur (catalog), voir lib/oemScan.ts.
 */
export async function scanOemLabelForLiaison(
  fileBuffer: Buffer,
  mimeType: string,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
) {
  return scanOemLabel(fileBuffer, mimeType, logger)
}

/**
 * Les listes (browse, catalogue, admin) lisent encore les champs image* de
 * CatalogItem : on les dérive de la première photo pour que les fiches
 * multi-photos restent visibles partout.
 */
type LiaisonPhotoInput = {
  urlOriginal: string
  urlThumb?: string | null
  urlSmall?: string | null
  urlMedium?: string | null
  urlLarge?: string | null
}

function legacyImageFields(photo: LiaisonPhotoInput | undefined) {
  return {
    imageOriginalUrl: photo?.urlOriginal ?? null,
    imageThumbUrl: photo?.urlThumb ?? null,
    imageSmallUrl: photo?.urlSmall ?? null,
    imageMediumUrl: photo?.urlMedium ?? null,
    imageLargeUrl: photo?.urlLarge ?? null,
  }
}

function photoCreateRows(photos: LiaisonPhotoInput[]) {
  return photos.map((p, position) => ({
    position,
    urlOriginal: p.urlOriginal,
    urlThumb: p.urlThumb ?? null,
    urlSmall: p.urlSmall ?? null,
    urlMedium: p.urlMedium ?? null,
    urlLarge: p.urlLarge ?? null,
  }))
}

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

  // Pas de plancher : un vendeur peut publier sans commission (0). On gagne peu
  // sur la livraison mais la donnée annonce a de la valeur.
  const commissionAmount = parsed.data.commissionAmount ?? 0
  const fitments = parsed.data.fitments ?? []
  const photos = parsed.data.photos ?? []

  return prisma.catalogItem.create({
    data: {
      vendorId,
      createdByLiaisonId: liaisonId,
      name: parsed.data.name,
      category: parsed.data.category,
      subcategory: subcategoryOf(parsed.data.category),
      oemReference: parsed.data.oemReference,
      vehicleCompatibility: parsed.data.vehicleCompatibility,
      price: parsed.data.price,
      condition: parsed.data.condition,
      warrantyValue: parsed.data.warrantyValue,
      warrantyUnit: parsed.data.warrantyUnit,
      commissionAmount,
      // Quantité fournie : inStock dérivé (>0), sinon toggle manuel du formulaire.
      stockQuantity: parsed.data.stockQuantity,
      isUniversallyCompatible: parsed.data.isUniversallyCompatible ?? false,
      inStock:
        parsed.data.stockQuantity != null
          ? parsed.data.stockQuantity > 0
          : parsed.data.inStock,
      ...(photos.length > 0
        ? { ...legacyImageFields(photos[0]), photos: { create: photoCreateRows(photos) } }
        : {
            imageOriginalUrl: parsed.data.imageOriginalUrl,
            imageThumbUrl: parsed.data.imageThumbUrl,
            imageSmallUrl: parsed.data.imageSmallUrl,
            imageMediumUrl: parsed.data.imageMediumUrl,
            imageLargeUrl: parsed.data.imageLargeUrl,
          }),
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

  // Pas de plancher : commission facultative, 0 accepté (cf. createPartForVendor).
  const commissionAmount = partInput.commissionAmount ?? 0
  const fitments = partInput.fitments ?? []
  const photos = partInput.photos ?? []

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
        subcategory: subcategoryOf(partInput.category),
        oemReference: partInput.oemReference,
        vehicleCompatibility: partInput.vehicleCompatibility,
        price: partInput.price,
        condition: partInput.condition,
        warrantyValue: partInput.warrantyValue,
        warrantyUnit: partInput.warrantyUnit,
        commissionAmount,
        // Même règle que createPartForVendor : quantité fournie → inStock dérivé.
        stockQuantity: partInput.stockQuantity,
        isUniversallyCompatible: partInput.isUniversallyCompatible ?? false,
        inStock:
          partInput.stockQuantity != null
            ? partInput.stockQuantity > 0
            : partInput.inStock,
        ...(photos.length > 0
          ? { ...legacyImageFields(photos[0]), photos: { create: photoCreateRows(photos) } }
          : {
              imageOriginalUrl: partInput.imageOriginalUrl,
              imageThumbUrl: partInput.imageThumbUrl,
              imageSmallUrl: partInput.imageSmallUrl,
              imageMediumUrl: partInput.imageMediumUrl,
              imageLargeUrl: partInput.imageLargeUrl,
            }),
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
      stockQuantity: true,
      isUniversallyCompatible: true,
      status: true,
      imageThumbUrl: true,
      imageOriginalUrl: true,
      createdAt: true,
      photos: {
        select: {
          id: true,
          position: true,
          urlOriginal: true,
          urlThumb: true,
          urlSmall: true,
          urlMedium: true,
          urlLarge: true,
        },
        orderBy: { position: 'asc' },
      },
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
  if (d.category !== undefined) {
    updateData.category = d.category
    updateData.subcategory = d.category == null ? null : subcategoryOf(d.category)
  }
  if (d.oemReference !== undefined) updateData.oemReference = d.oemReference
  if (d.vehicleCompatibility !== undefined) updateData.vehicleCompatibility = d.vehicleCompatibility
  if (d.condition !== undefined) updateData.condition = d.condition
  if (d.warrantyValue !== undefined) updateData.warrantyValue = d.warrantyValue
  if (d.warrantyUnit !== undefined) updateData.warrantyUnit = d.warrantyUnit
  if (d.inStock !== undefined) updateData.inStock = d.inStock
  if (d.isUniversallyCompatible !== undefined) updateData.isUniversallyCompatible = d.isUniversallyCompatible
  if (d.stockQuantity !== undefined) {
    updateData.stockQuantity = d.stockQuantity
    // Quantité suivie : inStock dérivé. null = retour au toggle manuel.
    if (d.stockQuantity !== null) {
      updateData.inStock = d.stockQuantity > 0
    }
  }
  if (d.imageOriginalUrl !== undefined) updateData.imageOriginalUrl = d.imageOriginalUrl
  if (d.imageThumbUrl !== undefined) updateData.imageThumbUrl = d.imageThumbUrl
  if (d.imageSmallUrl !== undefined) updateData.imageSmallUrl = d.imageSmallUrl
  if (d.imageMediumUrl !== undefined) updateData.imageMediumUrl = d.imageMediumUrl
  if (d.imageLargeUrl !== undefined) updateData.imageLargeUrl = d.imageLargeUrl
  // La liste de photos remplace l'existant ; les champs image* suivent la
  // première photo (ou sont vidés si la liste est vide).
  if (d.photos !== undefined) Object.assign(updateData, legacyImageFields(d.photos[0]))
  if (d.price !== undefined) {
    updateData.price = d.price
    updateData.priceUpdatedAt = new Date()
  }

  // Commission facultative, sans plancher : on enregistre la valeur telle quelle.
  if (d.commissionAmount !== undefined) {
    updateData.commissionAmount = d.commissionAmount
    if (d.commissionAmount !== part.commissionAmount) {
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

    if (d.photos !== undefined) {
      await tx.catalogItemPhoto.deleteMany({ where: { catalogItemId: partId } })
      if (d.photos.length > 0) {
        await tx.catalogItemPhoto.createMany({
          data: photoCreateRows(d.photos).map((p) => ({ ...p, catalogItemId: partId })),
        })
      }
    }

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
