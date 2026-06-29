import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockOrderFindMany = vi.fn()
const mockOrderCount = vi.fn()
const mockUserCount = vi.fn()
const mockUserFindUnique = vi.fn()
const mockVendorCount = vi.fn()
const mockVendorFindMany = vi.fn()
const mockVendorFindUnique = vi.fn()
const mockVendorUpdate = vi.fn()
const mockDisputeCount = vi.fn()
const mockFitmentDeleteMany = vi.fn()
const mockFitmentCreateMany = vi.fn()
const mockFitmentFindMany = vi.fn()
const mockCatalogFindMany = vi.fn()
const mockCatalogCount = vi.fn()
const mockCatalogGroupBy = vi.fn()
const mockCatalogFindUnique = vi.fn()
const mockCatalogUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    vendor: {
      count: (...args: unknown[]) => mockVendorCount(...args),
      findMany: (...args: unknown[]) => mockVendorFindMany(...args),
      findUnique: (...args: unknown[]) => mockVendorFindUnique(...args),
      update: (...args: unknown[]) => mockVendorUpdate(...args),
    },
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      count: (...args: unknown[]) => mockOrderCount(...args),
    },
    dispute: {
      count: (...args: unknown[]) => mockDisputeCount(...args),
    },
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogFindMany(...args),
      count: (...args: unknown[]) => mockCatalogCount(...args),
      groupBy: (...args: unknown[]) => mockCatalogGroupBy(...args),
      findUnique: (...args: unknown[]) => mockCatalogFindUnique(...args),
      update: (...args: unknown[]) => mockCatalogUpdate(...args),
    },
    catalogItemFitment: {
      deleteMany: (...args: unknown[]) => mockFitmentDeleteMany(...args),
      createMany: (...args: unknown[]) => mockFitmentCreateMany(...args),
      findMany: (...args: unknown[]) => mockFitmentFindMany(...args),
    },
    $transaction: (fn: (tx: unknown) => unknown) =>
      fn({
        catalogItemFitment: {
          deleteMany: (...args: unknown[]) => mockFitmentDeleteMany(...args),
          createMany: (...args: unknown[]) => mockFitmentCreateMany(...args),
          findMany: (...args: unknown[]) => mockFitmentFindMany(...args),
        },
      }),
  },
}))

const {
  getUserOrderHistory,
  getAdminDashboardStats,
  getEnterpriseMembers,
  getAdminExternalImports,
  getAdminExternalImportStats,
  getAdminCatalogItem,
  updateAdminCatalogItem,
  replaceAdminFitments,
  updateAdminVendor,
  getAdminCatalogList,
  getAdminCatalogSuggest,
  getAdminEntitySuggest,
} = await import('./admin.service.js')

