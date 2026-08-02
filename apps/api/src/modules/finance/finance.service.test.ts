import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockOrderAggregate = vi.fn()
const mockOrderFindMany = vi.fn()
const mockOrderItemAggregate = vi.fn()
const mockOrderItemFindMany = vi.fn()
const mockEscrowAggregate = vi.fn()
const mockEscrowFindMany = vi.fn()
const mockVendorFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: {
      aggregate: (...a: unknown[]) => mockOrderAggregate(...a),
      findMany: (...a: unknown[]) => mockOrderFindMany(...a),
    },
    orderItem: {
      aggregate: (...a: unknown[]) => mockOrderItemAggregate(...a),
      findMany: (...a: unknown[]) => mockOrderItemFindMany(...a),
    },
    escrowTransaction: {
      aggregate: (...a: unknown[]) => mockEscrowAggregate(...a),
      findMany: (...a: unknown[]) => mockEscrowFindMany(...a),
    },
    vendor: { findMany: (...a: unknown[]) => mockVendorFindMany(...a) },
  },
}))

const {
  currentPeriode,
  periodeBounds,
  toCsv,
  getFinanceOverview,
  getFinanceMonthly,
  listFinanceVendors,
  exportCommandesCsv,
  exportCommissionsCsv,
  exportEscrowCsv,
} = await import('./finance.service.js')

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------------

describe('periodeBounds / currentPeriode', () => {
  it('borne la période en UTC', () => {
    const { start, end } = periodeBounds('2026-08')
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('gère le passage d’année', () => {
    const { start, end } = periodeBounds('2026-12')
    expect(start.toISOString()).toBe('2026-12-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2027-01-01T00:00:00.000Z')
  })

  it('currentPeriode formate en YYYY-MM', () => {
    expect(currentPeriode(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08')
  })
})

// ---------------------------------------------------------------------------
// Validation des paramètres
// ---------------------------------------------------------------------------

describe('validation', () => {
  it('rejette une période mal formée (400 FINANCE_INVALID_QUERY)', async () => {
    await expect(getFinanceOverview({ periode: '2026-13' })).rejects.toMatchObject({
      code: 'FINANCE_INVALID_QUERY',
      statusCode: 400,
    })
    expect(mockOrderAggregate).not.toHaveBeenCalled()
  })

  it('rejette un export sans période', async () => {
    await expect(exportCommandesCsv({})).rejects.toMatchObject({
      code: 'FINANCE_INVALID_QUERY',
      statusCode: 400,
    })
    expect(mockOrderFindMany).not.toHaveBeenCalled()
  })

  it('rejette des paramètres hors bornes', async () => {
    await expect(getFinanceMonthly({ months: 0 })).rejects.toMatchObject({
      code: 'FINANCE_INVALID_QUERY',
    })
    await expect(listFinanceVendors({ page: 0 })).rejects.toMatchObject({
      code: 'FINANCE_INVALID_QUERY',
    })
  })
})

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

describe('getFinanceOverview', () => {
  it('agrège la période et calcule la variation vs mois précédent', async () => {
    mockOrderAggregate
      .mockResolvedValueOnce({
        _sum: { totalAmount: 1_200_000, deliveryFee: 60_000, laborCost: 90_000 },
        _count: { _all: 12 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 1_000_000 }, _count: { _all: 10 } })
    mockOrderItemAggregate
      .mockResolvedValueOnce({ _sum: { commissionAmount: 120_000 } })
      .mockResolvedValueOnce({ _sum: { commissionAmount: 100_000 } })
    mockEscrowAggregate
      .mockResolvedValueOnce({ _sum: { amount: 450_000 } })
      .mockResolvedValueOnce({ _sum: { amount: 300_000 } })

    const result = await getFinanceOverview({ periode: '2026-08' })

    expect(result).toMatchObject({
      periode: '2026-08',
      gmv: 1_200_000,
      commissions: 120_000,
      fraisLivraison: 60_000,
      mainOeuvre: 90_000,
      commandes: 12,
      panierMoyen: 100_000,
      escrowBloque: 450_000,
      escrowLibere: 300_000,
      variation: { gmv: 20, commissions: 20 },
    })
    // Filtre « commandes terminées » : statut COMPLETED, bornes UTC sur createdAt.
    expect(mockOrderAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
      }),
    )
  })

  it('agrégats null → 0, variation null quand la base est nulle', async () => {
    mockOrderAggregate
      .mockResolvedValueOnce({
        _sum: { totalAmount: null, deliveryFee: null, laborCost: null },
        _count: { _all: 0 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: null }, _count: { _all: 0 } })
    mockOrderItemAggregate
      .mockResolvedValueOnce({ _sum: { commissionAmount: null } })
      .mockResolvedValueOnce({ _sum: { commissionAmount: null } })
    mockEscrowAggregate
      .mockResolvedValueOnce({ _sum: { amount: null } })
      .mockResolvedValueOnce({ _sum: { amount: null } })

    const result = await getFinanceOverview({ periode: '2026-08' })

    expect(result).toMatchObject({
      gmv: 0,
      commissions: 0,
      fraisLivraison: 0,
      mainOeuvre: 0,
      commandes: 0,
      panierMoyen: 0,
      escrowBloque: 0,
      escrowLibere: 0,
      variation: { gmv: null, commissions: null },
    })
  })

  it('variation négative quand la période recule', async () => {
    mockOrderAggregate
      .mockResolvedValueOnce({
        _sum: { totalAmount: 500_000, deliveryFee: 0, laborCost: null },
        _count: { _all: 5 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 1_000_000 }, _count: { _all: 8 } })
    mockOrderItemAggregate
      .mockResolvedValueOnce({ _sum: { commissionAmount: 50_000 } })
      .mockResolvedValueOnce({ _sum: { commissionAmount: 200_000 } })
    mockEscrowAggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } })

    const result = await getFinanceOverview({ periode: '2026-08' })

    expect(result.variation).toEqual({ gmv: -50, commissions: -75 })
  })
})

