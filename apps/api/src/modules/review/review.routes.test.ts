import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockSellerReviewCreate = vi.fn()
const mockSellerReviewFindMany = vi.fn()
const mockDeliveryReviewCreate = vi.fn()
const mockDeliveryReviewFindMany = vi.fn()
const mockDisputeCreate = vi.fn()
const mockDisputeFindMany = vi.fn()
const mockDisputeUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
    catalogItem: { findMany: vi.fn(), count: vi.fn() },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    escrowTransaction: { create: vi.fn(), findUnique: vi.fn() },
    delivery: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
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

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(), downloadFromR2: vi.fn(), getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

function mockAuth(role = 'MECHANIC') {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-1',
    phone: '+2250700000000',
    roles: [role],
    activeContext: role,
    consentedAt: new Date(),
  })
  return { authorization: 'Bearer test-token' }
}

describe('Review Routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('POST /api/v1/reviews/seller', () => {
    it('returns 201 with created review', async () => {
      mockSellerReviewCreate.mockResolvedValueOnce({
        id: 'r1', orderId: 'o1', vendorId: 'v1', reviewerId: 'prisma-user-1', rating: 4,
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews/seller',
        headers: mockAuth(),
        payload: { orderId: 'o1', vendorId: 'v1', rating: 4, comment: 'Bon' },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json().data.rating).toBe(4)
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews/seller',
        payload: { orderId: 'o1', vendorId: 'v1', rating: 4 },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/reviews/vendor/:vendorId', () => {
    it('returns 200 with vendor reviews (public)', async () => {
      mockSellerReviewFindMany.mockResolvedValueOnce([
        { rating: 4 }, { rating: 5 },
      ])

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/reviews/vendor/v1',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.total).toBe(2)
    })
  })

  describe('POST /api/v1/reviews/disputes', () => {
    it('returns 201 with opened dispute', async () => {
      mockDisputeCreate.mockResolvedValueOnce({
        id: 'disp1', orderId: 'o1', openedBy: 'prisma-user-1', status: 'OPEN', reason: 'Pièce cassée',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews/disputes',
        headers: mockAuth(),
        payload: { orderId: 'o1', reason: 'Pièce cassée' },
      })

      expect(response.statusCode).toBe(201)
      expect(response.json().data.status).toBe('OPEN')
    })
  })

  describe('POST /api/v1/reviews/disputes/:disputeId/resolve', () => {
    it('returns 200 when admin resolves dispute', async () => {
      mockDisputeUpdate.mockResolvedValueOnce({
        id: 'disp1', status: 'RESOLVED_BUYER', resolution: 'Remboursement',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/reviews/disputes/disp1/resolve',
        headers: mockAuth('ADMIN'),
        payload: { resolution: 'Remboursement', inFavorOf: 'buyer' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('RESOLVED_BUYER')
    })
  })
})
