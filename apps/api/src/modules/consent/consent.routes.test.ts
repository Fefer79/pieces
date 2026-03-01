import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockUpsert = vi.fn()
const mockDeletionCreate = vi.fn()
const mockDeletionFindFirst = vi.fn()

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
      update: (...args: unknown[]) => mockUpdate(...args),
      upsert: (...args: unknown[]) => mockUpsert(...args),
    },
    dataDeletionRequest: {
      create: (...args: unknown[]) => mockDeletionCreate(...args),
      findFirst: (...args: unknown[]) => mockDeletionFindFirst(...args),
    },
  },
}))

const { buildApp } = await import('../../server.js')

function mockAuthUser(overrides?: Record<string, unknown>) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'supabase-user-123', phone: '+2250700000000' } },
    error: null,
  })
  mockUpsert.mockResolvedValueOnce({
    id: 'prisma-user-123',
    phone: '+2250700000000',
    roles: ['MECHANIC'],
    activeContext: 'MECHANIC',
    consentedAt: null,
    ...overrides,
  })
}

describe('Consent Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/users/me/consent', () => {
    it('returns 200 when consent accepted', async () => {
      mockAuthUser()
      mockFindUnique.mockResolvedValueOnce({ id: 'prisma-user-123' })
      const consentDate = new Date('2026-03-01T12:00:00Z')
      mockUpdate.mockResolvedValueOnce({ consentedAt: consentDate })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/consent',
        headers: { authorization: 'Bearer valid-token' },
        payload: { accepted: true },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.consentedAt).toBeDefined()
    })

    it('returns 400 when accepted is false', async () => {
      mockAuthUser()

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/consent',
        headers: { authorization: 'Bearer valid-token' },
        payload: { accepted: false },
      })

      expect(response.statusCode).toBe(400)
      expect(response.json().error.code).toBe('CONSENT_MUST_ACCEPT')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/consent',
        payload: { accepted: true },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/users/me/data', () => {
    it('returns 200 with user data', async () => {
      mockAuthUser({ consentedAt: new Date('2026-03-01T12:00:00Z') })
      mockFindUnique.mockResolvedValueOnce({
        phone: '+2250700000000',
        roles: ['MECHANIC'],
        activeContext: 'MECHANIC',
        consentedAt: new Date('2026-03-01T12:00:00Z'),
        createdAt: new Date('2026-02-15T10:00:00Z'),
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/data',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json().data
      expect(data.phone).toBe('+2250700000000')
      expect(data.consentedAt).toBeDefined()
    })
  })

  describe('POST /api/v1/users/me/data/deletion-request', () => {
    it('returns 200 with deletion request', async () => {
      mockAuthUser({ consentedAt: new Date('2026-03-01T12:00:00Z') })
      mockDeletionFindFirst.mockResolvedValueOnce(null)
      mockDeletionCreate.mockResolvedValueOnce({
        id: 'del-1',
        status: 'PENDING',
        requestedAt: new Date('2026-03-01T12:00:00Z'),
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/data/deletion-request',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const data = response.json().data
      expect(data.status).toBe('PENDING')
      expect(data.id).toBe('del-1')
    })
  })
})
