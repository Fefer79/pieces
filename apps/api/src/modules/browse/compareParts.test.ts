import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const catalogFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    catalogItem: { findMany: (...a: unknown[]) => catalogFindMany(...a) },
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
      warrantyMonths: 0,
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
      warrantyMonths: 12,
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
})
