import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('AUTH_SESSION_SECRET', 'test-session-secret')
vi.stubEnv('WHATSAPP_BUSINESS_NUMBER', '2250700000000')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()

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
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      upsert: vi.fn(),
    },
    vehicle: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

const { buildApp } = await import('../../server.js')
const { signPiecesToken } = await import('../../lib/piecesToken.js')
const { _getCodeStore } = await import('./whatsappLogin.service.js')

describe('WhatsApp reverse-OTP login routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _getCodeStore().clear()
  })

  describe('POST /api/v1/auth/whatsapp/start', () => {
    it('returns a code and wa.me link for a valid phone', async () => {
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/whatsapp/start',
        payload: { phone: '+2250700000000' },
      })
      expect(res.statusCode).toBe(200)
      const { data } = res.json()
      expect(data.code).toMatch(/^P-\d{4}$/)
      expect(data.waLink).toContain('https://wa.me/2250700000000')
    })

    it('rejects an invalid phone via schema validation', async () => {
      const app = buildApp()
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/whatsapp/start',
        payload: { phone: '+123' },
      })
      expect(res.statusCode).toBe(422)
    })
  })

  describe('GET /api/v1/auth/whatsapp/status', () => {
    it('reports pending for a freshly created code', async () => {
      const app = buildApp()
      const start = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/whatsapp/start',
        payload: { phone: '+2250700000000' },
      })
      const { code } = start.json().data

      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/auth/whatsapp/status?code=${encodeURIComponent(code)}`,
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().data.status).toBe('pending')
    })

    it('reports expired for an unknown code', async () => {
      const app = buildApp()
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/whatsapp/status?code=P-0000',
      })
      expect(res.json().data.status).toBe('expired')
    })
  })

  describe('requireAuth accepts a minted Pièces token', () => {
    it('resolves the user from Prisma without calling Supabase', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'user-1',
        phone: '+2250700000000',
        email: null,
        roles: ['BUYER'],
        activeContext: 'BUYER',
        consentedAt: null,
      })

      const token = signPiecesToken('user-1')
      const app = buildApp()
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { Authorization: `Bearer ${token}` },
      })

      expect(res.statusCode).toBe(200)
      expect(res.json().data.id).toBe('user-1')
      expect(mockGetUser).not.toHaveBeenCalled()
    })

    it('rejects a Pièces token whose user no longer exists', async () => {
      mockFindUnique.mockResolvedValue(null)
      const token = signPiecesToken('ghost')
      const app = buildApp()
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { Authorization: `Bearer ${token}` },
      })
      expect(res.statusCode).toBe(401)
    })
  })
})
