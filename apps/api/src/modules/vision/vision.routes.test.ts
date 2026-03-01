import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockIdentifyPart = vi.fn()
const mockCatalogItemFindMany = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/gemini.js', () => ({
  identifyPart: (...args: unknown[]) => mockIdentifyPart(...args),
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    vendor: { findUnique: vi.fn() },
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: vi.fn(),
    },
    searchSynonym: { findMany: vi.fn() },
    userVehicle: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn(),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

describe('Vision Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/vision/identify', () => {
    it('returns 400 when no file uploaded', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vision/identify',
        headers: { 'content-type': 'multipart/form-data; boundary=----test' },
        payload: '------test--',
      })

      expect(response.statusCode).toBe(400)
    })

    it('returns 200 with identification result', async () => {
      mockIdentifyPart.mockResolvedValueOnce({
        name: 'Filtre à huile',
        category: 'Filtration',
        oemReference: null,
        vehicleCompatibility: null,
        suggestedPrice: 5000,
        confidence: 0.9,
      })
      mockCatalogItemFindMany.mockResolvedValueOnce([])

      const app = buildApp()
      const boundary = '----vitest-boundary'
      const payload = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.jpg"',
        'Content-Type: image/jpeg',
        '',
        'fake-image-data',
        `--${boundary}--`,
      ].join('\r\n')

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vision/identify',
        headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
        payload,
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.status).toBe('identified')
    })
  })

  describe('POST /api/v1/vision/disambiguate', () => {
    it('returns 200 with search results', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Disque', category: 'Freinage', price: 15000, imageThumbUrl: null, vendor: { id: 'v1', shopName: 'Shop' } },
      ])

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vision/disambiguate',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({ category: 'Freinage' }),
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data).toHaveLength(1)
    })

    it('returns 400 when category missing', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/vision/disambiguate',
        headers: { 'content-type': 'application/json' },
        payload: JSON.stringify({}),
      })

      expect(response.statusCode).toBe(400)
    })
  })
})