// ---------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------

describe('getFinanceMonthly', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('produit des buckets ordonnés et range les commandes au bon mois', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'))

    mockOrderFindMany.mockResolvedValueOnce([
      {
        totalAmount: 100_000,
        createdAt: new Date('2026-06-10T08:00:00Z'),
        items: [{ commissionAmount: 10_000 }],
      },
      {
        totalAmount: 200_000,
        createdAt: new Date('2026-08-02T08:00:00Z'),
        items: [{ commissionAmount: 20_000 }, { commissionAmount: 5_000 }],
      },
      // Hors fenêtre (avant le premier bucket) : ignoré.
      { totalAmount: 50_000, createdAt: new Date('2026-05-31T23:00:00Z'), items: [] },
    ])

    const result = await getFinanceMonthly({ months: 3 })

    expect(result.buckets.map((b) => b.periode)).toEqual(['2026-06', '2026-07', '2026-08'])
    expect(result.buckets[0]).toMatchObject({ gmv: 100_000, commissions: 10_000, orders: 1 })
    expect(result.buckets[1]).toMatchObject({ gmv: 0, commissions: 0, orders: 0 })
    expect(result.buckets[2]).toMatchObject({ gmv: 200_000, commissions: 25_000, orders: 1 })
  })

  it('défaut à 12 mois glissants', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T12:00:00Z'))
    mockOrderFindMany.mockResolvedValueOnce([])

    const result = await getFinanceMonthly({})

    expect(result.buckets).toHaveLength(12)
    expect(result.buckets[0]?.periode).toBe('2025-09')
    expect(result.buckets[11]?.periode).toBe('2026-08')
  })
})

// ---------------------------------------------------------------------------
// Vendeurs
// ---------------------------------------------------------------------------

