import { prisma } from '../../lib/prisma.js'
import { uploadToR2 } from '../../lib/r2.js'
import { MAX_FILE_SIZE, processVariants } from '../../lib/imageProcessor.js'
import { enqueue } from '../queue/queueService.js'
import { AppError } from '../../lib/appError.js'
import { subcategoryOf } from 'shared/constants'
import type { CatalogItemStatus } from '@prisma/client'
import { MAX_PHOTOS_PER_ITEM, createCatalogItemSchema } from 'shared/validators'

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

async function assertVendorOwnsItem(userId: string, itemId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }
  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, vendorId: vendor.id },
    select: { id: true, vendorId: true, status: true, price: true, commissionAmount: true },
  })
  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }
  return { vendor, item }
}

export interface UploadPartExtras {
  name?: string
  serialNumber?: string
  category?: string
  vehicleCompatibility?: string
  condition?: 'NEW' | 'USED' | 'REFURBISHED'
  warrantyValue?: number
  warrantyUnit?: 'DAY' | 'WEEK' | 'MONTH'
  serialPhoto?: { buffer: Buffer; fileName: string; mimeType: string }
}

export async function uploadPartImage(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  extras: UploadPartExtras = {},
) {
  // Validate vendor exists and is active
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, status: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  if (vendor.status !== 'ACTIVE') {
    throw new AppError('VENDOR_NOT_ACTIVE', 403, { message: 'Votre profil vendeur doit être actif pour ajouter des pièces' })
  }

  // Validate file size
  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }

  // Validate mime type
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedMimeTypes.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  // Upload raw image to R2
  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const imageKey = `catalog/${vendor.id}/${timestamp}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}.${ext}`
  const imageOriginalUrl = await uploadToR2(imageKey, fileBuffer, mimeType)

  // Upload serial/QR photo to R2 if provided
  let serialPhotoUrl: string | null = null
  if (extras.serialPhoto) {
    const spExt = extras.serialPhoto.mimeType.split('/')[1] ?? 'jpg'
    const serialPhotoKey = `catalog/${vendor.id}/${timestamp}_serial_${extras.serialPhoto.fileName.replace(/[^a-zA-Z0-9._-]/g, '')}.${spExt}`
    serialPhotoUrl = await uploadToR2(serialPhotoKey, extras.serialPhoto.buffer, extras.serialPhoto.mimeType)
  }

  // Create catalog item in draft status + the position-0 photo row.
  const catalogItem = await prisma.catalogItem.create({
    data: {
      vendorId: vendor.id,
      status: 'DRAFT',
      imageOriginalUrl,
      ...(extras.name && { name: extras.name }),
      ...(extras.serialNumber && { oemReference: extras.serialNumber }),
      ...(extras.category && { category: extras.category, subcategory: subcategoryOf(extras.category) }),
      ...(extras.vehicleCompatibility && { vehicleCompatibility: extras.vehicleCompatibility }),
      ...(extras.condition && { condition: extras.condition }),
      ...(extras.warrantyValue !== undefined && { warrantyValue: extras.warrantyValue }),
      ...(extras.warrantyUnit !== undefined && { warrantyUnit: extras.warrantyUnit }),
      ...(serialPhotoUrl && { serialPhotoUrl }),
      photos: {
        create: {
          position: 0,
          urlOriginal: imageOriginalUrl,
        },
      },
    },
  })

  // Enqueue async image processing (variants only).
  // AI identification is reserved for the buyer-side photo search flow —
  // sellers know their vehicle and fill compatibility manually.
  await enqueue('IMAGE_PROCESS_VARIANTS', {
    catalogItemId: catalogItem.id,
    imageKey,
    mimeType,
  })

  return catalogItem
}

/**
 * Upload d'une photo de pièce hors fiche (avant création manuelle) : l'original
 * + les 4 variantes WebP sont générés en ligne (~200 ms) puis renvoyés pour
 * être joints au payload de POST /items — même processus que le flux liaison.
 */
