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
const mockDisputeCount = vi.fn()
const mockCatalogFindMany = vi.fn()
const mockCatalogCount = vi.fn()
const mockCatalogGroupBy = vi.fn()

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
    },
  },
}))

const {
  getUserOrderHistory,
  getAdminDashboardStats,
  getEnterpriseMembers,
  getAdminExternalImports,
  getAdminExternalImportStats,
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
