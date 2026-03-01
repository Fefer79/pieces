import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

// H5 fix: Verify reviewer is the order initiator (buyer)
export async function createSellerReview(reviewerId: string, data: {
  orderId: string
  vendorId: string
  rating: number
  comment?: string
}) {
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('REVIEW_INVALID_RATING', 400, { message: 'La note doit être entre 1 et 5' })
  }

  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { initiatorId: true, status: true },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }

  if (order.initiatorId !== reviewerId) {
    throw new AppError('REVIEW_NOT_ORDER_BUYER', 403, { message: 'Seul l\'acheteur peut évaluer' })
  }

  if (order.status !== 'COMPLETED' && order.status !== 'CONFIRMED' && order.status !== 'DELIVERED') {
    throw new AppError('REVIEW_ORDER_NOT_COMPLETED', 400, { message: 'La commande doit être livrée pour évaluer' })
  }

  return prisma.sellerReview.create({
    data: {
      orderId: data.orderId,
      vendorId: data.vendorId,
      reviewerId,
      rating: data.rating,
      comment: data.comment,
    },
  })
}

export async function createDeliveryReview(reviewerId: string, data: {
  deliveryId: string
  riderId: string
  rating: number
  comment?: string
}) {
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('REVIEW_INVALID_RATING', 400, { message: 'La note doit être entre 1 et 5' })
  }

  // Verify the delivery exists and is associated with an order the reviewer initiated
  const delivery = await prisma.delivery.findUnique({
    where: { id: data.deliveryId },
    select: { order: { select: { initiatorId: true } }, status: true },
  })

  if (!delivery) {
    throw new AppError('DELIVERY_NOT_FOUND', 404)
  }

  if (delivery.order.initiatorId !== reviewerId) {
    throw new AppError('REVIEW_NOT_ORDER_BUYER', 403, { message: 'Seul l\'acheteur peut évaluer la livraison' })
  }

  if (delivery.status !== 'DELIVERED' && delivery.status !== 'CONFIRMED') {
    throw new AppError('REVIEW_DELIVERY_NOT_COMPLETED', 400, { message: 'La livraison doit être terminée pour évaluer' })
  }

  return prisma.deliveryReview.create({
    data: {
      deliveryId: data.deliveryId,
      riderId: data.riderId,
      reviewerId,
      rating: data.rating,
      comment: data.comment,
    },
  })
}

// M2 fix: Use Prisma aggregate instead of in-memory calculation
export async function getVendorReviews(vendorId: string) {
  const [reviews, agg] = await Promise.all([
    prisma.sellerReview.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.sellerReview.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: true,
    }),
  ])

  return {
    reviews,
    avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    total: agg._count,
  }
}

export async function getRiderReviews(riderId: string) {
  const [reviews, agg] = await Promise.all([
    prisma.deliveryReview.findMany({
      where: { riderId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.deliveryReview.aggregate({
      where: { riderId },
      _avg: { rating: true },
      _count: true,
    }),
  ])

  return {
    reviews,
    avgRating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
    total: agg._count,
  }
}

export async function openDispute(openedBy: string, orderId: string, reason: string) {
  // Verify user is involved in the order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { initiatorId: true },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }

  if (order.initiatorId !== openedBy) {
    throw new AppError('DISPUTE_NOT_ORDER_PARTY', 403, { message: 'Seul un participant de la commande peut ouvrir un litige' })
  }

  return prisma.dispute.create({
    data: { orderId, openedBy, reason },
  })
}

// H4 fix: Verify user is involved in the order or is admin
export async function getDisputesByOrder(orderId: string, requesterId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { initiatorId: true },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }

  // Check ownership — admins bypass via requireRole in route
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { roles: true },
  })

  const isAdmin = requester?.roles.includes('ADMIN')
  if (order.initiatorId !== requesterId && !isAdmin) {
    throw new AppError('DISPUTE_NOT_ORDER_PARTY', 403)
  }

  return prisma.dispute.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  })
}

export async function resolveDispute(disputeId: string, resolution: string, inFavorOf: 'buyer' | 'seller') {
  return prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: inFavorOf === 'buyer' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER',
      resolution,
      resolvedAt: new Date(),
    },
  })
}