export async function uploadStandalonePartImage(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, status: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }
  if (vendor.status !== 'ACTIVE') {
    throw new AppError('VENDOR_NOT_ACTIVE', 403, { message: 'Votre profil vendeur doit être actif pour ajouter des pièces' })
  }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const baseKey = `catalog/${vendor.id}/${timestamp}_${safeName}`

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
 * Les listes (browse, catalogue, admin) lisent encore les champs image* de
 * CatalogItem : on les dérive de la première photo pour que les fiches
 * multi-photos restent visibles partout.
 */
type PartPhotoInput = {
  urlOriginal: string
  urlThumb?: string | null
  urlSmall?: string | null
  urlMedium?: string | null
  urlLarge?: string | null
}

function legacyImageFields(photo: PartPhotoInput | undefined) {
  return {
    imageOriginalUrl: photo?.urlOriginal ?? null,
    imageThumbUrl: photo?.urlThumb ?? null,
    imageSmallUrl: photo?.urlSmall ?? null,
    imageMediumUrl: photo?.urlMedium ?? null,
    imageLargeUrl: photo?.urlLarge ?? null,
  }
}

function photoCreateRows(photos: PartPhotoInput[]) {
  return photos.map((p, position) => ({
    position,
    urlOriginal: p.urlOriginal,
    urlThumb: p.urlThumb ?? null,
    urlSmall: p.urlSmall ?? null,
    urlMedium: p.urlMedium ?? null,
    urlLarge: p.urlLarge ?? null,
  }))
}

/**
 * Création manuelle d'une annonce par le vendeur, publiée immédiatement —
 * même processus que la saisie liaison (createPartForVendor), sans les
 * attributs liaison : pas de createdByLiaisonId, et la commission fixée par
 * le vendeur lui-même vaut acceptation (commissionAcceptedAt immédiat).
 */
