import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockSellerReviewCreate = vi.fn()
const mockSellerReviewFindMany = vi.fn()
const mockSellerReviewAggregate = vi.fn()
const mockDeliveryReviewCreate = vi.fn()
const mockDeliveryReviewFindMany = vi.fn()
const mockDeliveryReviewAggregate = vi.fn()
const mockDisputeCreate = vi.fn()
const mockDisputeFindMany = vi.fn()
const mockDisputeUpdate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockDeliveryFindUnique = vi.fn()
const mockUserFindUnique = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sellerReview: {
      create: (...args: unknown[]) => mockSellerReviewCreate(...args),
      findMany: (...args: unknown[]) => mockSellerReviewFindMany(...args),
      aggregate: (...args: unknown[]) => mockSellerReviewAggregate(...args),
    },
    deliveryReview: {
      create: (...args: unknown[]) => mockDeliveryReviewCreate(...args),
      findMany: (...args: unknown[]) => mockDeliveryReviewFindMany(...args),
      aggregate: (...args: unknown[]) => mockDeliveryReviewAggregate(...args),
    },
    dispute: {
      create: (...args: unknown[]) => mockDisputeCreate(...args),
      findMany: (...args: unknown[]) => mockDisputeFindMany(...args),
      update: (...args: unknown[]) => mockDisputeUpdate(...args),
    },
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
    delivery: {
      findUnique: (...args: unknown[]) => mockDeliveryFindUnique(...args),
    },
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}))

const { createSellerReview, createDeliveryReview, getVendorReviews, getRiderReviews, openDispute, getDisputesByOrder, resolveDispute } = await import('./review.service.js')

describe('review.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('createSellerReview', () => {
    it('creates a seller review when user is order initiator', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'u1', status: 'COMPLETED' })
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

    it('rejects if user is not order initiator', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'other-user', status: 'COMPLETED' })

      await expect(
        createSellerReview('u1', { orderId: 'o1', vendorId: 'v1', rating: 4 }),
      ).rejects.toThrow('REVIEW_NOT_ORDER_BUYER')
    })

    it('rejects if order not in completed state', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'u1', status: 'PAID' })

      await expect(
        createSellerReview('u1', { orderId: 'o1', vendorId: 'v1', rating: 4 }),
      ).rejects.toThrow('REVIEW_ORDER_NOT_COMPLETED')
    })
  })

  describe('createDeliveryReview', () => {
    it('creates a delivery review', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({
        order: { initiatorId: 'u1' }, status: 'DELIVERED',
      })
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
    it('returns reviews with aggregate average', async () => {
      mockSellerReviewFindMany.mockResolvedValueOnce([
        { rating: 4 }, { rating: 5 }, { rating: 3 },
      ])
      mockSellerReviewAggregate.mockResolvedValueOnce({
        _avg: { rating: 4 }, _count: 3,
      })

      const result = await getVendorReviews('v1')
      expect(result.total).toBe(3)
      expect(result.avgRating).toBe(4)
    })

    it('returns 0 average for no reviews', async () => {
      mockSellerReviewFindMany.mockResolvedValueOnce([])
      mockSellerReviewAggregate.mockResolvedValueOnce({
        _avg: { rating: null }, _count: 0,
      })

      const result = await getVendorReviews('v1')
      expect(result.total).toBe(0)
      expect(result.avgRating).toBe(0)
    })
  })

  describe('getRiderReviews', () => {
    it('returns rider reviews with aggregate average', async () => {
      mockDeliveryReviewFindMany.mockResolvedValueOnce([
        { rating: 5 }, { rating: 4 },
      ])
      mockDeliveryReviewAggregate.mockResolvedValueOnce({
        _avg: { rating: 4.5 }, _count: 2,
      })

      const result = await getRiderReviews('rid1')
      expect(result.total).toBe(2)
      expect(result.avgRating).toBe(4.5)
    })
  })

  describe('openDispute', () => {
    it('creates a dispute when user is order initiator', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'u1' })
      mockDisputeCreate.mockResolvedValueOnce({
        id: 'disp1', orderId: 'o1', openedBy: 'u1', status: 'OPEN', reason: 'Pièce défectueuse',
      })

      const result = await openDispute('u1', 'o1', 'Pièce défectueuse')
      expect(result.status).toBe('OPEN')
    })

    it('rejects if user is not order party', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'other' })

      await expect(
        openDispute('u1', 'o1', 'Raison'),
      ).rejects.toThrow('DISPUTE_NOT_ORDER_PARTY')
    })
  })

  describe('getDisputesByOrder', () => {
    it('returns disputes for order initiator', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'u1' })
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['MECHANIC'] })
      mockDisputeFindMany.mockResolvedValueOnce([{ id: 'disp1' }])

      const result = await getDisputesByOrder('o1', 'u1')
      expect(result).toHaveLength(1)
    })

    it('allows admin to view any order disputes', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'other' })
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['ADMIN'] })
      mockDisputeFindMany.mockResolvedValueOnce([{ id: 'disp1' }])

      const result = await getDisputesByOrder('o1', 'admin-user')
      expect(result).toHaveLength(1)
    })

    it('rejects non-party non-admin', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ initiatorId: 'other' })
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['MECHANIC'] })

      await expect(
        getDisputesByOrder('o1', 'u1'),
      ).rejects.toThrow('DISPUTE_NOT_ORDER_PARTY')
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