describe('listFinanceVendors', () => {
  const ITEMS = [
    { vendorId: 'v1', orderId: 'o1', priceSnapshot: 50_000, commissionAmount: 5_000 },
    { vendorId: 'v1', orderId: 'o1', priceSnapshot: 20_000, commissionAmount: 2_000 },
    { vendorId: 'v1', orderId: 'o2', priceSnapshot: 30_000, commissionAmount: 3_000 },
    { vendorId: 'v2', orderId: 'o2', priceSnapshot: 60_000, commissionAmount: 9_000 },
  ]

  it('agrège par vendeur, trie par commissions décroissantes', async () => {
    mockOrderItemFindMany.mockResolvedValueOnce(ITEMS)
    mockVendorFindMany.mockResolvedValueOnce([
      { id: 'v1', shopName: 'Auto Pièces Yopougon', phone: '+2250700000001' },
      { id: 'v2', shopName: 'Garage Plateau', phone: '+2250700000002' },
    ])
    mockEscrowAggregate.mockResolvedValue({ _sum: { amount: 0 } })

    const result = await listFinanceVendors({ periode: '2026-08' })

    expect(result.total).toBe(2)
    expect(result.vendors.map((v) => v.vendorId)).toEqual(['v1', 'v2'])
    expect(result.vendors[0]).toMatchObject({
      shopName: 'Auto Pièces Yopougon',
      phone: '+2250700000001',
      commandes: 2, // o1 et o2 — les lignes d’une même commande comptent une fois
      gmv: 100_000,
      commissions: 10_000,
      escrowEnCours: 0,
    })
    expect(mockEscrowAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'HELD', order: { items: { some: { vendorId: 'v1' } } } },
      }),
    )
  })

  it('pagine et affiche « (supprimé) » pour un vendeur introuvable', async () => {
    mockOrderItemFindMany.mockResolvedValueOnce(ITEMS)
    mockVendorFindMany.mockResolvedValueOnce([]) // v2 n’existe plus
    mockEscrowAggregate.mockResolvedValueOnce({ _sum: { amount: 45_000 } })

    const result = await listFinanceVendors({ periode: '2026-08', page: 2, limit: 1 })

    expect(result).toMatchObject({ total: 2, page: 2, limit: 1 })
    expect(result.vendors).toHaveLength(1)
    expect(result.vendors[0]).toMatchObject({
      vendorId: 'v2',
      shopName: '(supprimé)',
      phone: null,
      commandes: 1,
      gmv: 60_000,
      commissions: 9_000,
      escrowEnCours: 45_000,
    })
    // Une seule requête escrow : celle de la page affichée.
    expect(mockEscrowAggregate).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

describe('toCsv', () => {
  it('BOM en tête, séparateur « ; », lignes CRLF', () => {
    expect(toCsv(['A', 'B'], [['x', 1]])).toBe('\u{FEFF}A;B\r\nx;1')
  })

  it('échappe « ; », guillemets (doublés) et retours à la ligne', () => {
    const csv = toCsv(['Nom'], [['a;b'], ['dire "oui"'], ['ligne\nligne']])
    const lines = csv.split('\r\n')
    expect(lines[1]).toBe('"a;b"')
    expect(lines[2]).toBe('"dire ""oui"""')
    expect(lines[3]).toBe('"ligne\nligne"')
  })
})

describe('exportCommandesCsv', () => {
  it('en-têtes FR exacts, dates YYYY-MM-DD, nom du client, statut escrow', async () => {
    mockOrderFindMany.mockResolvedValueOnce([
      {
        id: 'cmd-1',
        createdAt: new Date('2026-08-03T10:00:00Z'),
        totalAmount: 85_000,
        deliveryFee: 5_000,
        laborCost: 10_000,
        initiator: { name: 'Konan Marc', phone: '+2250700000001' },
        items: [
          { vendorShopName: 'Auto Pièces Yopougon', commissionAmount: 8_000 },
          { vendorShopName: 'Auto Pièces Yopougon', commissionAmount: 4_000 },
        ],
        escrow: { status: 'HELD' },
      },
      {
        id: 'cmd-2',
        createdAt: new Date('2026-08-04T09:00:00Z'),
        totalAmount: 40_000,
        deliveryFee: 0,
        laborCost: null,
        initiator: { name: null, phone: '+2250700000002' },
        items: [{ vendorShopName: 'Garage "Le Bon" Coin; Abidjan', commissionAmount: 3_000 }],
        escrow: null,
      },
    ])

    const { filename, csv } = await exportCommandesCsv({ periode: '2026-08' })

    expect(filename).toBe('commandes-2026-08.csv')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe(
      "\u{FEFF}Date;N° commande;Client;Vendeur;Montant;Livraison;Main-d'œuvre;Commission;Statut escrow",
    )
    // Vendeur dédupliqué sur la commande, commissions sommées.
    expect(lines[1]).toBe(
      '2026-08-03;cmd-1;Konan Marc;Auto Pièces Yopougon;85000;5000;10000;12000;HELD',
    )
    // Repli sur le téléphone, échappement du nom de boutique, escrow AUCUN.
    expect(lines[2]).toBe(
      '2026-08-04;cmd-2;+2250700000002;"Garage ""Le Bon"" Coin; Abidjan";40000;0;0;3000;AUCUN',
    )
    expect(lines).toHaveLength(3)
    expect(mockOrderFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'asc' } }),
    )
  })
})