export async function createItem(userId: string, body: unknown) {
  const parsed = createCatalogItemSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('CATALOG_ITEM_INVALID', 422, {
      message: parsed.error.issues[0]?.message ?? 'Données invalides',
    })
  }

  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true, status: true },
  })
  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }
  if (vendor.status !== 'ACTIVE') {
    throw new AppError('VENDOR_NOT_ACTIVE', 403, { message: 'Votre profil vendeur doit être actif pour ajouter des pièces' })
  }

  // Pas de plancher : un vendeur peut publier sans commission (0). On gagne peu
  // sur la livraison mais la donnée annonce a de la valeur.
  const commissionAmount = parsed.data.commissionAmount ?? 0
  const fitments = parsed.data.fitments ?? []
  const photos = parsed.data.photos ?? []

  return prisma.catalogItem.create({
    data: {
      vendorId: vendor.id,
      name: parsed.data.name,
      category: parsed.data.category,
      subcategory: subcategoryOf(parsed.data.category),
      oemReference: parsed.data.oemReference,
      vehicleCompatibility: parsed.data.vehicleCompatibility,
      price: parsed.data.price,
      condition: parsed.data.condition,
      partSource: parsed.data.partSource,
      warrantyValue: parsed.data.warrantyValue,
      warrantyUnit: parsed.data.warrantyUnit,
      commissionAmount,
      commissionAcceptedAt: new Date(),
      lowStockThreshold: parsed.data.lowStockThreshold,
      // Quantité fournie : inStock dérivé (>0), sinon toggle manuel du formulaire.
      stockQuantity: parsed.data.stockQuantity,
      isUniversallyCompatible: parsed.data.isUniversallyCompatible ?? false,
      inStock:
        parsed.data.stockQuantity != null
          ? parsed.data.stockQuantity > 0
          : parsed.data.inStock,
      ...(photos.length > 0 && {
        ...legacyImageFields(photos[0]),
        photos: { create: photoCreateRows(photos) },
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

export interface CatalogFilters {
  status?: CatalogItemStatus
  page?: number
  limit?: number
}

export async function getMyItems(userId: string, filters: CatalogFilters = {}) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  const where = {
    vendorId: vendor.id,
    ...(filters.status ? { status: filters.status } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.catalogItem.count({ where }),
  ])

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function getItem(userId: string, itemId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const item = await prisma.catalogItem.findFirst({
    where: {
      id: itemId,
      vendorId: vendor.id,
    },
    include: {
      photos: { orderBy: { position: 'asc' } },
      fitments: { orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearFrom: 'asc' }] },
    },
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  const imageJob = await prisma.job.findFirst({
    where: {
      type: 'IMAGE_PROCESS_VARIANTS',
      payload: { path: ['catalogItemId'], equals: itemId },
    },
    orderBy: { createdAt: 'desc' },
    select: { status: true, error: true },
  })

  return {
    ...item,
    imageJobStatus: imageJob?.status ?? null,
    imageJobError: imageJob?.error ?? null,
  }
}

export async function retryImageJob(userId: string, itemId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, vendorId: vendor.id },
    select: { id: true },
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  const updated = await prisma.job.updateMany({
    where: {
      status: 'FAILED',
      type: 'IMAGE_PROCESS_VARIANTS',
      payload: { path: ['catalogItemId'], equals: itemId },
    },
    data: { status: 'PENDING', attempts: 0, error: null },
  })

  if (updated.count === 0) {
    throw new AppError('NO_FAILED_JOB', 409, { message: 'Aucun traitement en échec à relancer' })
  }

  return { requeued: updated.count }
}

export interface UpdateCatalogItemData {
  name?: string
  category?: string
  oemReference?: string | null
  vehicleCompatibility?: string | null
  photos?: PartPhotoInput[]
  fitments?: FitmentInput[]
  price?: number
  condition?: 'NEW' | 'USED' | 'REFURBISHED'
  partSource?: 'OEM' | 'AFTERMARKET' | 'COMPATIBLE' | null
  warrantyValue?: number
  warrantyUnit?: 'DAY' | 'WEEK' | 'MONTH'
  commissionAmount?: number
  commissionAccepted?: boolean
  isUniversallyCompatible?: boolean
  inStock?: boolean
  stockQuantity?: number | null
  lowStockThreshold?: number
}

export async function updateItem(
  userId: string,
  itemId: string,
  data: UpdateCatalogItemData,
  logger?: { warn: (obj: Record<string, unknown>, msg: string) => void },
) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, vendorId: vendor.id },
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  const updateData: Record<string, unknown> = {}

  if (data.name !== undefined) updateData.name = data.name
  if (data.category !== undefined) {
    updateData.category = data.category
    updateData.subcategory = subcategoryOf(data.category)
  }
  if (data.oemReference !== undefined) updateData.oemReference = data.oemReference
  if (data.vehicleCompatibility !== undefined) updateData.vehicleCompatibility = data.vehicleCompatibility
  if (data.condition !== undefined) updateData.condition = data.condition
  if (data.partSource !== undefined) updateData.partSource = data.partSource
  if (data.warrantyValue !== undefined) updateData.warrantyValue = data.warrantyValue
  if (data.warrantyUnit !== undefined) updateData.warrantyUnit = data.warrantyUnit
  if (data.lowStockThreshold !== undefined) updateData.lowStockThreshold = data.lowStockThreshold
  if (data.inStock !== undefined) updateData.inStock = data.inStock
  if (data.isUniversallyCompatible !== undefined) updateData.isUniversallyCompatible = data.isUniversallyCompatible
  // La liste de photos remplace l'existant ; les champs image* hérités suivent
  // la première photo (ou sont vidés si la liste est vide).
  if (data.photos !== undefined) Object.assign(updateData, legacyImageFields(data.photos[0]))

  if (data.stockQuantity !== undefined) {
    updateData.stockQuantity = data.stockQuantity
    // Quantité suivie → inStock dérivé. Quantité remise à null → inStock reste manuel.
    if (data.stockQuantity !== null) {
      updateData.inStock = data.stockQuantity > 0
    }
  }

  if (data.price !== undefined) {
    updateData.price = data.price
    updateData.priceUpdatedAt = new Date()

    // Bait-and-switch detection: >50% variation within 1 hour on published items
    if (item.status === 'PUBLISHED' && item.price !== null && item.price > 0) {
      const variation = Math.abs(data.price - item.price) / item.price
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
      if (variation > 0.5 && item.priceUpdatedAt && item.priceUpdatedAt > hourAgo) {
        updateData.priceAlertFlag = true
        logger?.warn(
          { event: 'PRICE_ALERT_BAIT_SWITCH', itemId, oldPrice: item.price, newPrice: data.price, variation: Math.round(variation * 100) },
          `Price variation ${Math.round(variation * 100)}% detected in <1h`,
        )
      }
    }
  }

  // Pas de plancher : la commission est enregistrée telle que fixée (0 accepté).
  // Contrairement au flux liaison (acceptation différée par le vendeur), c'est
  // le vendeur lui-même qui fixe sa commission : acceptation immédiate.
  if (data.commissionAmount !== undefined) {
    updateData.commissionAmount = data.commissionAmount
    updateData.commissionAcceptedAt = new Date()
  }

  if (data.commissionAccepted === true) {
    updateData.commissionAcceptedAt = new Date()
  }

  const itemInclude = {
    photos: { orderBy: { position: 'asc' as const } },
    fitments: { orderBy: [{ brand: 'asc' as const }, { model: 'asc' as const }, { yearFrom: 'asc' as const }] },
  }

  // Pas de relation à remplacer : simple update.
  if (data.photos === undefined && data.fitments === undefined) {
    return prisma.catalogItem.update({
      where: { id: itemId },
      data: updateData,
      include: itemInclude,
    })
  }

  // photos / fitments : la liste envoyée remplace l'existant (même sémantique
  // que le PATCH liaison).
  return prisma.$transaction(async (tx) => {
    await tx.catalogItem.update({ where: { id: itemId }, data: updateData })

    if (data.photos !== undefined) {
      await tx.catalogItemPhoto.deleteMany({ where: { catalogItemId: itemId } })
      if (data.photos.length > 0) {
        await tx.catalogItemPhoto.createMany({
          data: photoCreateRows(data.photos).map((p) => ({ ...p, catalogItemId: itemId })),
        })
      }
    }

    if (data.fitments !== undefined) {
      await tx.catalogItemFitment.deleteMany({ where: { catalogItemId: itemId } })
      if (data.fitments.length > 0) {
        await tx.catalogItemFitment.createMany({
          data: data.fitments.map((f) => ({
            catalogItemId: itemId,
            brand: f.brand,
            model: f.model ?? null,
            yearFrom: f.yearFrom ?? null,
            yearTo: f.yearTo ?? null,
            engine: f.engine ?? null,
          })),
        })
      }
    }

    return tx.catalogItem.findUniqueOrThrow({
      where: { id: itemId },
      include: itemInclude,
    })
  })
}

export async function publishItem(userId: string, itemId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, vendorId: vendor.id },
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  if (item.status !== 'DRAFT') {
    throw new AppError('CATALOG_ITEM_NOT_DRAFT', 422, { message: 'Seules les fiches en brouillon peuvent être publiées' })
  }

  if (item.price === null || item.price === undefined) {
    throw new AppError('CATALOG_PRICE_REQUIRED', 422, { message: 'Un prix est obligatoire pour publier la fiche' })
  }

  if (!item.condition) {
    throw new AppError('CATALOG_CONDITION_REQUIRED', 422, { message: 'L\'état de la pièce (Neuf / Occasion / Reconditionné) est obligatoire pour publier' })
  }

  if (item.warrantyValue === null || item.warrantyValue === undefined) {
    throw new AppError('CATALOG_WARRANTY_REQUIRED', 422, { message: 'La garantie vendeur est obligatoire pour publier' })
  }

  if (item.commissionAmount === null || item.commissionAmount === undefined) {
    throw new AppError('CATALOG_COMMISSION_REQUIRED', 422, { message: 'Une commission est obligatoire pour publier' })
  }

  if (!item.commissionAcceptedAt) {
    throw new AppError('CATALOG_COMMISSION_NOT_ACCEPTED', 422, {
      message: 'Vous devez accepter explicitement la commission pour publier',
    })
  }

  return prisma.catalogItem.update({
    where: { id: itemId },
    data: { status: 'PUBLISHED' },
  })
}

export async function toggleStock(
  userId: string,
  itemId: string,
  inStock: boolean,
  stockQuantity?: number,
) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!vendor) {
    throw new AppError('VENDOR_NOT_FOUND', 404, { message: 'Profil vendeur introuvable' })
  }

  const item = await prisma.catalogItem.findFirst({
    where: { id: itemId, vendorId: vendor.id },
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  if (item.status !== 'PUBLISHED') {
    throw new AppError('CATALOG_ITEM_NOT_PUBLISHED', 422, { message: 'Le stock ne peut être modifié que sur les fiches publiées' })
  }

  const data: Record<string, unknown> = { inStock }
  if (stockQuantity !== undefined) {
    data.stockQuantity = stockQuantity
    data.inStock = stockQuantity > 0
  } else if (inStock && item.stockQuantity === 0) {
    // Remise en stock d'une fiche à quantité suivie tombée à 0 sans quantité
    // fournie : repartir à 1 pour garder inStock cohérent avec la quantité.
    data.stockQuantity = 1
  }

  return prisma.catalogItem.update({
    where: { id: itemId },
    data,
  })
}

export async function addPhoto(
  userId: string,
  itemId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const { vendor } = await assertVendorOwnsItem(userId, itemId)
  return addPhotoToItem(vendor.id, itemId, fileBuffer, fileName, mimeType)
}

/**
 * Ownership-free photo upload core. Callers must authorize first.
 * `vendorIdForKey` only scopes the R2 object key — it is not a permission check.
 */
export async function addPhotoToItem(
  vendorIdForKey: string,
  itemId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
) {
  const vendor = { id: vendorIdForKey }

  if (fileBuffer.length > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  const existing = await prisma.catalogItemPhoto.findMany({
    where: { catalogItemId: itemId },
    orderBy: { position: 'asc' },
    select: { position: true },
  })

  if (existing.length >= MAX_PHOTOS_PER_ITEM) {
    throw new AppError('TOO_MANY_PHOTOS', 422, {
      message: `Maximum ${MAX_PHOTOS_PER_ITEM} photos par pièce`,
    })
  }

  const nextPosition = existing.length

  const ext = mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const baseKey = `catalog/${vendor.id}/${itemId}/photo_${nextPosition}_${timestamp}_${safeName}`
  const originalKey = `${baseKey}.${ext}`

  const urlOriginal = await uploadToR2(originalKey, fileBuffer, mimeType)

  // Generate variants inline (fast: ~200ms for 4 sizes on typical phone photos)
  const variants = await processVariants(fileBuffer)
  const [urlThumb, urlSmall, urlMedium, urlLarge] = await Promise.all([
    uploadToR2(`${baseKey}_thumb.webp`, variants.thumb, 'image/webp'),
    uploadToR2(`${baseKey}_small.webp`, variants.small, 'image/webp'),
    uploadToR2(`${baseKey}_medium.webp`, variants.medium, 'image/webp'),
    uploadToR2(`${baseKey}_large.webp`, variants.large, 'image/webp'),
  ])

  return prisma.catalogItemPhoto.create({
    data: {
      catalogItemId: itemId,
      position: nextPosition,
      urlOriginal,
      urlThumb,
      urlSmall,
      urlMedium,
      urlLarge,
    },
  })
}

export async function removePhoto(userId: string, itemId: string, photoId: string) {
  await assertVendorOwnsItem(userId, itemId)
  return removePhotoFromItem(itemId, photoId)
}

/** Ownership-free photo removal core. Callers must authorize first. */
export async function removePhotoFromItem(itemId: string, photoId: string) {
  const photo = await prisma.catalogItemPhoto.findUnique({
    where: { id: photoId },
    select: { id: true, catalogItemId: true, position: true },
  })

  if (!photo || photo.catalogItemId !== itemId) {
    throw new AppError('PHOTO_NOT_FOUND', 404, { message: 'Photo introuvable' })
  }

  // Delete + reposition remaining photos to keep positions 0..n-1 contiguous.
  await prisma.$transaction(async (tx) => {
    await tx.catalogItemPhoto.delete({ where: { id: photoId } })
    const remaining = await tx.catalogItemPhoto.findMany({
      where: { catalogItemId: itemId },
      orderBy: { position: 'asc' },
      select: { id: true },
    })
    for (let i = 0; i < remaining.length; i++) {
      const row = remaining[i]
      if (!row) continue
      await tx.catalogItemPhoto.update({
        where: { id: row.id },
        data: { position: i },
      })
    }
  })

  return { deleted: true }
}

export async function reorderPhotos(userId: string, itemId: string, photoIds: string[]) {
  await assertVendorOwnsItem(userId, itemId)
  return reorderItemPhotos(itemId, photoIds)
}

/** Ownership-free photo reorder core. Callers must authorize first. */
export async function reorderItemPhotos(itemId: string, photoIds: string[]) {
  const existing = await prisma.catalogItemPhoto.findMany({
    where: { catalogItemId: itemId },
    select: { id: true },
  })

  const existingIds = new Set(existing.map((p) => p.id))
  if (photoIds.length !== existing.length || !photoIds.every((id) => existingIds.has(id))) {
    throw new AppError('REORDER_INVALID', 422, {
      message: 'La liste des photos ne correspond pas aux photos de cette pièce',
    })
  }

  // Two-pass to avoid unique-constraint conflicts on (catalogItemId, position).
  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < photoIds.length; i++) {
      const pid = photoIds[i]
      if (!pid) continue
      await tx.catalogItemPhoto.update({
        where: { id: pid },
        data: { position: 1000 + i },
      })
    }
    for (let i = 0; i < photoIds.length; i++) {
      const pid = photoIds[i]
      if (!pid) continue
      await tx.catalogItemPhoto.update({
        where: { id: pid },
        data: { position: i },
      })
    }
  })

  return prisma.catalogItemPhoto.findMany({
    where: { catalogItemId: itemId },
    orderBy: { position: 'asc' },
  })
}

