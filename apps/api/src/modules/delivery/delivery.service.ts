import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

export async function createDelivery(orderId: string, options: {
  pickupAddress?: string
  pickupLat?: number
  pickupLng?: number
  deliveryAddress?: string
  deliveryLat?: number
  deliveryLng?: number
  mode?: 'EXPRESS' | 'STANDARD'
  codAmount?: number
}) {
  const existing = await prisma.delivery.findUnique({ where: { orderId } })
  if (existing) {
    throw new AppError('DELIVERY_ALREADY_EXISTS', 400, { message: 'Livraison déjà créée pour cette commande' })
  }

  return prisma.delivery.create({
    data: {
      orderId,
      mode: options.mode ?? 'STANDARD',
      pickupAddress: options.pickupAddress,
      pickupLat: options.pickupLat,
      pickupLng: options.pickupLng,
      deliveryAddress: options.deliveryAddress,
      deliveryLat: options.deliveryLat,
      deliveryLng: options.deliveryLng,
      codAmount: options.codAmount,
    },
  })
}

export async function assignRider(deliveryId: string, riderId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery) {
    throw new AppError('DELIVERY_NOT_FOUND', 404, { message: 'Livraison introuvable' })
  }
  if (delivery.status !== 'PENDING_ASSIGNMENT') {
    throw new AppError('DELIVERY_ALREADY_ASSIGNED', 400, { message: 'Livraison déjà assignée' })
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { riderId, status: 'ASSIGNED' },
  })
}

export async function startPickup(deliveryId: string, riderId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.riderId !== riderId) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }
  if (delivery.status !== 'ASSIGNED') {
    throw new AppError('DELIVERY_INVALID_STATUS', 400, { message: 'Statut invalide pour le ramassage' })
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: 'PICKUP_IN_PROGRESS' },
  })
}

export async function startTransit(deliveryId: string, riderId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.riderId !== riderId) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }
  if (delivery.status !== 'PICKUP_IN_PROGRESS') {
    throw new AppError('DELIVERY_INVALID_STATUS', 400)
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: 'IN_TRANSIT', pickedUpAt: new Date() },
  })
}

export async function confirmDelivery(deliveryId: string, riderId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.riderId !== riderId) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }
  if (delivery.status !== 'IN_TRANSIT') {
    throw new AppError('DELIVERY_INVALID_STATUS', 400)
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  })
}

export async function markClientAbsent(deliveryId: string, riderId: string) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.riderId !== riderId) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { clientAbsent: true },
  })
}

export async function updateRiderLocation(deliveryId: string, riderId: string, lat: number, lng: number) {
  const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } })
  if (!delivery || delivery.riderId !== riderId) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }

  return prisma.delivery.update({
    where: { id: deliveryId },
    data: { riderLat: lat, riderLng: lng },
  })
}

export async function getDeliveryByOrderId(orderId: string) {
  return prisma.delivery.findUnique({ where: { orderId } })
}

export async function getRiderDeliveries(riderId: string) {
  return prisma.delivery.findMany({
    where: { riderId },
    orderBy: { createdAt: 'desc' },
    include: { order: { include: { items: true } } },
  })
}

export async function getPendingDeliveries() {
  return prisma.delivery.findMany({
    where: { status: 'PENDING_ASSIGNMENT' },
    orderBy: { createdAt: 'asc' },
    include: { order: { include: { items: true } } },
  })
}
