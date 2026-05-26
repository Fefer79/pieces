import { prisma } from '../../lib/prisma.js'
import { uploadToR2 } from '../../lib/r2.js'
import { MAX_FILE_SIZE, processVariants } from '../../lib/imageProcessor.js'
import { enqueue } from '../queue/queueService.js'
import { AppError } from '../../lib/appError.js'
import type { CatalogItemStatus } from '@prisma/client'
import { minCommissionFor, MAX_PHOTOS_PER_ITEM } from 'shared/validators'

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
  warrantyMonths?: number
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
  let serialPhotoKey: string | null = null
  if (extras.serialPhoto) {
    const spExt = extras.serialPhoto.mimeType.split('/')[1] ?? 'jpg'
    serialPhotoKey = `catalog/${vendor.id}/${timestamp}_serial_${extras.serialPhoto.fileName.replace(/[^a-zA-Z0-9._-]/g, '')}.${spExt}`
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
      ...(extras.category && { category: extras.category }),
      ...(extras.vehicleCompatibility && { vehicleCompatibility: extras.vehicleCompatibility }),
      ...(extras.condition && { condition: extras.condition }),
      ...(extras.warrantyMonths !== undefined && { warrantyMonths: extras.warrantyMonths }),
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
    include: { photos: { orderBy: { position: 'asc' } } },
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
  price?: number
  condition?: 'NEW' | 'USED' | 'REFURBISHED'
  warrantyMonths?: number
  commissionAmount?: number
  commissionAccepted?: boolean
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
  if (data.category !== undefined) updateData.category = data.category
  if (data.oemReference !== undefined) updateData.oemReference = data.oemReference
  if (data.vehicleCompatibility !== undefined) updateData.vehicleCompatibility = data.vehicleCompatibility
  if (data.condition !== undefined) updateData.condition = data.condition
  if (data.warrantyMonths !== undefined) updateData.warrantyMonths = data.warrantyMonths

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

  // Commission: validate >= max(1000, 5% × effective price)
  if (data.commissionAmount !== undefined) {
    const effectivePrice = data.price ?? item.price ?? 0
    const minRequired = minCommissionFor(effectivePrice)
    if (data.commissionAmount < minRequired) {
      throw new AppError('COMMISSION_TOO_LOW', 422, {
        message: `Commission minimale pour ce prix : ${minRequired} FCFA`,
      })
    }
    updateData.commissionAmount = data.commissionAmount
  }

  if (data.commissionAccepted === true) {
    updateData.commissionAcceptedAt = new Date()
  }

  return prisma.catalogItem.update({
    where: { id: itemId },
    data: updateData,
    include: { photos: { orderBy: { position: 'asc' } } },
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

  if (item.warrantyMonths === null || item.warrantyMonths === undefined) {
    throw new AppError('CATALOG_WARRANTY_REQUIRED', 422, { message: 'La garantie vendeur est obligatoire pour publier' })
  }

  if (item.commissionAmount === null || item.commissionAmount === undefined) {
    throw new AppError('CATALOG_COMMISSION_REQUIRED', 422, { message: 'Une commission est obligatoire pour publier' })
  }

  if (item.commissionAmount < minCommissionFor(item.price)) {
    throw new AppError('COMMISSION_TOO_LOW', 422, {
      message: `Commission insuffisante (min ${minCommissionFor(item.price)} FCFA)`,
    })
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

export async function toggleStock(userId: string, itemId: string, inStock: boolean) {
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

  return prisma.catalogItem.update({
    where: { id: itemId },
    data: { inStock },
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
