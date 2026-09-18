import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const catalogFindMany = vi.fn()
const fitmentFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    catalogItem: { findMany: (...a: unknown[]) => catalogFindMany(...a) },
    catalogItemFitment: { findMany: (...a: unknown[]) => fitmentFindMany(...a) },
    searchSynonym: { findMany: vi.fn().mockResolvedValue([]) },
  },
}))

const { compareParts } = await import('./browse.service.js')

// Deux offres pour la même réf OEM : la moins chère vient d'un vendeur mal noté
// sans garantie ; la plus chère d'un vendeur excellent avec garantie.
function offers() {
  return [
    {
      id: 'cheap',
      name: 'Plaquettes',
      category: 'Freinage',
      oemReference: 'OEM-1',
      condition: 'OCCASION_IMPORTEE',
      partSource: 'COMPATIBLE',
      price: 10_000,
      warrantyValue: 0,
      warrantyUnit: null,
      inStock: true,
      imageThumbUrl: null,
      vendor: { id: 'v1', shopName: 'Casse', aggregateRating: 20, ordersDelivered: 2 },
    },
    {
      id: 'quality',
      name: 'Plaquettes',
      category: 'Freinage',
      oemReference: 'OEM-1',
      condition: 'NEUF',
      partSource: 'OEM',
      price: 13_000,
      warrantyValue: 12,
      warrantyUnit: 'MONTH',
      inStock: true,
      imageThumbUrl: null,
      vendor: { id: 'v2', shopName: 'Bosch Pro', aggregateRating: 95, ordersDelivered: 80 },
    },
  ]
}

describe('browse/compareParts value scoring', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sorts by price by default (cheapest first) and still scores offers', async () => {
    catalogFindMany.mockResolvedValueOnce(offers())
    const { groups } = await compareParts({ oem: 'OEM-1' })
    expect(groups).toHaveLength(1)
    expect(groups[0]!.offers[0]!.id).toBe('cheap')
    // le score est toujours calculé pour l'affichage
    expect(groups[0]!.offers.every((o) => o.valueScore != null)).toBe(true)
  })

  it('sorts by value when requested — quality vendor can outrank the cheapest', async () => {
    catalogFindMany.mockResolvedValueOnce(offers())
    const { groups } = await compareParts({ oem: 'OEM-1', sort: 'value' })
    expect(groups[0]!.offers[0]!.id).toBe('quality')
    expect(groups[0]!.bestValueOfferId).toBe('quality')
  })

  it('remonte le stock local avant un import moins cher, quel que soit le tri', async () => {
    // Le moins cher est à importer, le plus cher est déjà à Abidjan.
    const [cheap, quality] = offers()
    catalogFindMany.mockResolvedValue([
      { ...cheap!, supplyMode: 'IMPORT' },
      { ...quality!, supplyMode: 'LOCAL' },
    ])

    const byPrice = await compareParts({ oem: 'OEM-1' })
    expect(byPrice.groups[0]!.offers.map((o) => o.id)).toEqual(['quality', 'cheap'])

    const byValue = await compareParts({ oem: 'OEM-1', sort: 'value' })
    expect(byValue.groups[0]!.offers.map((o) => o.id)).toEqual(['quality', 'cheap'])
  })
})

describe('compareParts — filtre motorisation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('restreint les fitments aux libellés qui correspondent à la motorisation', async () => {
    fitmentFindMany.mockResolvedValueOnce([
      { engine: '1.6 BlueHDi S&S 100cv' },
      { engine: '1.6 BlueHDi 120 cv' },
    ])
    catalogFindMany.mockResolvedValueOnce([])

    await compareParts({ brand: 'Peugeot', model: '308', year: 2015, engine: '1.6 BlueHDi 100 cv' })

    const where = catalogFindMany.mock.calls[0][0].where as {
      OR: Array<{ fitments?: { some: { AND: Record<string, unknown>[] } }; vehicleCompatibility?: unknown }>
    }
    const engineClause = where.OR[0].fitments!.some.AND.find((c) =>
      JSON.stringify(c).includes('engine'),
    ) as { OR: [{ engine: null }, { engine: { in: string[] } }] }

    expect(engineClause.OR[1].engine.in).toEqual(['1.6 BlueHDi S&S 100cv'])
    // Le repli texte legacy ne sait pas distinguer les motorisations : il sort.
    expect(where.OR.some((c) => c.vehicleCompatibility)).toBe(false)
  })

  it('garde le repli texte legacy quand aucune motorisation n’est demandée', async () => {
    catalogFindMany.mockResolvedValueOnce([])

    await compareParts({ brand: 'Peugeot', model: '308', year: 2015 })

    const where = catalogFindMany.mock.calls[0][0].where as {
      OR: Array<{ vehicleCompatibility?: unknown }>
    }
    expect(fitmentFindMany).not.toHaveBeenCalled()
    expect(where.OR.some((c) => c.vehicleCompatibility)).toBe(true)
  })
})