describe('admin.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getUserOrderHistory', () => {
    it('returns paginated order history', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { id: 'o1', status: 'COMPLETED', items: [], delivery: null },
      ])
      mockOrderCount.mockResolvedValueOnce(1)

      const result = await getUserOrderHistory('user-1', 1, 20)
      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('returns empty for user with no orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([])
      mockOrderCount.mockResolvedValueOnce(0)

      const result = await getUserOrderHistory('user-2')
      expect(result.orders).toHaveLength(0)
      expect(result.totalPages).toBe(0)
    })
  })

  describe('getAdminDashboardStats', () => {
    it('returns dashboard statistics', async () => {
      mockUserCount.mockResolvedValueOnce(100)
      mockVendorCount.mockResolvedValueOnce(25)
      mockOrderCount.mockResolvedValueOnce(500)
      mockOrderCount.mockResolvedValueOnce(50)
      mockDisputeCount.mockResolvedValueOnce(10)
      mockDisputeCount.mockResolvedValueOnce(3)

      const stats = await getAdminDashboardStats()
      expect(stats.totalUsers).toBe(100)
      expect(stats.totalVendors).toBe(25)
      expect(stats.totalOrders).toBe(500)
      expect(stats.activeOrders).toBe(50)
      expect(stats.openDisputes).toBe(3)
    })
  })

  describe('getEnterpriseMembers', () => {
    it('returns empty for non-enterprise user', async () => {
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['MECHANIC'] })

      const result = await getEnterpriseMembers('user-1')
      expect(result.members).toHaveLength(0)
    })

    it('returns empty placeholder for enterprise user', async () => {
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['ENTERPRISE'] })

      const result = await getEnterpriseMembers('user-1')
      expect(result.members).toHaveLength(0)
    })
  })

  describe('getAdminCatalogList', () => {
    it('searches across name, vendor and fitments when q is provided', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminCatalogList({ q: 'toyota' })

      const where = mockCatalogFindMany.mock.calls[0][0].where
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { name: { contains: 'toyota', mode: 'insensitive' } },
          { vendor: { shopName: { contains: 'toyota', mode: 'insensitive' } } },
          {
            fitments: {
              some: {
                OR: [
                  { brand: { contains: 'toyota', mode: 'insensitive' } },
                  { model: { contains: 'toyota', mode: 'insensitive' } },
                ],
              },
            },
          },
        ]),
      )
    })
  })

  describe('getAdminCatalogSuggest', () => {
    it('returns [] for terms shorter than 2 chars without querying', async () => {
      const result = await getAdminCatalogSuggest('a')
      expect(result.suggestions).toEqual([])
      expect(mockCatalogFindMany).not.toHaveBeenCalled()
      expect(mockVendorFindMany).not.toHaveBeenCalled()
    })

    it('groups suggestions by part, brand and vendor', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([{ name: 'Plaquettes de frein' }])
      mockFitmentFindMany.mockResolvedValueOnce([{ brand: 'Toyota' }])
      mockVendorFindMany.mockResolvedValueOnce([{ shopName: 'Casse Yopougon' }])

      const result = await getAdminCatalogSuggest('to')

      expect(result.suggestions).toEqual([
        { type: 'part', label: 'Plaquettes de frein' },
        { type: 'brand', label: 'Toyota' },
        { type: 'vendor', label: 'Casse Yopougon' },
      ])
    })
  })

  describe('getAdminEntitySuggest', () => {
    it('returns [] for terms shorter than 2 chars without querying', async () => {
      const result = await getAdminEntitySuggest('vendors', 'a')
      expect(result.suggestions).toEqual([])
      expect(mockVendorFindMany).not.toHaveBeenCalled()
    })

    it('suggests vendor shop names', async () => {
      mockVendorFindMany.mockResolvedValueOnce([{ shopName: 'Casse Yopougon' }])
      const result = await getAdminEntitySuggest('vendors', 'yop')
      expect(result.suggestions).toEqual([{ label: 'Casse Yopougon' }])
    })

    it('suggests external-import names scoped to externalSource not null', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([{ name: 'Filtre à huile' }])
      const result = await getAdminEntitySuggest('external-imports', 'fil')
      expect(result.suggestions).toEqual([{ label: 'Filtre à huile' }])
      expect(mockCatalogFindMany.mock.calls[0][0].where.externalSource).toEqual({ not: null })
    })
  })

  describe('getAdminExternalImports', () => {
    it('defaults to externalSource not null when source filter omitted', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminExternalImports({})

      const args = mockCatalogFindMany.mock.calls[0][0]
      expect(args.where.externalSource).toEqual({ not: null })
    })

    it('applies exact source filter when provided', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminExternalImports({ source: 'HAUTOPARTS_3H' })

      const args = mockCatalogFindMany.mock.calls[0][0]
      expect(args.where.externalSource).toBe('HAUTOPARTS_3H')
    })

    it('hasOem=true filters oemReference not null', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminExternalImports({ hasOem: 'true' })

      const args = mockCatalogFindMany.mock.calls[0][0]
      expect(args.where.oemReference).toEqual({ not: null })
    })

    it('hasOem=false filters oemReference null', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminExternalImports({ hasOem: 'false' })

      const args = mockCatalogFindMany.mock.calls[0][0]
      expect(args.where.oemReference).toBeNull()
    })

    it('q searches across name, category, oemReference, externalSourceId', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([])
      mockCatalogCount.mockResolvedValueOnce(0)

      await getAdminExternalImports({ q: 'plaquette' })

      const args = mockCatalogFindMany.mock.calls[0][0]
      expect(args.where.OR).toHaveLength(4)
      expect(args.where.OR[0]).toEqual({ name: { contains: 'plaquette', mode: 'insensitive' } })
      expect(args.where.OR[3]).toEqual({ externalSourceId: { contains: 'plaquette', mode: 'insensitive' } })
    })

    it('returns paginated payload shape', async () => {
      mockCatalogFindMany.mockResolvedValueOnce([
        { id: 'c1', name: 'item', vendor: { id: 'v1', shopName: '3H', isExternal: true } },
      ])
      mockCatalogCount.mockResolvedValueOnce(1)

      const result = await getAdminExternalImports({ page: 1, limit: 50 })
      expect(result.items).toHaveLength(1)
      expect(result.pagination).toEqual({ page: 1, limit: 50, total: 1, totalPages: 1 })
    })
  })

  describe('getAdminCatalogItem', () => {
    it('returns the item with vendor, photos and fitments', async () => {
      const item = {
        id: 'c1', name: 'Plaquette', vendor: { id: 'v1', shopName: 'Global Auto', isExternal: true },
        photos: [], fitments: [],
      }
      mockCatalogFindUnique.mockResolvedValueOnce(item)

      const result = await getAdminCatalogItem('c1')
      expect(result).toBe(item)
      const args = mockCatalogFindUnique.mock.calls[0][0]
      expect(args.where).toEqual({ id: 'c1' })
      expect(args.include.vendor.select).toMatchObject({ shopName: true, isExternal: true })
    })

    it('throws 404 when the item does not exist', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce(null)
      await expect(getAdminCatalogItem('missing')).rejects.toMatchObject({ statusCode: 404 })
    })
  })

  describe('updateAdminCatalogItem', () => {
    it('updates only provided fields and stamps priceUpdatedAt when price changes', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce({ id: 'c1' }) // existence check
      mockCatalogUpdate.mockResolvedValueOnce({ id: 'c1' })
      mockCatalogFindUnique.mockResolvedValueOnce({ id: 'c1', price: 5000 }) // reload

      await updateAdminCatalogItem('c1', { price: 5000, status: 'PUBLISHED' })

      const args = mockCatalogUpdate.mock.calls[0][0]
      expect(args.where).toEqual({ id: 'c1' })
      expect(args.data.price).toBe(5000)
      expect(args.data.status).toBe('PUBLISHED')
      expect(args.data.priceUpdatedAt).toBeInstanceOf(Date)
      expect(args.data).not.toHaveProperty('name')
    })

    it('throws 404 when updating a missing item', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce(null)
      await expect(updateAdminCatalogItem('missing', { status: 'ARCHIVED' })).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockCatalogUpdate).not.toHaveBeenCalled()
    })
  })

  describe('replaceAdminFitments', () => {
    it('wipes then recreates fitments and returns the fresh list', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce({ id: 'c1' }) // existence check
      const fresh = [{ id: 'f1', brand: 'Toyota', model: 'Corolla' }]
      mockFitmentFindMany.mockResolvedValueOnce(fresh)

      const result = await replaceAdminFitments('c1', [
        { brand: 'Toyota', model: 'Corolla', yearFrom: 2015, yearTo: 2020, engine: null },
      ])

      expect(mockFitmentDeleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 'c1' } })
      const createArgs = mockFitmentCreateMany.mock.calls[0][0]
      expect(createArgs.data[0]).toMatchObject({ catalogItemId: 'c1', brand: 'Toyota', yearFrom: 2015 })
      expect(result).toBe(fresh)
    })

    it('clears fitments without inserting when given an empty list', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce({ id: 'c1' })
      mockFitmentFindMany.mockResolvedValueOnce([])

      await replaceAdminFitments('c1', [])

      expect(mockFitmentDeleteMany).toHaveBeenCalledWith({ where: { catalogItemId: 'c1' } })
      expect(mockFitmentCreateMany).not.toHaveBeenCalled()
    })

    it('throws 404 when the item does not exist', async () => {
      mockCatalogFindUnique.mockResolvedValueOnce(null)
      await expect(replaceAdminFitments('missing', [])).rejects.toMatchObject({ statusCode: 404 })
      expect(mockFitmentDeleteMany).not.toHaveBeenCalled()
    })
  })

  describe('updateAdminVendor', () => {
    it('throws 404 when the vendor does not exist', async () => {
      mockVendorFindUnique.mockResolvedValueOnce(null)
      await expect(
        updateAdminVendor('missing', { contactName: 'Awa', phone: '+2250700000000' }),
      ).rejects.toMatchObject({ statusCode: 404 })
      expect(mockVendorUpdate).not.toHaveBeenCalled()
    })
  })

  describe('getAdminExternalImportStats', () => {
    it('aggregates per-source counters with withOem computed', async () => {
      mockCatalogGroupBy
        .mockResolvedValueOnce([
          {
            externalSource: 'HAUTOPARTS_3H',
            _count: { _all: 100 },
            _max: { updatedAt: new Date('2026-05-28T14:00:00Z') },
          },
        ])
        .mockResolvedValueOnce([
          { externalSource: 'HAUTOPARTS_3H', _count: { _all: 60 } },
        ])

      const result = await getAdminExternalImportStats()
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0]).toMatchObject({
        source: 'HAUTOPARTS_3H',
        total: 100,
        withOem: 60,
        withoutOem: 40,
      })
      expect(result.sources[0].lastImportAt).toBeInstanceOf(Date)
    })

    it('handles sources with zero OEM coverage', async () => {
      mockCatalogGroupBy
        .mockResolvedValueOnce([
          {
            externalSource: 'MAPA_CI',
            _count: { _all: 50 },
            _max: { updatedAt: new Date() },
          },
        ])
        .mockResolvedValueOnce([])

      const result = await getAdminExternalImportStats()
      expect(result.sources[0]).toMatchObject({ source: 'MAPA_CI', total: 50, withOem: 0, withoutOem: 50 })
    })

    it('returns empty array when no external sources present', async () => {
      mockCatalogGroupBy.mockResolvedValueOnce([]).mockResolvedValueOnce([])
      const result = await getAdminExternalImportStats()
      expect(result.sources).toEqual([])
    })
  })
})
