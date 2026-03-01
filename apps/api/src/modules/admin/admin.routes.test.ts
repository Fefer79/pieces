import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockOrderFindMany = vi.fn()
const mockOrderCount = vi.fn()

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
      findUnique: vi.fn().mockResolvedValue({ roles: ['ADMIN'] }),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    vendor: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    catalogItem: { findMany: vi.fn(), count: vi.fn() },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      update: vi.fn(),
      count: (...args: unknown[]) => mockOrderCount(...args),
    },
    escrowTransaction: { create: vi.fn(), findUnique: vi.fn() },
    delivery: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    sellerReview: { create: vi.fn(), findMany: vi.fn() },
    deliveryReview: { create: vi.fn(), findMany: vi.fn() },
    dispute: { create: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(), downloadFromR2: vi.fn(), getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

vi.mock('../whatsapp/whatsapp.service.js', () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue({ success: true }),
  sendWhatsAppTemplate: vi.fn().mockResolvedValue({ success: true }),
  getVerifyToken: vi.fn().mockReturnValue('test'),
  parseIncomingMessage: vi.fn().mockReturnValue({ from: null, text: null, imageId: null }),
}))

const { buildApp } = await import('../../server.js')

function mockAuth(role = 'ADMIN') {
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

describe('Admin Routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('GET /api/v1/admin/orders/history', () => {
    it('returns 200 with user order history', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { id: 'o1', status: 'COMPLETED', items: [], delivery: null },
      ])
      mockOrderCount.mockResolvedValueOnce(1)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders/history',
        headers: mockAuth('MECHANIC'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.orders).toHaveLength(1)
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders/history',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns 200 with stats for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveProperty('totalUsers')
    })

    it('returns 403 for non-admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: mockAuth('MECHANIC'),
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /api/v1/admin/users', () => {
    it('returns 200 with user list for admin', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/users',
        headers: mockAuth('ADMIN'),
      })

      expect(response.statusCode).toBe(200)
    })
  })
})
