import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockNotifPrefFindUnique = vi.fn()
const mockNotifPrefUpsert = vi.fn()

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
    sellerReview: { create: vi.fn(), findMany: vi.fn() },
    deliveryReview: { create: vi.fn(), findMany: vi.fn() },
    dispute: { create: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    notificationPreference: {
      findUnique: (...args: unknown[]) => mockNotifPrefFindUnique(...args),
      upsert: (...args: unknown[]) => mockNotifPrefUpsert(...args),
    },
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

describe('Notification Routes', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('GET /api/v1/notifications/preferences', () => {
    it('returns default preferences when none exist', async () => {
      mockNotifPrefFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.whatsapp).toBe(true)
      expect(response.json().data.sms).toBe(false)
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/preferences',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('PUT /api/v1/notifications/preferences', () => {
    it('updates preferences', async () => {
      mockNotifPrefUpsert.mockResolvedValueOnce({
        id: 'pref-1', userId: 'prisma-user-1', whatsapp: true, sms: true, push: false,
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/notifications/preferences',
        headers: mockAuth(),
        payload: { whatsapp: true, sms: true, push: false },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.sms).toBe(true)
    })
  })
})
