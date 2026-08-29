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
const mockCatalogItemFindUniqueOrThrow = vi.fn()
const mockPhotoDeleteMany = vi.fn()
const mockPhotoCreateMany = vi.fn()
const mockFitmentDeleteMany = vi.fn()
const mockFitmentCreateMany = vi.fn()
const mockJobCreate = vi.fn()
const mockJobFindFirst = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => {
  const prisma = {
    vendor: {
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
    },
    catalogItem: {
      create: (...args: unknown[]) => mockCatalogItemCreate(...args),
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
      findFirst: (...args: unknown[]) => mockCatalogItemFindFirst(...args),
      update: (...args: unknown[]) => mockCatalogItemUpdate(...args),
      findUniqueOrThrow: (...args: unknown[]) => mockCatalogItemFindUniqueOrThrow(...args),
    },
    catalogItemPhoto: {
      deleteMany: (...args: unknown[]) => mockPhotoDeleteMany(...args),
      createMany: (...args: unknown[]) => mockPhotoCreateMany(...args),
    },
    catalogItemFitment: {
      deleteMany: (...args: unknown[]) => mockFitmentDeleteMany(...args),
      createMany: (...args: unknown[]) => mockFitmentCreateMany(...args),
    },
    job: {
      create: (...args: unknown[]) => mockJobCreate(...args),
      findFirst: (...args: unknown[]) => mockJobFindFirst(...args),
    },
    $transaction: undefined as unknown,
  }
  prisma.$transaction = (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
  return { prisma }
})

vi.mock('../../lib/r2.js', () => ({
  uploadToR2: vi.fn().mockResolvedValue('https://r2.dev/catalog/vendor-1/image.jpg'),
}))

vi.mock('../../lib/imageProcessor.js', () => ({
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  processVariants: vi.fn(async () => ({
    thumb: Buffer.from('thumb'),
    small: Buffer.from('small'),
    medium: Buffer.from('medium'),
    large: Buffer.from('large'),
  })),
}))