export async function listPhotos(userId: string, itemId: string) {
  await assertVendorOwnsItem(userId, itemId)
  return prisma.catalogItemPhoto.findMany({
    where: { catalogItemId: itemId },
    orderBy: { position: 'asc' },
  })
}

export interface FitmentInput {
  brand: string
  model?: string | null
  yearFrom?: number | null
  yearTo?: number | null
  engine?: string | null
}

export async function listFitments(itemId: string) {
  return prisma.catalogItemFitment.findMany({
    where: { catalogItemId: itemId },
    orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearFrom: 'asc' }],
  })
}

export async function replaceFitments(userId: string, itemId: string, fitments: FitmentInput[]) {
  await assertVendorOwnsItem(userId, itemId)
  return prisma.$transaction(async (tx) => {
    await tx.catalogItemFitment.deleteMany({ where: { catalogItemId: itemId } })
    if (fitments.length > 0) {
      await tx.catalogItemFitment.createMany({
        data: fitments.map((f) => ({
          catalogItemId: itemId,
          brand: f.brand,
          model: f.model ?? null,
          yearFrom: f.yearFrom ?? null,
          yearTo: f.yearTo ?? null,
          engine: f.engine ?? null,
        })),
      })
    }
    return tx.catalogItemFitment.findMany({
      where: { catalogItemId: itemId },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { yearFrom: 'asc' }],
    })
  })
}

export async function addFitment(userId: string, itemId: string, fitment: FitmentInput) {
  await assertVendorOwnsItem(userId, itemId)
  return prisma.catalogItemFitment.create({
    data: {
      catalogItemId: itemId,
      brand: fitment.brand,
      model: fitment.model ?? null,
      yearFrom: fitment.yearFrom ?? null,
      yearTo: fitment.yearTo ?? null,
      engine: fitment.engine ?? null,
    },
  })
}

export async function deleteFitment(userId: string, itemId: string, fitmentId: string) {
  await assertVendorOwnsItem(userId, itemId)
  const fitment = await prisma.catalogItemFitment.findUnique({
    where: { id: fitmentId },
    select: { id: true, catalogItemId: true },
  })
  if (!fitment || fitment.catalogItemId !== itemId) {
    throw new AppError('FITMENT_NOT_FOUND', 404, { message: 'Compatibilité introuvable' })
  }
  await prisma.catalogItemFitment.delete({ where: { id: fitmentId } })
  return { deleted: true }
}
