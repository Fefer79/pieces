import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { assertMember } from './enterprise.service.js'
import { uploadToR2 } from '../../lib/r2.js'
import { processVariants, MAX_FILE_SIZE } from '../../lib/imageProcessor.js'
import { createOrder } from '../order/order.service.js'
import type {
  PartRequestStatus,
  PartRequestUrgency,
  PartRequestSource,
  EnterpriseMemberRole,
} from '@prisma/client'

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_PHOTOS_PER_REQUEST = 3

// Le mécanicien diagnostique et demande la pièce ; owner et manager peuvent
// aussi saisir une demande. Seuls OWNER / MANAGER approuvent, refusent et
// convertissent en commande — le chauffeur n'a aucun accès en écriture.
const REQUESTER_ROLES: EnterpriseMemberRole[] = ['MECHANIC', 'OWNER', 'MANAGER']
const APPROVER_ROLES: EnterpriseMemberRole[] = ['OWNER', 'MANAGER']

export interface PartRequestInput {
  vehicleId: string
  description?: string
  partName: string
  category?: string
  oemReference?: string
  urgency: PartRequestUrgency
  preferredSource: PartRequestSource
  maxBudget?: number
}

export interface PartRequestPhotoInput {
  buffer: Buffer
  fileName: string
  mimeType: string
  position?: number
}

export interface ConvertInput {
  source: PartRequestSource
  catalogItemId: string
  deliveryCommune?: string
}

const SELECT = {
  id: true,
  enterpriseId: true,
  vehicleId: true,
  driverId: true,
  createdByUserId: true,
  status: true,
  description: true,
  partName: true,
  category: true,
  oemReference: true,
  urgency: true,
  preferredSource: true,
  maxBudget: true,
  approvedByUserId: true,
  approvedAt: true,
  rejectionReason: true,
  orderId: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: {
      id: true,
      brand: true,
      model: true,
      year: true,
      plate: true,
      vin: true,
      engine: true,
      mileage: true,
    },
  },
  driver: {
    select: { id: true, name: true, phone: true },
  },
  createdByUser: {
    select: { id: true, name: true, phone: true },
  },
  approvedByUser: {
    select: { id: true, name: true, phone: true },
  },
  order: {
    select: { id: true, status: true, totalAmount: true, shareToken: true },
  },
  photos: {
    select: { id: true, url: true, position: true, createdAt: true },
    orderBy: { position: 'asc' },
  },
  events: {
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      actorUserId: true,
      note: true,
      createdAt: true,
      actorUser: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  },
} as const

async function assertVehicleInEnterprise(vehicleId: string, enterpriseId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, enterpriseId },
    select: { id: true },
  })
  if (!vehicle) {
    throw new AppError('VEHICLE_FORBIDDEN', 403, { message: 'Véhicule non rattaché à cette entreprise' })
  }
}

async function getPartRequest(id: string, enterpriseId: string) {
  const request = await prisma.partRequest.findFirst({
    where: { id, enterpriseId },
    select: SELECT,
  })
  if (!request) throw new AppError('PART_REQUEST_NOT_FOUND', 404)
  return request
}

async function logEvent(
  partRequestId: string,
  toStatus: PartRequestStatus,
  actorUserId: string,
  fromStatus?: PartRequestStatus | null,
  note?: string,
) {
  await prisma.partRequestEvent.create({
    data: {
      partRequestId,
      fromStatus: fromStatus ?? null,
      toStatus,
      actorUserId,
      note: note ?? null,
    },
  })
}

export async function createPartRequest(
  enterpriseId: string,
  userId: string,
  data: PartRequestInput,
) {
  await assertMember(enterpriseId, userId, REQUESTER_ROLES)
  await assertVehicleInEnterprise(data.vehicleId, enterpriseId)

  const request = await prisma.partRequest.create({
    data: {
      enterpriseId,
      vehicleId: data.vehicleId,
      createdByUserId: userId,
      status: 'DRAFT',
      description: data.description ?? null,
      partName: data.partName,
      category: data.category ?? null,
      oemReference: data.oemReference ?? null,
      urgency: data.urgency,
      preferredSource: data.preferredSource,
      maxBudget: data.maxBudget ?? null,
    },
    select: SELECT,
  })

  await logEvent(request.id, 'DRAFT', userId, null, 'Demande créée')
  return request
}

