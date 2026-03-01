import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockEscrowCreate = vi.fn()
const mockEscrowFindUnique = vi.fn()
const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

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
    escrowTransaction: {
      create: (...args: unknown[]) => mockEscrowCreate(...args),
      findUnique: (...args: unknown[]) => mockEscrowFindUnique(...args),
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

describe('Payment Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/webhooks/cinetpay', () => {
    it('returns 200 and creates escrow for accepted payment', async () => {
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', amount: 5000, status: 'HELD' })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/cinetpay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({
          cpm_trans_id: 'pieces_order-1_1234567890',
          cpm_trans_status: 'ACCEPTED',
          cpm_amount: '5000',
        }),
      })

      expect(response.statusCode).toBe(200)
      expect(mockEscrowCreate).toHaveBeenCalled()
    })

    it('returns 400 when transaction ID missing', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/cinetpay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({}),
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('GET /api/v1/orders/:orderId/escrow', () => {
    it('returns 200 with escrow data', async () => {
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', amount: 5000, status: 'HELD' })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/order-1/escrow',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('HELD')
    })
  })
})
