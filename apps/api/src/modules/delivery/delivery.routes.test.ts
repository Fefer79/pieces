import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockDeliveryCreate = vi.fn()
const mockDeliveryFindUnique = vi.fn()
const mockDeliveryFindMany = vi.fn()
const mockDeliveryUpdate = vi.fn()

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
    delivery: {
      create: (...args: unknown[]) => mockDeliveryCreate(...args),
      findUnique: (...args: unknown[]) => mockDeliveryFindUnique(...args),
      findMany: (...args: unknown[]) => mockDeliveryFindMany(...args),
      update: (...args: unknown[]) => mockDeliveryUpdate(...args),
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

function mockAuth(role = 'RIDER') {
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

describe('Delivery Routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('GET /api/v1/deliveries/mine', () => {
    it('returns 200 with rider deliveries', async () => {
      mockDeliveryFindMany.mockResolvedValueOnce([
        { id: 'd1', status: 'ASSIGNED', order: { items: [] } },
      ])

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries/mine',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveLength(1)
    })
  })

  describe('POST /api/v1/deliveries/:deliveryId/pickup', () => {
    it('returns 200 when pickup started', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'prisma-user-1', status: 'ASSIGNED' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', status: 'PICKUP_IN_PROGRESS' })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries/d1/pickup',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('PICKUP_IN_PROGRESS')
    })
  })

  describe('POST /api/v1/deliveries/:deliveryId/deliver', () => {
    it('returns 200 when delivery confirmed', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'prisma-user-1', status: 'IN_TRANSIT' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', status: 'DELIVERED', deliveredAt: new Date() })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/deliveries/d1/deliver',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('DELIVERED')
    })
  })

  describe('GET /api/v1/deliveries/order/:orderId', () => {
    it('returns 200 with delivery (public)', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', status: 'IN_TRANSIT' })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/deliveries/order/order-1',
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
