import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockCatalogItemFindMany = vi.fn()
const mockOrderCreate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderFindMany = vi.fn()
const mockOrderUpdate = vi.fn()

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
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: vi.fn(),
    },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: {
      create: (...args: unknown[]) => mockOrderCreate(...args),
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

function mockAuth() {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-1',
    phone: '+2250700000000',
    roles: ['MECHANIC'],
    activeContext: 'MECHANIC',
    consentedAt: new Date(),
  })
  return { authorization: 'Bearer test-token' }
}

describe('Order Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/orders', () => {
    it('returns 201 when order created', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({
        id: 'order-1', status: 'DRAFT', shareToken: 'abc', totalAmount: 5000, items: [{ id: 'oi-1' }],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { ...mockAuth(), 'content-type': 'application/json' },
        payload: JSON.stringify({ items: [{ catalogItemId: 'item-1' }] }),
      })

      expect(response.statusCode).toBe(201)
      expect(response.json().data.shareToken).toBe('abc')
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/orders',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ items: [{ catalogItemId: 'item-1' }] }),
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/orders', () => {
    it('returns 200 with user orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { id: 'order-1', status: 'DRAFT', items: [] },
      ])

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveLength(1)
    })
  })

  describe('GET /api/v1/orders/share/:shareToken', () => {
    it('returns 200 with order (public, no auth)', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1', status: 'DRAFT', items: [], initiator: { id: 'u1', phone: '+225...' },
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/share/abc123',
      })

      expect(response.statusCode).toBe(200)
    })

    it('returns 404 for invalid token', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/share/bad',
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('POST /api/v1/orders/:orderId/pay', () => {
    it('returns 200 when COD selected', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000 })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'PAID', paymentMethod: 'COD', items: [] })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/order-1/pay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ paymentMethod: 'COD' }),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('PAID')
    })
  })

  describe('POST /api/v1/orders/:orderId/cancel', () => {
    it('returns 200 when order cancelled', async () => {
      mockOrderFindUnique
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' })
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'CANCELLED', items: [] })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/order-1/cancel',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ reason: 'Changed my mind' }),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('CANCELLED')
    })
  })

  describe('POST /api/v1/orders/:orderId/confirm', () => {
    it('returns 200 when vendor confirms', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PAID' })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'VENDOR_CONFIRMED', items: [] })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/orders/order-1/confirm',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('VENDOR_CONFIRMED')
    })
  })
})
