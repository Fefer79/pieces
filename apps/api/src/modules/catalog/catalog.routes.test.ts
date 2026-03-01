import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockCatalogItemCreate = vi.fn()
const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockCatalogItemFindFirst = vi.fn()
const mockJobCreate = vi.fn()
const mockTransaction = vi.fn()

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
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    catalogItem: {
      create: (...args: unknown[]) => mockCatalogItemCreate(...args),
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
      findFirst: (...args: unknown[]) => mockCatalogItemFindFirst(...args),
    },
    job: {
      create: (...args: unknown[]) => mockJobCreate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn().mockResolvedValue('https://r2.dev/catalog/vendor-1/image.jpg'),
  downloadFromR2: vi.fn(),
  getPublicUrl: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

function mockAuthUser(overrides?: Record<string, unknown>) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'supabase-user-123', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-123',
    phone: '+2250700000000',
    roles: ['SELLER'],
    activeContext: 'SELLER',
    consentedAt: new Date('2026-03-01T12:00:00Z'),
    ...overrides,
  })
}

describe('Catalog Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/v1/catalog/items/upload', () => {
    it('returns 201 when image uploaded successfully', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({
        id: 'item-1',
        vendorId: 'vendor-1',
        status: 'DRAFT',
        imageOriginalUrl: 'https://r2.dev/catalog/vendor-1/image.jpg',
      })
      mockJobCreate.mockResolvedValue({ id: 'job-1' })

      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog/items/upload',
        headers: {
          authorization: 'Bearer valid-token',
          'content-type': 'multipart/form-data; boundary=---boundary',
        },
        payload:
          '-----boundary\r\n' +
          'Content-Disposition: form-data; name="file"; filename="photo.jpg"\r\n' +
          'Content-Type: image/jpeg\r\n' +
          '\r\n' +
          'fake-image-data\r\n' +
          '-----boundary--\r\n',
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.data.id).toBe('item-1')
      expect(body.data.status).toBe('DRAFT')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/catalog/items/upload',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/catalog/items', () => {
    it('returns 200 with catalog items', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', status: 'DRAFT' },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.data.items).toHaveLength(1)
      expect(body.data.pagination.total).toBe(1)
    })

    it('returns 404 when no vendor profile', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('VENDOR_NOT_FOUND')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items',
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/v1/catalog/items/:id', () => {
    it('returns 200 with catalog item detail', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: '00000000-0000-0000-0000-000000000001',
        vendorId: 'vendor-1',
        name: 'Plaquette de frein',
        status: 'DRAFT',
      })

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items/00000000-0000-0000-0000-000000000001',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(200)
      expect(response.json().data.name).toBe('Plaquette de frein')
    })

    it('returns 404 when item not found', async () => {
      mockAuthUser()
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce(null)

      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items/00000000-0000-0000-0000-000000000099',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe('CATALOG_ITEM_NOT_FOUND')
    })

    it('returns 401 without auth token', async () => {
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items/00000000-0000-0000-0000-000000000001',
      })

      expect(response.statusCode).toBe(401)
    })

    it('returns 422 for invalid UUID param', async () => {
      mockAuthUser()
      const app = buildApp()
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/catalog/items/not-a-uuid',
        headers: { authorization: 'Bearer valid-token' },
      })

      expect(response.statusCode).toBe(422)
    })
  })
})
