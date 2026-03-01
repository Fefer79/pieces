import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockVendorFindUnique = vi.fn()
const mockCatalogItemCreate = vi.fn()
const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockCatalogItemFindFirst = vi.fn()
const mockJobCreate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
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
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn().mockResolvedValue('https://r2.dev/catalog/vendor-1/image.jpg'),
}))

const { uploadPartImage, getMyItems, getItem } = await import('./catalog.service.js')

describe('catalog.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadPartImage', () => {
    const validBuffer = Buffer.from('fake-image-data')

    it('creates catalog item and enqueues jobs', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({
        id: 'item-1',
        vendorId: 'vendor-1',
        status: 'DRAFT',
        imageOriginalUrl: 'https://r2.dev/catalog/vendor-1/image.jpg',
      })
      mockJobCreate.mockResolvedValue({ id: 'job-1' })

      const result = await uploadPartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg')

      expect(result.id).toBe('item-1')
      expect(result.status).toBe('DRAFT')
      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-1',
            status: 'DRAFT',
          }),
        }),
      )
      expect(mockJobCreate).toHaveBeenCalledTimes(2)
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(uploadPartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it('throws VENDOR_NOT_ACTIVE when vendor is pending', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'PENDING_ACTIVATION' })

      await expect(uploadPartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_ACTIVE', statusCode: 403 })
    })

    it('throws FILE_TOO_LARGE when file exceeds 5MB', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024) // 6 MB

      await expect(uploadPartImage('user-1', bigBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'FILE_TOO_LARGE', statusCode: 422 })
    })

    it('throws INVALID_FILE_TYPE for non-image files', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })

      await expect(uploadPartImage('user-1', validBuffer, 'doc.pdf', 'application/pdf'))
        .rejects.toMatchObject({ code: 'INVALID_FILE_TYPE', statusCode: 422 })
    })
  })

  describe('getMyItems', () => {
    it('returns paginated catalog items', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre à huile', status: 'DRAFT' },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const result = await getMyItems('user-1')

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(result.pagination.page).toBe(1)
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(getMyItems('user-1'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })
  })

  describe('getItem', () => {
    it('returns a single catalog item', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1',
        vendorId: 'vendor-1',
        name: 'Plaquette de frein',
      })

      const result = await getItem('user-1', 'item-1')

      expect(result.id).toBe('item-1')
      expect(result.name).toBe('Plaquette de frein')
    })

    it('throws CATALOG_ITEM_NOT_FOUND when item not found', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce(null)

      await expect(getItem('user-1', 'nonexistent'))
        .rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND', statusCode: 404 })
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(getItem('user-1', 'item-1'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })
  })
})
