import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const orderFindMany = vi.fn()
const disputeCount = vi.fn()
const sellerReviewFindMany = vi.fn()
const vendorUpdate = vi.fn()
const vendorFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: { findMany: (...a: unknown[]) => orderFindMany(...a) },
    dispute: { count: (...a: unknown[]) => disputeCount(...a) },
    sellerReview: { findMany: (...a: unknown[]) => sellerReviewFindMany(...a) },
    vendor: {
      update: (...a: unknown[]) => vendorUpdate(...a),
      findMany: (...a: unknown[]) => vendorFindMany(...a),
    },
  },
}))

const { recomputeVendorScore } = await import('./vendorScore.service.js')

describe('recomputeVendorScore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null aggregate below the 3-delivered-orders threshold', async () => {
    orderFindMany.mockResolvedValueOnce([{ id: 'o1' }, { id: 'o2' }]) // only 2
    disputeCount.mockResolvedValueOnce(0)
    sellerReviewFindMany.mockResolvedValueOnce([{ rating: 5 }])
    vendorUpdate.mockResolvedValueOnce({})

    const result = await recomputeVendorScore('v1')
    expect(result.ordersDelivered).toBe(2)
    expect(result.aggregateRating).toBeNull()
  })

  it('uses dispute-only score when no reviews', async () => {
    orderFindMany.mockResolvedValueOnce([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }, { id: 'o4' }])
    disputeCount.mockResolvedValueOnce(1)
    sellerReviewFindMany.mockResolvedValueOnce([])
    vendorUpdate.mockResolvedValueOnce({})

    const result = await recomputeVendorScore('v1')
    // disputeRate = 1/4 = 0.25 → disputeScore = 75
    expect(result.aggregateRating).toBe(75)
    expect(result.avgReviewRating).toBeNull()
  })

  it('blends review and dispute score 50/50', async () => {
    orderFindMany.mockResolvedValueOnce([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }, { id: 'o4' }])
    disputeCount.mockResolvedValueOnce(1) // disputeScore = 75
    sellerReviewFindMany.mockResolvedValueOnce([{ rating: 4 }, { rating: 4 }, { rating: 4 }])
    // avg = 4, reviewScore = 80
    vendorUpdate.mockResolvedValueOnce({})

    const result = await recomputeVendorScore('v1')
    // 0.5 * 80 + 0.5 * 75 = 77.5
    expect(result.aggregateRating).toBe(77.5)
    expect(result.avgReviewRating).toBe(4)
  })

  it('caps dispute score at 0 when disputeRate exceeds 1', async () => {
    orderFindMany.mockResolvedValueOnce([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }])
    disputeCount.mockResolvedValueOnce(10) // disputeRate > 1 → score = 0
    sellerReviewFindMany.mockResolvedValueOnce([])
    vendorUpdate.mockResolvedValueOnce({})

    const result = await recomputeVendorScore('v1')
    expect(result.aggregateRating).toBe(0)
  })

  it('persists computed snapshot fields to Vendor', async () => {
    orderFindMany.mockResolvedValueOnce([{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }])
    disputeCount.mockResolvedValueOnce(0)
    sellerReviewFindMany.mockResolvedValueOnce([{ rating: 5 }])
    vendorUpdate.mockResolvedValueOnce({})

    await recomputeVendorScore('v1')
    expect(vendorUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'v1' },
        data: expect.objectContaining({
          ordersDelivered: 3,
          disputesOpened: 0,
          avgReviewRating: 5,
          aggregateRating: expect.any(Number),
          scoreUpdatedAt: expect.any(Date),
        }),
      }),
    )
  })
})
