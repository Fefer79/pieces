import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

export async function createSellerReview(reviewerId: string, data: {
  orderId: string
  vendorId: string
  rating: number
  comment?: string
}) {
  if (data.rating < 1 || data.rating > 5) {
    throw new AppError('REVIEW_INVALID_RATING', 400, { message: 'La note doit être entre 1 et 5' })
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

export async function getVendorReviews(vendorId: string) {
  const reviews = await prisma.sellerReview.findMany({
    where: { vendorId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return { reviews, avgRating: Math.round(avgRating * 10) / 10, total: reviews.length }
}

export async function getRiderReviews(riderId: string) {
  const reviews = await prisma.deliveryReview.findMany({
    where: { riderId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  return { reviews, avgRating: Math.round(avgRating * 10) / 10, total: reviews.length }
}

export async function openDispute(openedBy: string, orderId: string, reason: string) {
  return prisma.dispute.create({
    data: { orderId, openedBy, reason },
  })
}

export async function getDisputesByOrder(orderId: string) {
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
