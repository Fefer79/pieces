import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockSellerReviewCreate = vi.fn()
const mockSellerReviewFindMany = vi.fn()
const mockDeliveryReviewCreate = vi.fn()
const mockDeliveryReviewFindMany = vi.fn()
const mockDisputeCreate = vi.fn()
const mockDisputeFindMany = vi.fn()
const mockDisputeUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sellerReview: {
      create: (...args: unknown[]) => mockSellerReviewCreate(...args),
      findMany: (...args: unknown[]) => mockSellerReviewFindMany(...args),
    },
    deliveryReview: {
      create: (...args: unknown[]) => mockDeliveryReviewCreate(...args),
      findMany: (...args: unknown[]) => mockDeliveryReviewFindMany(...args),
    },
    dispute: {
      create: (...args: unknown[]) => mockDisputeCreate(...args),
      findMany: (...args: unknown[]) => mockDisputeFindMany(...args),
      update: (...args: unknown[]) => mockDisputeUpdate(...args),
    },
  },
}))

const { createSellerReview, createDeliveryReview, getVendorReviews, getRiderReviews, openDispute, resolveDispute } = await import('./review.service.js')

describe('review.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('createSellerReview', () => {
    it('creates a seller review', async () => {
      mockSellerReviewCreate.mockResolvedValueOnce({
        id: 'r1', orderId: 'o1', vendorId: 'v1', reviewerId: 'u1', rating: 4,
      })

      const result = await createSellerReview('u1', {
        orderId: 'o1', vendorId: 'v1', rating: 4, comment: 'Très bien',
      })
      expect(result.rating).toBe(4)
    })

    it('rejects invalid rating', async () => {
      await expect(
        createSellerReview('u1', { orderId: 'o1', vendorId: 'v1', rating: 0 }),
      ).rejects.toThrow()
    })

    it('rejects rating above 5', async () => {
      await expect(
        createSellerReview('u1', { orderId: 'o1', vendorId: 'v1', rating: 6 }),
      ).rejects.toThrow()
    })
  })

  describe('createDeliveryReview', () => {
    it('creates a delivery review', async () => {
      mockDeliveryReviewCreate.mockResolvedValueOnce({
        id: 'r2', deliveryId: 'd1', riderId: 'rid1', reviewerId: 'u1', rating: 5,
      })

      const result = await createDeliveryReview('u1', {
        deliveryId: 'd1', riderId: 'rid1', rating: 5,
      })
      expect(result.rating).toBe(5)
    })
  })

  describe('getVendorReviews', () => {
    it('returns reviews with average', async () => {
      mockSellerReviewFindMany.mockResolvedValueOnce([
        { rating: 4 }, { rating: 5 }, { rating: 3 },
      ])

      const result = await getVendorReviews('v1')
      expect(result.total).toBe(3)
      expect(result.avgRating).toBe(4)
    })

    it('returns 0 average for no reviews', async () => {
      mockSellerReviewFindMany.mockResolvedValueOnce([])

      const result = await getVendorReviews('v1')
      expect(result.total).toBe(0)
      expect(result.avgRating).toBe(0)
    })
  })

  describe('getRiderReviews', () => {
    it('returns rider reviews with average', async () => {
      mockDeliveryReviewFindMany.mockResolvedValueOnce([
        { rating: 5 }, { rating: 4 },
      ])

      const result = await getRiderReviews('rid1')
      expect(result.total).toBe(2)
      expect(result.avgRating).toBe(4.5)
    })
  })

  describe('openDispute', () => {
    it('creates a dispute', async () => {
      mockDisputeCreate.mockResolvedValueOnce({
        id: 'disp1', orderId: 'o1', openedBy: 'u1', status: 'OPEN', reason: 'Pièce défectueuse',
      })

      const result = await openDispute('u1', 'o1', 'Pièce défectueuse')
      expect(result.status).toBe('OPEN')
    })
  })

  describe('resolveDispute', () => {
    it('resolves in favor of buyer', async () => {
      mockDisputeUpdate.mockResolvedValueOnce({
        id: 'disp1', status: 'RESOLVED_BUYER', resolution: 'Remboursement accordé',
      })

      const result = await resolveDispute('disp1', 'Remboursement accordé', 'buyer')
      expect(result.status).toBe('RESOLVED_BUYER')
    })

    it('resolves in favor of seller', async () => {
      mockDisputeUpdate.mockResolvedValueOnce({
        id: 'disp1', status: 'RESOLVED_SELLER', resolution: 'Pièce conforme',
      })

      const result = await resolveDispute('disp1', 'Pièce conforme', 'seller')
      expect(result.status).toBe('RESOLVED_SELLER')
    })
  })
})
