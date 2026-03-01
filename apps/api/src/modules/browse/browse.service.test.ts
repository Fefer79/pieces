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
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
    },
    searchSynonym: {
      findMany: (...args: unknown[]) => mockSearchSynonymFindMany(...args),
    },
  },
}))

const { getBrands, getModels, getYears, getCategories, browseParts, searchParts, decodeVin } = await import('./browse.service.js')

describe('browse.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBrands', () => {
    it('returns list of brands', () => {
      const brands = getBrands()
      expect(brands).toContain('Toyota')
      expect(brands).toContain('Peugeot')
      expect(brands.length).toBeGreaterThan(5)
    })
  })

  describe('getModels', () => {
    it('returns models for a valid brand', () => {
      const models = getModels('Toyota')
      expect(models).toContain('Corolla')
      expect(models).toContain('Hilux')
    })

    it('throws BRAND_NOT_FOUND for invalid brand', () => {
      expect(() => getModels('InvalidBrand')).toThrow()
    })
  })

  describe('getYears', () => {
    it('returns years for a valid brand/model (most recent first)', () => {
      const years = getYears('Toyota', 'Corolla')
      expect(years.length).toBeGreaterThan(10)
      expect(years[0]).toBeGreaterThan(years[years.length - 1])
    })

    it('throws BRAND_NOT_FOUND for invalid brand', () => {
      expect(() => getYears('Invalid', 'Corolla')).toThrow()
    })

    it('throws MODEL_NOT_FOUND for invalid model', () => {
      expect(() => getYears('Toyota', 'InvalidModel')).toThrow()
    })
  })

  describe('getCategories', () => {
    it('returns list of categories', () => {
      const categories = getCategories()
      expect(categories).toContain('Freinage')
      expect(categories).toContain('Filtration')
    })
  })

  describe('browseParts', () => {
    it('returns paginated results', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', price: 5000, vendor: { shopName: 'Shop 1' } },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const result = await browseParts({ brand: 'Toyota' })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })
  })

  describe('searchParts', () => {
    it('applies synonym correction and returns results', async () => {
      mockSearchSynonymFindMany.mockResolvedValueOnce([
        { typo: 'uile', correction: 'huile' },
      ])
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre à huile', price: 3000, vendor: { shopName: 'Shop 1' } },
      ])
      mockCatalogItemCount.mockResolvedValueOnce(1)

      const result = await searchParts('filtre a uile')

      expect(result.query).toBe('filtre a huile')
      expect(result.items).toHaveLength(1)
    })

    it('returns empty results when no matches', async () => {
      mockSearchSynonymFindMany.mockResolvedValueOnce([])
      mockCatalogItemFindMany.mockResolvedValueOnce([])
      mockCatalogItemCount.mockResolvedValueOnce(0)

      const result = await searchParts('nonexistent')

      expect(result.items).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  describe('decodeVin', () => {
    it('returns decoded=false when NHTSA fetch fails', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network'))

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.decoded).toBe(false)
      expect(result.vin).toBe('JTDKN3DU5A0123456')
      globalThis.fetch = originalFetch
    })

    it('returns decoded=false when NHTSA returns no results', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{}] }),
      })

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.decoded).toBe(false)
      globalThis.fetch = originalFetch
    })

    it('returns decoded vehicle when NHTSA returns data', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          Results: [{ Make: 'TOYOTA', Model: 'Corolla', ModelYear: '2010' }],
        }),
      })

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.decoded).toBe(true)
      expect(result.make).toBe('TOYOTA')
      expect(result.model).toBe('Corolla')
      expect(result.year).toBe(2010)
      globalThis.fetch = originalFetch
    })
  })
})
