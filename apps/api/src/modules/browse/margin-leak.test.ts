/**
 * Garde-fou : la marge d'import ne doit JAMAIS sortir de l'API.
 *
 * Le prix affiché d'une pièce à importer inclut une marge de 100 % sur le coût
 * d'achat chez le partenaire. Ce coût est stocké (`CatalogItem.sourceCostFcfa`,
 * `OrderItem.sourceCostSnapshot`) parce que la finance en a besoin, mais un
 * `select` élargi ou un `include: { items: true }` ajouté par mégarde le
 * publierait dans l'onglet réseau du navigateur.
 *
 * Deux filets, parce qu'ils n'attrapent pas la même erreur :
 *  1. les champs demandés à Prisma sur les chemins publics ;
 *  2. la charge utile réellement renvoyée, quand la base rend les champs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCatalogItemFindMany = vi.fn()
const mockCatalogItemFindFirst = vi.fn()
const mockCatalogItemCount = vi.fn()
const mockSellerReviewCount = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockCurrentTier = vi.fn()
const mockOrderItemFindMany = vi.fn()

vi.mock('../enterprise/subscription.service.js', () => ({
  currentTier: (...args: unknown[]) => mockCurrentTier(...args),
}))

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
      findFirst: (...args: unknown[]) => mockCatalogItemFindFirst(...args),
      count: (...args: unknown[]) => mockCatalogItemCount(...args),
    },
    sellerReview: { count: (...args: unknown[]) => mockSellerReviewCount(...args) },
    searchSynonym: { findMany: vi.fn().mockResolvedValue([]) },
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderItem: { deleteMany: vi.fn(), findMany: (...args: unknown[]) => mockOrderItemFindMany(...args) },
    orderEvent: { deleteMany: vi.fn() },
    vehicle: { findUnique: vi.fn() },
    enterpriseMember: { findUnique: vi.fn() },
    vendor: { findFirst: vi.fn() },
  },
}))

const { browseParts, getPublicItemDetail } = await import('./browse.service.js')
const { getOrderByShareToken } = await import('../order/order.service.js')

/** Tout ce qui trahirait le coût d'achat ou le taux de marge. */
const FORBIDDEN = ['sourceCost', 'source_cost', 'importMargin', 'import_margin']

function findForbidden(value: unknown, path = '$'): string[] {
  if (value === null || typeof value !== 'object') return []
  const hits: string[] = []
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      hits.push(`${path}.${key}`)
    }
    hits.push(...findForbidden(child, `${path}.${key}`))
  }
  return hits
}

/** Une pièce telle que la base la rendrait si le `select` était trop large. */
const LEAKY_ITEM = {
  id: 'imp-1',
  name: 'Moteur complet',
  category: 'Moteur / Moteur complet',
  condition: 'USED',
  partSource: 'OEM',
  supplyMode: 'IMPORT',
  originCountry: 'DE',
  supplierLeadDays: 4,
  price: 900_000,
  sourceCostAmount: 686.0,
  sourceCostCurrency: 'EUR',
  sourceCostFcfa: 450_000,
  importMarginPct: 100,
  imageThumbUrl: null,
  imageMediumUrl: null,
  imageOriginalUrl: null,
  oemReference: 'OEM-1',
  vehicleCompatibility: null,
  vendor: { id: 'v-de', shopName: 'Partenaire DE-04' },
}

describe('aucune fuite de marge sur les chemins publics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTier.mockResolvedValue('FREE')
    mockSellerReviewCount.mockResolvedValue(0)
    mockOrderItemFindMany.mockResolvedValue([])
  })

  it('la liste ne demande à Prisma aucun champ de coût', async () => {
    mockCatalogItemFindMany.mockResolvedValueOnce([])
    mockCatalogItemCount.mockResolvedValueOnce(0)

    await browseParts({ supplyMode: 'IMPORT' })

    const args = mockCatalogItemFindMany.mock.calls[0]![0]
    expect(findForbidden(args)).toEqual([])
  })

  it('la fiche produit ne demande à Prisma aucun champ de coût', async () => {
    mockCatalogItemFindFirst.mockResolvedValueOnce({
      ...LEAKY_ITEM,
      warrantyValue: null,
      warrantyUnit: null,
      inStock: true,
      isUniversallyCompatible: false,
      imageSmallUrl: null,
      imageLargeUrl: null,
      vendor: { id: 'v-de', shopName: 'Partenaire DE-04', aggregateRating: null, avgReviewRating: null, ordersDelivered: 0 },
      photos: [],
      fitments: [],
    })

    await getPublicItemDetail('imp-1')

    const args = mockCatalogItemFindFirst.mock.calls[0]![0]
    expect(findForbidden(args)).toEqual([])
  })

  it('la commande partagée ne demande pas le coût figé sur ses lignes', async () => {
    mockOrderFindUnique.mockResolvedValueOnce({
      id: 'o1',
      status: 'DRAFT',
      orderType: 'IMPORT_PREORDER',
      totalAmount: 900_000,
      deliveryFee: 2_900,
      deliveryCommune: 'Cocody',
      enterpriseId: null,
      logisticsMode: 'AIR_ECONOMY',
      items: [
        {
          id: 'oi-1',
          vendorId: 'v-de',
          name: 'Moteur complet',
          category: 'Moteur / Moteur complet',
          priceSnapshot: 900_000,
          quantity: 1,
          supplyMode: 'IMPORT',
        },
      ],
      initiator: { id: 'u1', phone: '+2250700000000' },
    })

    const order = await getOrderByShareToken('a'.repeat(32))

    const args = mockOrderFindUnique.mock.calls[0]![0]
    expect(findForbidden(args)).toEqual([])
    expect(findForbidden(order)).toEqual([])
  })

  it("le devis d'import ne renvoie ni le coût ni la base douanière", async () => {
    const { quoteImportOptions } = await import('./browse.service.js')
    mockCatalogItemFindMany.mockResolvedValueOnce([
      { id: 'imp-1', name: 'Moteur complet', category: 'Moteur / Moteur complet', weightKg: 140, price: 900_000, sourceCostFcfa: 450_000 },
    ])

    const result = await quoteImportOptions([{ catalogItemId: 'imp-1', quantity: 1 }])

    expect(findForbidden(result)).toEqual([])
    expect(JSON.stringify(result)).not.toContain('450000')
  })

  it('le détecteur attrape bien une fuite (test du test)', () => {
    expect(findForbidden({ data: { items: [{ sourceCostFcfa: 450_000 }] } })).toEqual([
      '$.data.items.0.sourceCostFcfa',
    ])
    expect(findForbidden({ select: { importMarginPct: true } })).toEqual(['$.select.importMarginPct'])
  })
})
