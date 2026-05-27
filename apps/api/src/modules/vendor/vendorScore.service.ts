import { prisma } from '../../lib/prisma.js'

const DELIVERED_STATUSES = ['DELIVERED', 'CONFIRMED', 'COMPLETED'] as const

// Composite weights (sum to 1.0)
const W_DISPUTES = 0.5
const W_REVIEWS = 0.5

/**
 * Recompute aggregate score snapshot for a vendor.
 *
 * Inputs (live data):
 *   - ordersDelivered: distinct orders where any OrderItem.vendorId = vendor
 *     AND order.status in delivered/confirmed/completed
 *   - disputesOpened: distinct disputes on orders that contain any item from this vendor
 *   - avgReviewRating: mean SellerReview.rating for this vendor
 *
 * Output aggregateRating (0..100), null if not enough data (< 3 delivered orders).
 *   - reviewScore  = (avgReviewRating / 5) * 100
 *   - disputeScore = max(0, 1 - disputeRate) * 100, disputeRate = disputes / delivered
 *   - aggregate    = W_REVIEWS * reviewScore + W_DISPUTES * disputeScore
 *
 * Idempotent. Safe to run repeatedly; values may also be NULL when data is too sparse.
 */
export async function recomputeVendorScore(vendorId: string) {
  // distinct orders with items from this vendor in delivered statuses
  const deliveredOrders = await prisma.order.findMany({
    where: {
      status: { in: [...DELIVERED_STATUSES] },
      items: { some: { vendorId } },
    },
    select: { id: true },
  })
  const ordersDelivered = deliveredOrders.length

  const orderIds = deliveredOrders.map((o) => o.id)

  // disputes opened on any order that includes this vendor's items
  const disputesOpened = orderIds.length
    ? await prisma.dispute.count({
        where: { orderId: { in: orderIds } },
      })
    : 0

  const reviews = await prisma.sellerReview.findMany({
    where: { vendorId },
    select: { rating: true },
  })
  const avgReviewRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null

  let aggregate: number | null = null
  if (ordersDelivered >= 3) {
    const reviewScore = avgReviewRating != null ? (avgReviewRating / 5) * 100 : null
    const disputeRate = disputesOpened / ordersDelivered
    const disputeScore = Math.max(0, 1 - disputeRate) * 100

    if (reviewScore != null) {
      aggregate = W_REVIEWS * reviewScore + W_DISPUTES * disputeScore
    } else {
      // No reviews yet: fall back to dispute component only
      aggregate = disputeScore
    }
    aggregate = Math.round(aggregate * 10) / 10
  }

  await prisma.vendor.update({
    where: { id: vendorId },
    data: {
      ordersDelivered,
      disputesOpened,
      avgReviewRating: avgReviewRating != null ? Math.round(avgReviewRating * 100) / 100 : null,
      aggregateRating: aggregate,
      scoreUpdatedAt: new Date(),
    },
  })

  return { vendorId, ordersDelivered, disputesOpened, avgReviewRating, aggregateRating: aggregate }
}

export async function recomputeAllVendorScores() {
  const vendors = await prisma.vendor.findMany({ select: { id: true } })
  const results = []
  for (const v of vendors) {
    results.push(await recomputeVendorScore(v.id))
  }
  return { count: results.length, results }
}