describe('exportCommissionsCsv', () => {
  it('agrège par vendeur, trié par commissions décroissantes, « (supprimé) » si introuvable', async () => {
    mockOrderItemFindMany.mockResolvedValueOnce([
      { vendorId: 'v1', orderId: 'o1', priceSnapshot: 50_000, commissionAmount: 5_000 },
      { vendorId: 'v2', orderId: 'o1', priceSnapshot: 80_000, commissionAmount: 9_000 },
    ])
    mockVendorFindMany.mockResolvedValueOnce([
      { id: 'v1', shopName: 'Auto Pièces Yopougon', phone: '+2250700000001' },
    ])

    const { filename, csv } = await exportCommissionsCsv({ periode: '2026-08' })

    expect(filename).toBe('commissions-2026-08.csv')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe('\u{FEFF}Vendeur;Téléphone;Commandes;GMV;Commissions')
    expect(lines[1]).toBe('(supprimé);;1;80000;9000')
    expect(lines[2]).toBe('Auto Pièces Yopougon;+2250700000001;1;50000;5000')
  })
})

describe('exportEscrowCsv', () => {
  it('mouvements de la période, dates YYYY-MM-DD', async () => {
    mockEscrowFindMany.mockResolvedValueOnce([
      {
        orderId: 'cmd-1',
        amount: 85_000,
        status: 'RELEASED',
        heldAt: new Date('2026-08-01T10:00:00Z'),
        releasedAt: new Date('2026-08-05T10:00:00Z'),
        refundedAt: null,
      },
      {
        orderId: 'cmd-2',
        amount: 40_000,
        status: 'HELD',
        heldAt: new Date('2026-08-20T10:00:00Z'),
        releasedAt: null,
        refundedAt: null,
      },
    ])

    const { filename, csv } = await exportEscrowCsv({ periode: '2026-08' })

    expect(filename).toBe('escrow-2026-08.csv')
    const lines = csv.split('\r\n')
    expect(lines[0]).toBe(
      '\u{FEFF}Date blocage;Commande;Montant;Statut;Date libération;Date remboursement',
    )
    expect(lines[1]).toBe('2026-08-01;cmd-1;85000;RELEASED;2026-08-05;')
    expect(lines[2]).toBe('2026-08-20;cmd-2;40000;HELD;;')
    // Période appliquée aux trois dates du mouvement (bloqué, libéré, remboursé).
    expect(mockEscrowFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              heldAt: {
                gte: new Date('2026-08-01T00:00:00.000Z'),
                lt: new Date('2026-09-01T00:00:00.000Z'),
              },
            },
            {
              releasedAt: {
                gte: new Date('2026-08-01T00:00:00.000Z'),
                lt: new Date('2026-09-01T00:00:00.000Z'),
              },
            },
            {
              refundedAt: {
                gte: new Date('2026-08-01T00:00:00.000Z'),
                lt: new Date('2026-09-01T00:00:00.000Z'),
              },
            },
          ],
        },
      }),
    )
  })
})