const { uploadPartImage, createItem, uploadStandalonePartImage, getMyItems, getItem, updateItem, publishItem, toggleStock } = await import('./catalog.service.js')
const { uploadToR2 } = await import('../../lib/r2.js')

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
      expect(mockJobCreate).toHaveBeenCalledTimes(1)
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

  describe('createItem', () => {
    const validBody = {
      name: 'Alternateur 90A',
      condition: 'USED',
      price: 45000,
      commissionAmount: 3000,
      stockQuantity: 4,
      photos: [
        {
          urlOriginal: 'https://r2.dev/catalog/vendor-1/p.jpg',
          urlThumb: 'https://r2.dev/catalog/vendor-1/p_thumb.webp',
        },
      ],
      fitments: [{ brand: 'Toyota', model: 'Hilux', yearFrom: 2010, yearTo: 2015 }],
    }

    it('creates a published item with photos, fitments and auto-accepted commission', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({
        id: 'item-1',
        vendorId: 'vendor-1',
        status: 'PUBLISHED',
        inStock: true,
      })

      const result = await createItem('user-1', validBody)

      expect(result.status).toBe('PUBLISHED')
      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            vendorId: 'vendor-1',
            status: 'PUBLISHED',
            aiGenerated: false,
            commissionAmount: 3000,
            // Le vendeur fixe lui-même sa commission : acceptation immédiate.
            commissionAcceptedAt: expect.any(Date),
            stockQuantity: 4,
            inStock: true,
            imageOriginalUrl: 'https://r2.dev/catalog/vendor-1/p.jpg',
            imageThumbUrl: 'https://r2.dev/catalog/vendor-1/p_thumb.webp',
            photos: { create: [expect.objectContaining({ position: 0 })] },
            fitments: {
              create: [expect.objectContaining({ brand: 'Toyota', model: 'Hilux' })],
            },
          }),
        }),
      )
    })

    it('defaults commission to 0 and derives inStock=false from stockQuantity 0', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({ id: 'item-1', inStock: false })

      await createItem('user-1', { name: 'Filtre à huile', condition: 'NEW', stockQuantity: 0 })

      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ commissionAmount: 0, inStock: false }),
        }),
      )
    })

    it('enregistre la garantie choisie par le vendeur', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({ id: 'item-1', status: 'PUBLISHED' })

      await createItem('user-1', {
        ...validBody,
        category: 'Démarrage & charge / Alternateur',
        warrantyValue: 3,
        warrantyUnit: 'MONTH',
      })

      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ warrantyValue: 3, warrantyUnit: 'MONTH' }),
        }),
      )
    })

    it('accepte une garantie sur n’importe quelle pièce, consommables compris', async () => {
      // Contrat v1.2 art. 6 : aucune famille n'est exclue, le vendeur décide.
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({ id: 'item-1', status: 'PUBLISHED' })

      await createItem('user-1', {
        ...validBody,
        category: 'Filtration / Filtre à huile',
        warrantyValue: 6,
        warrantyUnit: 'MONTH',
      })

      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ warrantyValue: 6, warrantyUnit: 'MONTH' }),
        }),
      )
    })

    it('normalise une garantie sans unité à « sans garantie »', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      mockCatalogItemCreate.mockResolvedValueOnce({ id: 'item-1', status: 'PUBLISHED' })

      await createItem('user-1', { ...validBody, warrantyValue: 0, warrantyUnit: 'MONTH' })

      expect(mockCatalogItemCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ warrantyValue: null, warrantyUnit: null }),
        }),
      )
    })

    it('throws CATALOG_ITEM_INVALID on invalid body', async () => {
      await expect(createItem('user-1', { name: 'X', condition: 'USED' }))
        .rejects.toMatchObject({ code: 'CATALOG_ITEM_INVALID', statusCode: 422 })
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(createItem('user-1', validBody))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it('throws VENDOR_NOT_ACTIVE when vendor is pending', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'PENDING_ACTIVATION' })

      await expect(createItem('user-1', validBody))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_ACTIVE', statusCode: 403 })
    })
  })

  describe('uploadStandalonePartImage', () => {
    const validBuffer = Buffer.from('fake-image-data')

    it('uploads original + 4 variants and returns the URLs', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })

      const result = await uploadStandalonePartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg')

      expect(result.imageOriginalUrl).toBeTruthy()
      expect(result.imageThumbUrl).toBeTruthy()
      expect(result.imageLargeUrl).toBeTruthy()
      expect(uploadToR2).toHaveBeenCalledTimes(5)
    })

    it('throws VENDOR_NOT_FOUND when no vendor', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)

      await expect(uploadStandalonePartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it('throws VENDOR_NOT_ACTIVE when vendor is pending', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'PENDING_ACTIVATION' })

      await expect(uploadStandalonePartImage('user-1', validBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'VENDOR_NOT_ACTIVE', statusCode: 403 })
    })

    it('throws FILE_TOO_LARGE when file exceeds 5MB', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })
      const bigBuffer = Buffer.alloc(6 * 1024 * 1024)

      await expect(uploadStandalonePartImage('user-1', bigBuffer, 'photo.jpg', 'image/jpeg'))
        .rejects.toMatchObject({ code: 'FILE_TOO_LARGE', statusCode: 422 })
    })

    it('throws INVALID_FILE_TYPE for non-image files', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1', status: 'ACTIVE' })

      await expect(uploadStandalonePartImage('user-1', validBuffer, 'doc.pdf', 'application/pdf'))
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

    it('persists partSource when provided', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: null, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({ id: 'item-1', partSource: 'AFTERMARKET' })

      await updateItem('user-1', 'item-1', { partSource: 'AFTERMARKET' })

      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ partSource: 'AFTERMARKET' }) }),
      )
    })

    it('clears partSource when null is sent', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: null, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({ id: 'item-1', partSource: null })

      await updateItem('user-1', 'item-1', { partSource: null })

      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ partSource: null }) }),
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

    it('auto-accepts commission when the vendor sets the amount himself', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'DRAFT', price: null, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({ id: 'item-1', commissionAmount: 3000 })

      await updateItem('user-1', 'item-1', { commissionAmount: 3000 })

      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commissionAmount: 3000,
            commissionAcceptedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('replaces photos and fitments and derives legacy image fields', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'PUBLISHED', price: 5000, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({ id: 'item-1' })
      mockCatalogItemFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'item-1', photos: [], fitments: [],
      })

      const result = await updateItem('user-1', 'item-1', {
        photos: [
          {
            urlOriginal: 'https://r2.dev/catalog/vendor-1/new.jpg',
            urlThumb: 'https://r2.dev/catalog/vendor-1/new_thumb.webp',
          },
        ],
        fitments: [{ brand: 'Toyota', model: 'Hilux' }],
      })

      expect(result.id).toBe('item-1')
      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            imageOriginalUrl: 'https://r2.dev/catalog/vendor-1/new.jpg',
            imageThumbUrl: 'https://r2.dev/catalog/vendor-1/new_thumb.webp',
          }),
        }),
      )
      expect(mockPhotoDeleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 'item-1' } })
      expect(mockPhotoCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ catalogItemId: 'item-1', position: 0 })],
        }),
      )
      expect(mockFitmentDeleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 'item-1' } })
      expect(mockFitmentCreateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expect.objectContaining({ brand: 'Toyota', model: 'Hilux' })],
        }),
      )
    })

    it('clears photo rows and legacy image fields when an empty photo list is sent', async () => {
      mockVendorFindUnique.mockResolvedValueOnce({ id: 'vendor-1' })
      mockCatalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1', vendorId: 'vendor-1', status: 'PUBLISHED', price: 5000, priceUpdatedAt: null,
      })
      mockCatalogItemUpdate.mockResolvedValueOnce({ id: 'item-1' })
      mockCatalogItemFindUniqueOrThrow.mockResolvedValueOnce({
        id: 'item-1', photos: [], fitments: [],
      })

      await updateItem('user-1', 'item-1', { photos: [] })

      expect(mockCatalogItemUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ imageOriginalUrl: null, imageThumbUrl: null }),
        }),
      )
      expect(mockPhotoDeleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 'item-1' } })
      expect(mockPhotoCreateMany).not.toHaveBeenCalled()
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
        id: 'item-1',
        vendorId: 'vendor-1',
        status: 'DRAFT',
        price: 5000,
        condition: 'NEUF',
        warrantyValue: 6,
        warrantyUnit: 'MONTH',
        commissionAmount: 500,
        commissionAcceptedAt: new Date(),
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
