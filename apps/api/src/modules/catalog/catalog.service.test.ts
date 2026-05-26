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
const mockCatalogItemUpdate = vi.fn()
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
      update: (...args: unknown[]) => mockCatalogItemUpdate(...args),
    },
    job: {
      create: (...args: unknown[]) => mockJobCreate(...args),
    },
  },
}))

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn().mockResolvedValue('https://r2.dev/catalog/vendor-1/image.jpg'),
}))

const { uploadPartImage, getMyItems, getItem, updateItem, publishItem, toggleStock } = await import('./catalog.service.js')

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

  describe('updateItem', () => {
    it('updates item fields partially', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: null, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({
        id: 'item-1', name: 'Filtre à huile', price: 5000,
      })

      const result = await updateItem('user-1', 'item-1', { name: 'Filtre à huile', price: 5000 })

      expect(result.name).toBe('Filtre à huile')
      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'item-1' },
          data: expect.objectContaining({ name: 'Filtre à huile', price: 5000 }),
        }),
      )
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(updateItem('user-1', 'item-1', { name: 'Test' }))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it('throws CATALOG_ITEM_NOT_FOUND when item not found', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce(null)

      await expect(updateItem('user-1', 'item-1', { name: 'Test' }))
        .rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND', statusCode: 404 })
    })

    it('detects bait-and-switch price variation >50% in <1h', async () => {
      const recentTime = new Date(Date.now() - 30 * 60 * 1000) // 30 min ago
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'PUBLISHED', price: 10000, priceUpdatedAt: recentTime,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({
        id: 'item-1', price: 25000, priceAlertFlag: true,
      })

      const mockLogger = { warn: vi.fn() }
      const result = await updateItem('user-1', 'item-1', { price: 25000 }, mockLogger)

      expect(result.priceAlertFlag).toBe(true)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'PRICE_ALERT_BAIT_SWITCH' }),
        expect.any(String),
      )
    })
  })

  describe('publishItem', () => {
    it('publishes a draft item with price', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: 5000,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({
        id: 'item-1', status: 'PUBLISHED',
      })

      const result = await publishItem('user-1', 'item-1')

      expect(result.status).toBe('PUBLISHED')
    })

    it('throws CATALOG_PRICE_REQUIRED when price is null', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: null,
      })

      await expect(publishItem('user-1', 'item-1'))
        .rejects.toMatchObject({ code: 'CATALOG_PRICE_REQUIRED', statusCode: 422 })
    })

    it('throws CATALOG_ITEM_NOT_DRAFT when already published', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'PUBLISHED', price: 5000,
      })

      await expect(publishItem('user-1', 'item-1'))
        .rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_DRAFT', statusCode: 422 })
    })
  })

  describe('toggleStock', () => {
    it('toggles stock on published item', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'PUBLISHED',
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({
        id: 'item-1', inStock: false,
      })

      const result = await toggleStock('user-1', 'item-1', false)

      expect(result.inStock).toBe(false)
    })

    it('throws CATALOG_ITEM_NOT_PUBLISHED when item is draft', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT',
      })

      await expect(toggleStock('user-1', 'item-1', false))
        .rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_PUBLISHED', statusCode: 422 })
    })
  })
})