export async function listPartRequestsForEnterprise(
  enterpriseId: string,
  userId: string,
  filters: {
    status?: PartRequestStatus
    urgency?: PartRequestUrgency
    vehicleId?: string
  } = {},
) {
  await assertMember(enterpriseId, userId)
  return prisma.partRequest.findMany({
    where: {
      enterpriseId,
      ...(filters.status && { status: filters.status }),
      ...(filters.urgency && { urgency: filters.urgency }),
      ...(filters.vehicleId && { vehicleId: filters.vehicleId }),
    },
    select: SELECT,
    orderBy: [{ urgency: 'desc' }, { createdAt: 'desc' }],
  })
}

export async function getPartRequestById(enterpriseId: string, userId: string, id: string) {
  await assertMember(enterpriseId, userId)
  return getPartRequest(id, enterpriseId)
}

export async function updatePartRequest(
  enterpriseId: string,
  userId: string,
  id: string,
  data: Partial<PartRequestInput>,
) {
  await assertMember(enterpriseId, userId, REQUESTER_ROLES)
  const existing = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: 'DRAFT' },
    select: { id: true, status: true },
  })
  if (!existing) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const updated = await prisma.partRequest.update({
    where: { id },
    data: {
      ...(data.description !== undefined && { description: data.description ?? null }),
      ...(data.partName !== undefined && { partName: data.partName }),
      ...(data.category !== undefined && { category: data.category ?? null }),
      ...(data.oemReference !== undefined && { oemReference: data.oemReference ?? null }),
      ...(data.urgency !== undefined && { urgency: data.urgency }),
      ...(data.preferredSource !== undefined && { preferredSource: data.preferredSource }),
      ...(data.maxBudget !== undefined && { maxBudget: data.maxBudget ?? null }),
    },
    select: SELECT,
  })

  await logEvent(updated.id, 'DRAFT', userId, null, 'Demande mise à jour')
  return updated
}

export async function submitPartRequest(enterpriseId: string, userId: string, id: string) {
  await assertMember(enterpriseId, userId, REQUESTER_ROLES)
  const existing = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: 'DRAFT' },
    select: { id: true, status: true },
  })
  if (!existing) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const updated = await prisma.partRequest.update({
    where: { id },
    data: { status: 'SUBMITTED' },
    select: SELECT,
  })

  await logEvent(updated.id, 'SUBMITTED', userId, 'DRAFT', 'Demande soumise au manager')
  return updated
}

export async function approvePartRequest(
  enterpriseId: string,
  userId: string,
  id: string,
  note?: string,
) {
  await assertMember(enterpriseId, userId, APPROVER_ROLES)
  const existing = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: { in: ['SUBMITTED', 'REVIEWING'] } },
    select: { id: true, status: true },
  })
  if (!existing) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const updated = await prisma.partRequest.update({
    where: { id },
    data: { status: 'APPROVED', approvedByUserId: userId, approvedAt: new Date() },
    select: SELECT,
  })

  await logEvent(updated.id, 'APPROVED', userId, existing.status, note ?? 'Demande approuvée')
  return updated
}

export async function rejectPartRequest(
  enterpriseId: string,
  userId: string,
  id: string,
  reason: string,
) {
  await assertMember(enterpriseId, userId, APPROVER_ROLES)
  const existing = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: { in: ['SUBMITTED', 'REVIEWING', 'APPROVED'] } },
    select: { id: true, status: true },
  })
  if (!existing) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const updated = await prisma.partRequest.update({
    where: { id },
    data: { status: 'REJECTED', rejectionReason: reason },
    select: SELECT,
  })

  await logEvent(updated.id, 'REJECTED', userId, existing.status, reason)
  return updated
}

