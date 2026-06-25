import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockEscrowCreate = vi.fn()
const mockEscrowFindUnique = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockVerifyCinetPay = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/cinetpay.js', () => ({
  verifyCinetPayTransaction: (...args: unknown[]) => mockVerifyCinetPay(...args),
  initPayment: vi.fn(),
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn(), findFirst: vi.fn() },
    catalogItem: { findMany: vi.fn(), count: vi.fn() },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    enterpriseMember: { findUnique: vi.fn() },
    order: { create: vi.fn(), findUnique: (...args: unknown[]) => mockOrderFindUnique(...args), findMany: vi.fn(), update: vi.fn() },
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
    it('creates escrow only after verifying the transaction with CinetPay', async () => {
      mockVerifyCinetPay.mockResolvedValueOnce({ status: 'ACCEPTED', amount: 5000 })
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', totalAmount: 5000 })
      mockEscrowFindUnique.mockResolvedValueOnce(null) // idempotency: none yet
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', amount: 5000, status: 'HELD' })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/cinetpay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ cpm_trans_id: 'pieces_order-1_1234567890', cpm_trans_status: 'ACCEPTED', cpm_amount: '5000' }),
      })

      expect(response.statusCode).toBe(200)
      expect(mockVerifyCinetPay).toHaveBeenCalledWith('pieces_order-1_1234567890')
      expect(mockEscrowCreate).toHaveBeenCalled()
      // le montant écrit est le montant VÉRIFIÉ, pas celui du payload
      expect(mockEscrowCreate.mock.calls[0]![0]).toMatchObject({ data: { amount: 5000 } })
    })

    it('rejects (401) an unverifiable webhook and writes nothing (anti-spoof)', async () => {
      mockVerifyCinetPay.mockResolvedValueOnce(null) // verification impossible

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/cinetpay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ cpm_trans_id: 'pieces_order-1_1234567890', cpm_trans_status: 'ACCEPTED', cpm_amount: '999999' }),
      })

      expect(response.statusCode).toBe(401)
      expect(mockEscrowCreate).not.toHaveBeenCalled()
    })

    it('acknowledges but ignores a non-ACCEPTED transaction', async () => {
      mockVerifyCinetPay.mockResolvedValueOnce({ status: 'REFUSED', amount: 5000 })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/webhooks/cinetpay',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ cpm_trans_id: 'pieces_order-1_1234567890', cpm_trans_status: 'REFUSED' }),
      })

      expect(response.statusCode).toBe(200)
      expect(mockEscrowCreate).not.toHaveBeenCalled()
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
    it('returns 200 with escrow data for an authorized user (order initiator)', async () => {
      // getOrderById fetch (access check) — initiator matches the auth'd user
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', initiatorId: 'prisma-user-1', enterpriseId: null, items: [], events: [] })
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

    it('returns 403 when the user is not authorized on the order (IDOR)', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', initiatorId: 'someone-else', enterpriseId: null, items: [], events: [] })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/orders/order-1/escrow',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(403)
      expect(mockEscrowFindUnique).not.toHaveBeenCalled()
    })
  })
})
