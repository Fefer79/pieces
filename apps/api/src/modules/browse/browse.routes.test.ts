import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockSearchSynonymFindMany = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    vendor: { findUnique: vi.fn() },
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
    },
    searchSynonym: {
      findMany: (...args: unknown[]) => mockSearchSynonymFindMany(...args),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

describe('Browse Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/v1/browse/brands', () => {
    it('returns 200 with brands (no auth required)', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/brands',
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data).toContain('Toyota')
    })
  })

  describe('GET /api/v1/browse/brands/:brand/models', () => {
    it('returns 200 with models', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/brands/Toyota/models',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toContain('Corolla')
    })

    it('returns 404 for unknown brand', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/brands/UnknownBrand/models',
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('GET /api/v1/browse/brands/:brand/models/:model/years', () => {
    it('returns 200 with years', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/brands/Toyota/models/Corolla/years',
      })

      expect(response.statusCode).toBe(200)
      const years = response.json().data
      expect(years.length).toBeGreaterThan(10)
    })
  })

  describe('GET /api/v1/browse/categories', () => {
    it('returns 200 with categories', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/categories',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toContain('Freinage')
    })
  })

  describe('GET /api/v1/browse/parts', () => {
    it('returns 200 with parts', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', price: 5000, vendor: { shopName: 'Shop' } },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/parts?brand=Toyota',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.items).toHaveLength(1)
    })
  })

  describe('GET /api/v1/browse/search', () => {
    it('returns 200 with search results', async () => {
      mockSearchSynonymFindMany.mockResolvedValueOnce([])
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre à huile', price: 3000, vendor: { shopName: 'Shop' } },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/search?q=filtre',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.items).toHaveLength(1)
    })

    it('returns empty results for short query', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/browse/search?q=a',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.items).toHaveLength(0)
    })
  })

  describe('POST /api/v1/browse/vin-decode', () => {
    it('returns 200 with decoded VIN', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('nhtsa')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              Results: [{ Make: 'TOYOTA', Model: 'Corolla', ModelYear: '2010' }],
            }),
          })
        }
        return originalFetch(url)
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/browse/vin-decode',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ vin: 'JTDKN3DU5A0123456' }),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.decoded).toBe(true)
      expect(response.json().data.make).toBe('TOYOTA')
      globalThis.fetch = originalFetch
    })

    it('returns 422 for invalid VIN format', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/browse/vin-decode',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ vin: 'short' }),
      })

      expect(response.statusCode).toBe(422)
    })
  })
})
