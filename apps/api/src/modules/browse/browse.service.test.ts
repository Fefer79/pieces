import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockSearchSynonymFindMany = vi.fn()
const mockFitmentFindMany = vi.fn()

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
    catalogItemFitment: {
      findMany: (...args: unknown[]) => mockFitmentFindMany(...args),
    },
  },
}))

const { getBrands, getModels, getYears, getModelEngines, getCategories, browseParts, searchParts, suggestParts, decodeVin, parseConditions, parseSupplyMode, quoteImportOptions } = await import('./browse.service.js')

describe('browse.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getBrands', () => {
    it('returns list of brands', () => {
      const brands = getBrands()
      // Marques en MAJUSCULES (export depuis la base Global Auto).
      expect(brands).toContain('TOYOTA')
      expect(brands).toContain('PEUGEOT')
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

  describe('getModelEngines', () => {
    it('returns an engines array for a valid brand/model (case-insensitive)', () => {
      const engines = getModelEngines('toyota', 'corolla')
      expect(Array.isArray(engines)).toBe(true)
    })

    it('restreint les motorisations au millésime quand il est fourni', () => {
      const all = getModelEngines('toyota', 'corolla')
      const y2005 = getModelEngines('toyota', 'corolla', 2005)
      expect(y2005.length).toBeGreaterThan(0)
      expect(y2005.length).toBeLessThan(all.length)
      expect(all).toEqual(expect.arrayContaining(y2005))
    })

    it('throws BRAND_NOT_FOUND for invalid brand', () => {
      expect(() => getModelEngines('Invalid', 'Corolla')).toThrow()
    })

    it('throws MODEL_NOT_FOUND for invalid model', () => {
      expect(() => getModelEngines('Toyota', 'InvalidModel')).toThrow()
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

    it('filters STRICTLY by structured fitments (no legacy text fallback)', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([])
      mockCatalogItemCount.mockResolvedValueOnce(0)

      await browseParts({ brand: 'Toyota', model: 'Corolla', year: 2015 })

      const where = mockCatalogItemFindMany.mock.calls[0][0].where as Record<string, unknown>
      const and = where.AND as Record<string, unknown>[]
      const vehicleClause = and[0] as { OR: Record<string, unknown>[] }
      // Strict: fitments OR universal categories — never vehicleCompatibility text.
      const serialized = JSON.stringify(vehicleClause)
      expect(serialized).toContain('fitments')
      expect(serialized).not.toContain('vehicleCompatibility')
      expect(vehicleClause.OR.some((c) => 'category' in c)).toBe(true)
    })

    it('filters fitments on the engines matching the selected motorisation', async () => {
      mockFitmentFindMany.mockResolvedValueOnce([
        { engine: '1.6 BlueHDi S&S 100cv' },
        { engine: '1.6 BlueHDi 120 cv' },
        { engine: '2.0 BlueHDi 100 cv' },
        { engine: '1.6L 16V' },
      ])
      mockCatalogItemFindMany.mockResolvedValueOnce([])
      mockCatalogItemCount.mockResolvedValueOnce(0)

      await browseParts({ brand: 'Peugeot', model: '308', year: 2015, engine: '1.6 BlueHDi 100 cv' })

      const where = mockCatalogItemFindMany.mock.calls[0][0].where as Record<string, unknown>
      const and = where.AND as Record<string, unknown>[]
      const fitmentClause = (and[0] as { OR: Array<{ fitments?: { some: { AND: Record<string, unknown>[] } } }> })
        .OR.find((c) => c.fitments)!.fitments!.some
      const engineClause = fitmentClause.AND.find((c) => JSON.stringify(c).includes('engine')) as {
        OR: [{ engine: null }, { engine: { in: string[] } }]
      }

      // Cylindrée ET puissance doivent coïncider ; un libellé partiel « 1.6L 16V »
      // reste compatible ; un fitment sans moteur vaut « toutes motorisations ».
      expect(engineClause.OR[1].engine.in).toEqual(['1.6 BlueHDi S&S 100cv', '1.6L 16V'])
      expect(engineClause.OR[0]).toEqual({ engine: null })
    })

    it('does not query fitment engines when no motorisation is selected', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([])
      mockCatalogItemCount.mockResolvedValueOnce(0)

      await browseParts({ brand: 'Peugeot', model: '308', year: 2015 })

      expect(mockFitmentFindMany).not.toHaveBeenCalled()
      const where = mockCatalogItemFindMany.mock.calls[0][0].where as Record<string, unknown>
      expect(JSON.stringify(where)).not.toContain('engine')
    })

    it('adds a text clause on name/oemReference when q is provided', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([])
      mockCatalogItemCount.mockResolvedValueOnce(0)

      await browseParts({ brand: 'Toyota', q: 'plaquette' })

      const where = mockCatalogItemFindMany.mock.calls[0][0].where as Record<string, unknown>
      const and = where.AND as Record<string, unknown>[]
      expect(and).toHaveLength(2)
      expect(JSON.stringify(and[1])).toContain('plaquette')
    })
  })

  describe('suggestParts', () => {
    it('returns distinct part names matching the prefix', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { name: 'Plaquettes de frein avant Corolla' },
        { name: 'Plaquettes de frein arrière' },
      ])

      const result = await suggestParts('pla', { brand: 'Toyota', model: 'Corolla', year: 2015 })

      expect(result.suggestions).toHaveLength(2)
      const args = mockCatalogItemFindMany.mock.calls[0][0]
      expect(args.distinct).toEqual(['name'])
      // restricted to the vehicle
      expect(JSON.stringify(args.where)).toContain('fitments')
    })

    it('returns empty for queries shorter than 2 chars without hitting the DB', async () => {
      const result = await suggestParts('p')
      expect(result.suggestions).toEqual([])
      expect(mockCatalogItemFindMany).not.toHaveBeenCalled()
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
    it('returns decoded=false when neither NHTSA nor the WMI identify the make', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network'))

      const result = await decodeVin('ZZZ1234567AB12345')

      expect(result.decoded).toBe(false)
      expect(result.vin).toBe('ZZZ1234567AB12345')
      globalThis.fetch = originalFetch
    })

    it('returns decoded=false when NHTSA returns no results on an unknown WMI', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{}] }),
      })

      const result = await decodeVin('ZZZ1234567AB12345')

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

    it('resolves the engine from displacement and fuel', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          Results: [{ Make: 'TOYOTA', Model: 'Corolla', ModelYear: '2010', DisplacementL: '1.8', FuelTypePrimary: 'Gasoline' }],
        }),
      })

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.engines.length).toBeGreaterThan(0)
      expect(result.engines.every((e) => e.startsWith('1.8'))).toBe(true)
      globalThis.fetch = originalFetch
    })

    it('maps the NHTSA make onto the referential brand key', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: 'Land Rover', Model: '' }] }),
      })

      const result = await decodeVin('SALGA2AV1HA123456')

      expect(result.decoded).toBe(true)
      expect(result.make).toBe('LAND ROVER')
      globalThis.fetch = originalFetch
    })

    it('proposes the models of the year when NHTSA only returns the make', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: 'PEUGEOT', Model: '', ModelYear: '1987' }] }),
      })

      // 7e position « Z » (lettre) => cycle 2010+, code « H » => 2017.
      const result = await decodeVin('VF3CUHMZ6HY123456')

      expect(result.make).toBe('PEUGEOT')
      expect(result.year).toBe(2017)
      expect(result.model).toBeNull()
      expect(result.models).toContain('208')
      globalThis.fetch = originalFetch
    })

    it('falls back to the model list when NHTSA returns a model absent from the referential', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: 'PEUGEOT', Model: '505', ModelYear: '1987' }] }),
      })

      const result = await decodeVin('VF3CUHMZ6HY123456')

      expect(result.model).toBeNull()
      expect(result.models).toContain('3008')
      globalThis.fetch = originalFetch
    })

    it('keeps a model whose referential year list has holes', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: 'TOYOTA', Model: 'Prius', ModelYear: '2010' }] }),
      })

      // Le référentiel ne liste pas 2010 pour la Prius : le modèle reste retenu.
      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.model).toBe('Prius')
      expect(result.year).toBe(2010)
      globalThis.fetch = originalFetch
    })

    it('strips a NHTSA trim suffix to keep the referential model', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: 'TOYOTA', Model: 'Corolla Sedan', ModelYear: '2010' }] }),
      })

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.model).toBe('Corolla')
      globalThis.fetch = originalFetch
    })

    it('falls back to the WMI when NHTSA does not know the make', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ Results: [{ Make: '' }] }),
      })

      const result = await decodeVin('JN1BJ0RP5JW123456')

      expect(result.decoded).toBe(true)
      expect(result.make).toBe('NISSAN')
      expect(result.year).toBe(2018)
      globalThis.fetch = originalFetch
    })

    it('still identifies brand and year when NHTSA is unreachable', async () => {
      const originalFetch = globalThis.fetch
      globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error('network'))

      const result = await decodeVin('JTDKN3DU5A0123456')

      expect(result.decoded).toBe(true)
      expect(result.make).toBe('TOYOTA')
      expect(result.year).toBe(2010)
      expect(result.models.length).toBeGreaterThan(0)
      globalThis.fetch = originalFetch
    })
  })

  // -------------------------------------------------------------------------
  // Rubriques : état × disponibilité
  // -------------------------------------------------------------------------

  describe('filtrage par état et disponibilité', () => {
    function whereOf() {
      return (mockCatalogItemFindMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where
    }

    beforeEach(() => {
      mockCatalogItemFindMany.mockResolvedValue([])
      mockCatalogItemCount.mockResolvedValue(0)
    })

    it('« Neuf à importer » pose les DEUX axes dans la requête', async () => {
      await browseParts({ condition: ['NEW'], supplyMode: 'IMPORT' })
      const where = whereOf()
      expect(where.condition).toEqual({ in: ['NEW'] })
      expect(where.supplyMode).toBe('IMPORT')
    })

    it('« Occasion à importer » filtre bien sur USED, pas sur NEW', async () => {
      await browseParts({ condition: ['USED'], supplyMode: 'IMPORT' })
      expect(whereOf().condition).toEqual({ in: ['USED'] })
    })

    it('sans filtre, ni état ni disponibilité ne contraignent la requête', async () => {
      await browseParts({})
      const where = whereOf()
      expect(where.condition).toBeUndefined()
      expect(where.supplyMode).toBeUndefined()
    })

    it('accepte plusieurs états à la fois', async () => {
      await browseParts({ condition: ['NEW', 'REFURBISHED'] })
      expect(whereOf().condition).toEqual({ in: ['NEW', 'REFURBISHED'] })
    })

    it('garde les invariants de visibilité (publiée, en stock, vendeur actif)', async () => {
      await browseParts({ supplyMode: 'IMPORT' })
      const where = whereOf()
      expect(where.status).toBe('PUBLISHED')
      expect(where.inStock).toBe(true)
      expect(where.vendor).toEqual({ status: 'ACTIVE' })
    })
  })

  describe('parseConditions / parseSupplyMode', () => {
    it('ne retient que les états connus', () => {
      expect(parseConditions('NEW,USED')).toEqual(['NEW', 'USED'])
      expect(parseConditions('new')).toEqual(['NEW'])
      expect(parseConditions('NEW,BOGUS')).toEqual(['NEW'])
      expect(parseConditions('BOGUS')).toBeUndefined()
      expect(parseConditions('')).toBeUndefined()
      expect(parseConditions(undefined)).toBeUndefined()
    })

    it('ne retient que LOCAL et IMPORT', () => {
      expect(parseSupplyMode('IMPORT')).toBe('IMPORT')
      expect(parseSupplyMode('local')).toBe('LOCAL')
      expect(parseSupplyMode('BOGUS')).toBeUndefined()
      expect(parseSupplyMode(undefined)).toBeUndefined()
    })
  })

  describe('quoteImportOptions', () => {
    it('chiffre les trois acheminements du lot', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'imp-1', name: 'Moteur complet', category: 'Moteur / Moteur complet', weightKg: 140, price: 900_000, sourceCostFcfa: 450_000 },
      ])

      const result = await quoteImportOptions([{ catalogItemId: 'imp-1', quantity: 1 }])
      expect(result.options).toHaveLength(3)
      expect(result.items).toBe(1)
      expect(result.options.every((o) => o.freightFee > 0)).toBe(true)
    })

    it("assied la douane sur le coût d'achat, pas sur le prix public", async () => {
      const row = { id: 'imp-1', name: 'Moteur complet', category: 'Moteur / Moteur complet', weightKg: 140, price: 900_000 }
      mockCatalogItemFindMany.mockResolvedValueOnce([{ ...row, sourceCostFcfa: 450_000 }])
      const auCout = await quoteImportOptions([{ catalogItemId: 'imp-1', quantity: 1 }])

      // Même pièce sans coût renseigné : repli sur le prix public, douane plus élevée.
      mockCatalogItemFindMany.mockResolvedValueOnce([{ ...row, sourceCostFcfa: null }])
      const auPrix = await quoteImportOptions([{ catalogItemId: 'imp-1', quantity: 1 }])

      const eco = (o: { options: Array<{ mode: string; customsFee: number }> }) =>
        o.options.find((x) => x.mode === 'AIR_ECONOMY')!.customsFee
      expect(eco(auPrix)).toBeGreaterThan(eco(auCout))
    })

    it('ne demande que des pièces à importer et rien pour un lot vide', async () => {
      const empty = await quoteImportOptions([])
      expect(empty.options).toHaveLength(0)
      expect(mockCatalogItemFindMany).not.toHaveBeenCalled()
    })
  })

})
