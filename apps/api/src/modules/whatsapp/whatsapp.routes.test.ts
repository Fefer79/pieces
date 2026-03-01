import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')
vi.stubEnv('WHATSAPP_TOKEN', 'test-wa-token')
vi.stubEnv('WHATSAPP_PHONE_ID', 'test-phone-id')
vi.stubEnv('WHATSAPP_VERIFY_TOKEN', 'pieces-verify-token')

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
      findUnique: vi.fn().mockResolvedValue({ roles: ['MECHANIC'] }),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
    catalogItem: { findMany: vi.fn(), count: vi.fn() },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    order: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), count: vi.fn() },
    escrowTransaction: { create: vi.fn(), findUnique: vi.fn() },
    delivery: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    sellerReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    deliveryReview: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
    dispute: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    notificationPreference: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(), downloadFromR2: vi.fn(), getPublicUrl: vi.fn(),
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: vi.fn(),
}))

const mockSendMessage = vi.fn().mockResolvedValue({ success: true })
const mockVerifySignature = vi.fn().mockReturnValue(true)

vi.mock('./whatsapp.service.js', async (importOriginal) => {
  const original = await importOriginal() as Record<string, unknown>
  return {
    ...original,
    sendWhatsAppMessage: (...args: unknown[]) => mockSendMessage(...args),
    verifyWebhookSignature: (...args: unknown[]) => mockVerifySignature(...args),
  }
})

const { buildApp } = await import('../../server.js')

describe('WhatsApp Routes', () => {
  beforeEach(() => { vi.clearAllMocks(); mockVerifySignature.mockReturnValue(true) })

  describe('GET /api/v1/whatsapp/webhook', () => {
    it('returns challenge on valid verification', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/whatsapp/webhook',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'pieces-verify-token',
          'hub.challenge': 'test-challenge-123',
        },
      })

      expect(response.statusCode).toBe(200)
      expect(response.body).toBe('test-challenge-123')
    })

    it('returns 403 on invalid verify token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/whatsapp/webhook',
        query: {
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'test',
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('POST /api/v1/whatsapp/webhook', () => {
    it('processes text "aide" command', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: {
          entry: [{
            changes: [{
              value: {
                messages: [{ from: '2250700000000', type: 'text', text: { body: 'aide' } }],
              },
            }],
          }],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockSendMessage).toHaveBeenCalledOnce()
      expect(mockSendMessage.mock.calls[0][1]).toContain('Bienvenue')
    })

    it('processes "recherche" command', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: {
          entry: [{
            changes: [{
              value: {
                messages: [{ from: '2250700000000', type: 'text', text: { body: 'recherche plaquettes' } }],
              },
            }],
          }],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockSendMessage).toHaveBeenCalledOnce()
      expect(mockSendMessage.mock.calls[0][1]).toContain('plaquettes')
    })

    it('processes image message', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: {
          entry: [{
            changes: [{
              value: {
                messages: [{ from: '2250700000000', type: 'image', image: { id: 'img-123' } }],
              },
            }],
          }],
        },
      })

      expect(response.statusCode).toBe(200)
      expect(mockSendMessage).toHaveBeenCalledOnce()
      expect(mockSendMessage.mock.calls[0][1]).toContain('Photo reçue')
    })

    it('returns 200 and ignores empty message', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: { entry: [] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().status).toBe('ignored')
    })

    it('rejects invalid HMAC signature', async () => {
      mockVerifySignature.mockReturnValue(false)

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/whatsapp/webhook',
        payload: { entry: [] },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
