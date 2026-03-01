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
  },
}))

const { buildApp } = await import('../../server.js')

function mockAuthUser(overrides?: Record<string, unknown>) {
  const supabaseId = 'supabase-user-123'
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: supabaseId, phone: '+2250700000000' } },
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

describe('User Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/users/me', () => {
    it('returns 200 with user profile', async () => {
      mockAuthUser()
      mockFindUnique.mockResolvedValueOnce({
        id: 'prisma-user-123',
        phone: '+2250700000000',
        roles: ['MECHANIC'],
        activeContext: 'MECHANIC',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.id).toBe('prisma-user-123')
      expect(body.data.roles).toEqual(['MECHANIC'])
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/v1/users/me/context', () => {
    it('returns 200 when switching to valid role', async () => {
      mockAuthUser({ roles: ['MECHANIC', 'OWNER'] })
      mockFindUnique.mockResolvedValueOnce({
        roles: ['MECHANIC', 'OWNER'],
      })
      mockUpdate.mockResolvedValueOnce({
        id: 'prisma-user-123',
        phone: '+2250700000000',
        roles: ['MECHANIC', 'OWNER'],
        activeContext: 'OWNER',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/context',
        headers: { authorization: 'Bearer valid-token' },
        payload: { role: 'OWNER' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.activeContext).toBe('OWNER')
    })

    it('returns 403 when role is not assigned', async () => {
      mockAuthUser({ roles: ['MECHANIC'] })
      mockFindUnique.mockResolvedValueOnce({
        roles: ['MECHANIC'],
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/me/context',
        headers: { authorization: 'Bearer valid-token' },
        payload: { role: 'ADMIN' },
      })

      expect(response.statusCode).toBe(403)
      expect(response.json().error.code).toBe('USER_ROLE_NOT_ASSIGNED')
    })
  })

  describe('PATCH /api/v1/users/:userId/roles', () => {
    it('returns 200 when admin updates roles', async () => {
      mockAuthUser({ roles: ['ADMIN'], activeContext: 'ADMIN' })
      mockFindUnique.mockResolvedValueOnce({ activeContext: 'MECHANIC' })
      mockUpdate.mockResolvedValueOnce({
        id: 'target-user',
        phone: '+2250500000000',
        roles: ['MECHANIC', 'SELLER'],
        activeContext: 'MECHANIC',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/target-user/roles',
        headers: { authorization: 'Bearer valid-token' },
        payload: { roles: ['MECHANIC', 'SELLER'] },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.roles).toEqual(['MECHANIC', 'SELLER'])
    })

    it('returns 403 when non-admin tries to update roles', async () => {
      mockAuthUser({ roles: ['MECHANIC'], activeContext: 'MECHANIC' })

      const app = buildApp()
      const response = await app.inject({
        method: 'PATCH',
        url: '/api/v1/users/target-user/roles',
        headers: { authorization: 'Bearer valid-token' },
        payload: { roles: ['MECHANIC', 'SELLER'] },
      })

      expect(response.statusCode).toBe(403)
    })
  })
})
