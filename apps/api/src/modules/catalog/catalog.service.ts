import { prisma } from '../../lib/prisma.js'
import { uploadToR2 } from '../../lib/r2.js'
import { MAX_FILE_SIZE } from '../../lib/imageProcessor.js'
import { enqueue } from '../queue/queueService.js'
import { AppError } from '../../lib/appError.js'
import type { CatalogItemStatus } from '@prisma/client'

export async function uploadPartImage(
  userId: string,
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
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
  const imageKey = `catalog/${vendor.id}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}.${ext}`
  const imageOriginalUrl = await uploadToR2(imageKey, fileBuffer, mimeType)

  // Create catalog item in draft status
  const catalogItem = await prisma.catalogItem.create({
    data: {
      vendorId: vendor.id,
      status: 'DRAFT',
      imageOriginalUrl,
    },
  })

  // Enqueue async jobs: image processing + AI identification
  await enqueue('IMAGE_PROCESS_VARIANTS', {
    catalogItemId: catalogItem.id,
    imageKey,
    mimeType,
  })

  await enqueue('CATALOG_AI_IDENTIFY', {
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
  })

  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }

  return item
}

export interface UpdateCatalogItemData {
  name?: string
  category?: string
  oemReference?: string | null
  vehicleCompatibility?: string | null
  price?: number
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

  return prisma.catalogItem.update({
    where: { id: itemId },
    data: updateData,
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