export async function cancelPartRequest(enterpriseId: string, userId: string, id: string) {
  await assertMember(enterpriseId, userId, REQUESTER_ROLES)
  const existing = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: { in: ['DRAFT', 'SUBMITTED', 'REVIEWING'] } },
    select: { id: true, status: true },
  })
  if (!existing) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const updated = await prisma.partRequest.update({
    where: { id },
    data: { status: 'CANCELLED' },
    select: SELECT,
  })

  await logEvent(updated.id, 'CANCELLED', userId, existing.status, 'Demande annulée')
  return updated
}

export async function convertToOrder(
  enterpriseId: string,
  userId: string,
  id: string,
  input: ConvertInput,
) {
  await assertMember(enterpriseId, userId, APPROVER_ROLES)
  const request = await prisma.partRequest.findFirst({
    where: { id, enterpriseId, status: 'APPROVED' },
    select: { id: true, status: true, vehicleId: true, enterpriseId: true },
  })
  if (!request) throw new AppError('PART_REQUEST_NOT_FOUND', 404)

  const catalogItem = await prisma.catalogItem.findUnique({
    where: { id: input.catalogItemId },
    select: { id: true, vendorId: true, status: true, inStock: true },
  })
  if (!catalogItem) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Pièce catalogue introuvable' })
  }
  if (catalogItem.status !== 'PUBLISHED' || !catalogItem.inStock) {
    throw new AppError('CATALOG_ITEM_UNAVAILABLE', 422, { message: 'Cette pièce n\'est pas disponible à la vente' })
  }

  // Mapping du sourcing choisi sur les modes de livraison existants.
  const deliveryMode = input.source === 'AIR' ? 'EXPRESS' : 'STANDARD'

  const order = await createOrder(userId, [{ catalogItemId: input.catalogItemId, quantity: 1 }], {
    vehicleId: request.vehicleId,
    deliveryMode,
    deliveryCommune: input.deliveryCommune,
  })

  const updated = await prisma.partRequest.update({
    where: { id: request.id },
    data: { status: 'CONVERTED', orderId: order.id },
    select: SELECT,
  })

  await logEvent(updated.id, 'CONVERTED', userId, 'APPROVED', `Converti en commande ${order.id}`)
  return { request: updated, order }
}

export async function addPartRequestPhoto(
  enterpriseId: string,
  userId: string,
  id: string,
  input: PartRequestPhotoInput,
) {
  await assertMember(enterpriseId, userId, REQUESTER_ROLES)
  const request = await prisma.partRequest.findFirst({
    where: { id, enterpriseId },
    select: { id: true, status: true, photos: { select: { id: true } } },
  })
  if (!request) throw new AppError('PART_REQUEST_NOT_FOUND', 404)
  if (request.photos.length >= MAX_PHOTOS_PER_REQUEST) {
    throw new AppError('PART_REQUEST_MAX_PHOTOS', 422, { message: `Maximum ${MAX_PHOTOS_PER_REQUEST} photos par demande` })
  }

  if (input.buffer.length > MAX_FILE_SIZE) {
    throw new AppError('FILE_TOO_LARGE', 422, { message: 'Image trop volumineuse (max 5 MB)' })
  }
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(input.mimeType)) {
    throw new AppError('INVALID_FILE_TYPE', 422, { message: 'Format accepté : JPEG, PNG ou WebP' })
  }

  const ext = input.mimeType.split('/')[1] ?? 'jpg'
  const timestamp = Date.now()
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '')
  const baseKey = `part-requests/${enterpriseId}/${id}/${timestamp}_${safeName}`

  const variants = await processVariants(input.buffer)
  const [originalUrl, thumbUrl] = await Promise.all([
    uploadToR2(`${baseKey}.${ext}`, input.buffer, input.mimeType),
    uploadToR2(`${baseKey}_thumb.webp`, variants.thumb, 'image/webp'),
  ])

  const photo = await prisma.partRequestPhoto.create({
    data: {
      partRequestId: id,
      url: originalUrl,
      thumbUrl,
      position: input.position ?? request.photos.length,
    },
  })

  return photo
}
