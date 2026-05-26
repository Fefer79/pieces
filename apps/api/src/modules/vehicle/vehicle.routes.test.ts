import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockUserVehicleFindMany = vi.fn()
const mockUserVehicleCount = vi.fn()
const mockUserVehicleCreate = vi.fn()
const mockUserVehicleFindFirst = vi.fn()
const mockUserVehicleDelete = vi.fn()
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
    userVehicle: {
      findMany: (...args: unknown[]) => mockUserVehicleFindMany(...args),
      count: (...args: unknown[]) => mockUserVehicleCount(...args),
      create: (...args: unknown[]) => mockUserVehicleCreate(...args),
      findFirst: (...args: unknown[]) => mockUserVehicleFindFirst(...args),
      delete: (...args: unknown[]) => mockUserVehicleDelete(...args),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
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

describe('Vehicle Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/users/me/vehicles', () => {
    it('returns 200 with vehicles', async () => {
      mockUserVehicleFindMany.mockResolvedValueOnce([
        { id: 'v1', brand: 'Toyota', model: 'Corolla', year: 2015, vin: null, createdAt: new Date() },
      ])

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/vehicles',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveLength(1)
    })

    it('returns 401 without auth', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/me/vehicles',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/v1/users/me/vehicles', () => {
    it('returns 201 when vehicle created', async () => {
      mockUserVehicleCount.mockResolvedValueOnce(0)
      mockUserVehicleCreate.mockResolvedValueOnce({
        id: 'v1', brand: 'Toyota', model: 'Corolla', year: 2015, vin: null, createdAt: new Date(),
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/vehicles',
        headers: { ...mockAuth(), 'content-type': 'application/json' },
        payload: JSON.stringify({ brand: 'Toyota', model: 'Corolla', year: 2015 }),
      })

      expect(response.statusCode).toBe(201)
      expect(response.json().data.brand).toBe('Toyota')
    })

    it('returns 422 for invalid body', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users/me/vehicles',
        headers: { ...mockAuth(), 'content-type': 'application/json' },
        payload: JSON.stringify({ brand: '' }),
      })

      expect(response.statusCode).toBe(422)
    })
  })

  describe('DELETE /api/v1/users/me/vehicles/:vehicleId', () => {
    it('returns 204 when vehicle deleted', async () => {
      mockUserVehicleFindFirst.mockResolvedValueOnce({ id: 'v1', userId: 'prisma-user-1' })
      mockUserVehicleDelete.mockResolvedValueOnce({})

      const app = buildApp()
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/me/vehicles/v1',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(204)
    })

    it('returns 404 when vehicle not found', async () => {
      mockUserVehicleFindFirst.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/users/me/vehicles/bad-id',
        headers: mockAuth(),
      })

      expect(response.statusCode).toBe(404)
    })
  })
})
