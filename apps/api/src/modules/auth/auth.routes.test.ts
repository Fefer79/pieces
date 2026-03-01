import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockSignInWithOtp = vi.fn()
const mockVerifyOtp = vi.fn()
const mockUpsert = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      signInWithOtp: (...args: unknown[]) => mockSignInWithOtp(...args),
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
  },
}))

const { buildApp } = await import('../../server.js')

describe('Auth Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/auth/otp', () => {
    it('returns 200 when OTP sent successfully', async () => {
      mockSignInWithOtp.mockResolvedValueOnce({ error: null })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp',
        payload: { phone: '+2250700000000' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ data: { sent: true } })
    })

    it('returns 400 for invalid phone', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/otp',
        payload: { phone: 'invalid' },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('AUTH_INVALID_PHONE')
    })
  })

  describe('POST /api/v1/auth/verify', () => {
    it('returns 200 with tokens on valid OTP', async () => {
      mockVerifyOtp.mockResolvedValueOnce({
        data: {
          user: { id: 'supabase-user-123' },
          session: { access_token: 'jwt-token', refresh_token: 'refresh-token' },
        },
        error: null,
      })
      mockUpsert.mockResolvedValueOnce({
        id: 'prisma-user-123',
        phone: '+2250700000000',
        roles: ['MECHANIC'],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify',
        payload: { phone: '+2250700000000', token: '123456' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.accessToken).toBe('jwt-token')
      expect(body.data.user.id).toBe('prisma-user-123')
    })

    it('returns 400 for invalid OTP format', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify',
        payload: { phone: '+2250700000000', token: '12345' },
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.error.code).toBe('AUTH_INVALID_OTP')
    })
  })
})
