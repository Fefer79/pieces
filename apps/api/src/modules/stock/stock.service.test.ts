import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const ADMIN = 'f0f0f0f0-1111-4222-8333-444444444444'
const LOC1 = '11111111-2222-4333-8444-555555555555'
const ITEM1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SUP1 = '99999999-8888-4777-8666-555555555555'
const PO1 = '123e4567-e89b-42d3-a456-426614174000'
const LINE1 = 'abcdef01-2345-4678-89ab-cdef01234567'
const LINE2 = 'abcdef01-2345-4678-89ab-cdef01234568'

const mockLocationCount = vi.fn()
const mockLocationFindMany = vi.fn()
const mockLocationFindUnique = vi.fn()
const mockLocationCreate = vi.fn()
const mockLocationUpdate = vi.fn()
const mockLevelFindMany = vi.fn()
const mockLevelFindUnique = vi.fn()
const mockLevelUpsert = vi.fn()
const mockMovementCount = vi.fn()
const mockMovementFindMany = vi.fn()
const mockMovementCreate = vi.fn()
const mockSupplierCount = vi.fn()
const mockSupplierFindMany = vi.fn()
const mockSupplierFindUnique = vi.fn()
const mockSupplierCreate = vi.fn()
const mockPoCount = vi.fn()
const mockPoFindMany = vi.fn()
const mockPoFindUnique = vi.fn()
const mockPoCreate = vi.fn()
const mockPoUpdate = vi.fn()
const mockPoAggregate = vi.fn()
const mockPoItemUpdate = vi.fn()
const mockPoItemFindMany = vi.fn()
const mockItemFindMany = vi.fn()
const mockItemFindUnique = vi.fn()
const mockItemUpdate = vi.fn()
const mockTransaction = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    stockLocation: {
      count: (...a: unknown[]) => mockLocationCount(...a),
      findMany: (...a: unknown[]) => mockLocationFindMany(...a),
      findUnique: (...a: unknown[]) => mockLocationFindUnique(...a),
      create: (...a: unknown[]) => mockLocationCreate(...a),
      update: (...a: unknown[]) => mockLocationUpdate(...a),
    },
    stockLevel: {
      findMany: (...a: unknown[]) => mockLevelFindMany(...a),
      findUnique: (...a: unknown[]) => mockLevelFindUnique(...a),
      upsert: (...a: unknown[]) => mockLevelUpsert(...a),
    },
    stockMovement: {
      count: (...a: unknown[]) => mockMovementCount(...a),
      findMany: (...a: unknown[]) => mockMovementFindMany(...a),
      create: (...a: unknown[]) => mockMovementCreate(...a),
    },
    supplier: {
      count: (...a: unknown[]) => mockSupplierCount(...a),
      findMany: (...a: unknown[]) => mockSupplierFindMany(...a),
      findUnique: (...a: unknown[]) => mockSupplierFindUnique(...a),
      create: (...a: unknown[]) => mockSupplierCreate(...a),
    },
    purchaseOrder: {
      count: (...a: unknown[]) => mockPoCount(...a),
      findMany: (...a: unknown[]) => mockPoFindMany(...a),
      findUnique: (...a: unknown[]) => mockPoFindUnique(...a),
      create: (...a: unknown[]) => mockPoCreate(...a),
      update: (...a: unknown[]) => mockPoUpdate(...a),
      aggregate: (...a: unknown[]) => mockPoAggregate(...a),
    },
    purchaseOrderItem: {
      update: (...a: unknown[]) => mockPoItemUpdate(...a),
      findMany: (...a: unknown[]) => mockPoItemFindMany(...a),
    },
    catalogItem: {
      findMany: (...a: unknown[]) => mockItemFindMany(...a),
      findUnique: (...a: unknown[]) => mockItemFindUnique(...a),
      update: (...a: unknown[]) => mockItemUpdate(...a),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => mockTransaction(fn),
  },
}))

const {
  getStockOverview,
  computeLevelStatus,
  computeLandedCost,
  estimateLandedCost,
  listStockLevels,
  adjustStock,
  listVendorStockAlerts,
  getSupplier,
  buildPoNumber,
  createPurchaseOrder,
  updatePurchaseOrder,
  receivePurchaseOrder,
} = await import('./stock.service.js')

describe('computeLevelStatus', () => {
  it('rupture à zéro, bas au seuil, ok au-dessus', () => {
    expect(computeLevelStatus(0, 2)).toBe('rupture')
    expect(computeLevelStatus(2, 2)).toBe('bas')
    expect(computeLevelStatus(1, 2)).toBe('bas')
    expect(computeLevelStatus(3, 2)).toBe('ok')
  })
})

describe('computeLandedCost', () => {
  it('LOCAL : forfait dossier seul, pas de douane ni last-mile', () => {
    expect(computeLandedCost('LOCAL', 10, 100_000)).toEqual({
      fret: 2_000,
      douane: 0,
      lastMile: 0,
      total: 102_000,
      delaiJours: 2,
    })
  })

  it('AIR_STANDARD : fret au poids + douane 20 % + last-mile', () => {
    // fret = 10 kg × 7 000 + 15 000 = 85 000 ; douane = 20 % × 185 000 = 37 000
    expect(computeLandedCost('AIR_STANDARD', 10, 100_000)).toEqual({
      fret: 85_000,
      douane: 37_000,
      lastMile: 2_000,
      total: 224_000,
      delaiJours: 5,
    })
  })

  it('AIR_NOW : le minimum de perception écrase le tarif au poids', () => {
    // max(1 × 9 500, 45 000) + 15 000 = 60 000
    const res = computeLandedCost('AIR_NOW', 1, 50_000)
    expect(res.fret).toBe(60_000)
    expect(res.delaiJours).toBe(3)
  })
})

describe('estimateLandedCost', () => {
  it('valide le body et délègue au moteur de coût', async () => {
    const res = await estimateLandedCost({
      mode: 'SEA_LCL',
      poidsTotalKg: 100,
      montantFcfa: 200_000,
    })
    // fret = max(100 × 450, 30 000) + 25 000 = 70 000 ; douane = 20 % × 270 000 = 54 000
    expect(res).toEqual({
      fret: 70_000,
      douane: 54_000,
      lastMile: 2_000,
      total: 326_000,
      delaiJours: 45,
    })
  })

  it('rejette un mode inconnu', async () => {
    await expect(
      estimateLandedCost({ mode: 'FUSEE', poidsTotalKg: 1, montantFcfa: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 422 })
  })
})

describe('buildPoNumber', () => {
  it('produit un numéro BC-YYYYMMDD-XXXX sans caractère ambigu', () => {
    const numero = buildPoNumber(new Date(Date.UTC(2026, 6, 31)))
    expect(numero).toMatch(/^BC-20260731-[A-HJ-NP-Z2-9]{4}$/)
    expect(numero.slice(12)).not.toMatch(/[IO01]/)
  })
})

describe('getStockOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('agrège les 8 compteurs avec statuts et valorisation calculés', async () => {
    mockLocationCount.mockResolvedValueOnce(2)
    mockLevelFindMany.mockResolvedValueOnce([
      { catalogItemId: 'a', qtyOnHand: 0, seuilBas: 2, cumpFcfa: 500 }, // rupture, 0 F
      { catalogItemId: 'a', qtyOnHand: 1, seuilBas: 2, cumpFcfa: 1_000 }, // bas, 1 000 F
      { catalogItemId: 'b', qtyOnHand: 10, seuilBas: 2, cumpFcfa: 300 }, // ok, 3 000 F
      { catalogItemId: 'c', qtyOnHand: 5, seuilBas: 2, cumpFcfa: null }, // ok, non valorisé
    ])
    mockMovementCount.mockResolvedValueOnce(7)
    mockSupplierCount.mockResolvedValueOnce(4)
    mockPoCount.mockResolvedValueOnce(2)

    const res = await getStockOverview()

    expect(res).toEqual({
      emplacementsActifs: 2,
      referencesSuivies: 3,
      ruptures: 1,
      stockBas: 1,
      valeurStockFcfa: 4_000,
      mouvements30j: 7,
      fournisseursActifs: 4,
      bcEnCours: 2,
    })
  })
})

describe('listStockLevels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const LEVELS = [
    {
      id: 'l1',
      catalogItemId: 'a',
      locationId: LOC1,
      qtyOnHand: 0,
      seuilBas: 2,
      cumpFcfa: 500,
      catalogItem: { id: 'a', name: 'Plaquettes', oemReference: null, imageThumbUrl: null },
      location: { id: LOC1, nom: 'Entrepôt', type: 'ENTREPOT' },
    },
    {
      id: 'l2',
      catalogItemId: 'b',
      locationId: LOC1,
      qtyOnHand: 4,
      seuilBas: 2,
      cumpFcfa: 1_000,
      catalogItem: { id: 'b', name: 'Disques', oemReference: '12345', imageThumbUrl: null },
      location: { id: LOC1, nom: 'Entrepôt', type: 'ENTREPOT' },
    },
  ]

  it('calcule statut et valeur pour chaque niveau', async () => {
    mockLevelFindMany.mockResolvedValueOnce(LEVELS)

    const res = await listStockLevels({})

    expect(res.total).toBe(2)
    expect(res.levels[0]).toMatchObject({ statut: 'rupture', valeurFcfa: 0 })
    expect(res.levels[1]).toMatchObject({ statut: 'ok', valeurFcfa: 4_000 })
  })

  it('filtre par statut calculé', async () => {
    mockLevelFindMany.mockResolvedValueOnce(LEVELS)

    const res = await listStockLevels({ statut: 'rupture' })

    expect(res.total).toBe(1)
    expect(res.levels[0]).toMatchObject({ id: 'l1' })
  })

  it('passe le filtre emplacement à Prisma', async () => {
    mockLevelFindMany.mockResolvedValueOnce([])

    await listStockLevels({ locationId: LOC1, q: 'plaquette' })

    expect(mockLevelFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          locationId: LOC1,
          catalogItem: expect.objectContaining({ OR: expect.any(Array) }),
        }),
      }),
    )
  })
})

describe('adjustStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stockLevel: {
          findUnique: (...a: unknown[]) => mockLevelFindUnique(...a),
          upsert: (...a: unknown[]) => mockLevelUpsert(...a),
        },
        stockMovement: { create: (...a: unknown[]) => mockMovementCreate(...a) },
      }),
    )
    mockItemFindUnique.mockResolvedValue({ id: ITEM1 })
    mockLocationFindUnique.mockResolvedValue({ id: LOC1 })
    mockLevelUpsert.mockImplementation(({ create }) => Promise.resolve({ id: 'lvl-1', ...create }))
    mockMovementCreate.mockResolvedValue({ id: 'mvt-1' })
  })

  it('rejette une fiche catalogue inconnue', async () => {
    mockItemFindUnique.mockResolvedValueOnce(null)

    await expect(
      adjustStock(ADMIN, { catalogItemId: ITEM1, locationId: LOC1, delta: 1 }),
    ).rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND', statusCode: 404 })
  })

  it('rejette un emplacement inconnu', async () => {
    mockLocationFindUnique.mockResolvedValueOnce(null)

    await expect(
      adjustStock(ADMIN, { catalogItemId: ITEM1, locationId: LOC1, delta: 1 }),
    ).rejects.toMatchObject({ code: 'STOCK_LOCATION_NOT_FOUND', statusCode: 404 })
  })

  it('refuse un solde négatif (STOCK_INSUFFICIENT)', async () => {
    mockLevelFindUnique.mockResolvedValueOnce({ qtyOnHand: 2, cumpFcfa: 500 })

    await expect(
      adjustStock(ADMIN, { catalogItemId: ITEM1, locationId: LOC1, delta: -5 }),
    ).rejects.toMatchObject({ code: 'STOCK_INSUFFICIENT', statusCode: 422 })
    expect(mockLevelUpsert).not.toHaveBeenCalled()
  })

  it('entrée valorisée sans niveau existant : le coût devient le CUMP', async () => {
    mockLevelFindUnique.mockResolvedValueOnce(null)

    await adjustStock(ADMIN, {
      catalogItemId: ITEM1,
      locationId: LOC1,
      delta: 5,
      coutUnitaireFcfa: 3_000,
      note: 'Inventaire initial',
    })

    expect(mockLevelUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ qtyOnHand: 5, cumpFcfa: 3_000 }),
      }),
    )
    expect(mockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'AJUSTEMENT',
        quantite: 5,
        coutUnitaireFcfa: 3_000,
        refType: 'MANUEL',
        actorId: ADMIN,
        note: 'Inventaire initial',
      }),
    })
  })

  it('entrée valorisée : CUMP pondéré arrondi', async () => {
    mockLevelFindUnique.mockResolvedValueOnce({ qtyOnHand: 10, cumpFcfa: 1_000 })

    await adjustStock(ADMIN, {
      catalogItemId: ITEM1,
      locationId: LOC1,
      delta: 5,
      coutUnitaireFcfa: 2_000,
    })

    // (10 × 1 000 + 5 × 2 000) / 15 = 1 333,33 → 1 333
    expect(mockLevelUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ qtyOnHand: 15, cumpFcfa: 1_333 }),
      }),
    )
  })

  it('sortie : CUMP inchangé, quantité du mouvement en absolu', async () => {
    mockLevelFindUnique.mockResolvedValueOnce({ qtyOnHand: 10, cumpFcfa: 1_000 })

    await adjustStock(ADMIN, { catalogItemId: ITEM1, locationId: LOC1, delta: -3 })

    expect(mockLevelUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ qtyOnHand: 7, cumpFcfa: 1_000 }),
      }),
    )
    expect(mockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ quantite: 3, type: 'AJUSTEMENT' }),
    })
  })

  it('rejette un delta nul', async () => {
    await expect(
      adjustStock(ADMIN, { catalogItemId: ITEM1, locationId: LOC1, delta: 0 }),
    ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 422 })
  })
})

describe('listVendorStockAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const vendor = { id: 'v1', shopName: 'Garage Adjamé', phone: '+2250700000000', isInternal: false }

  it('ruptures d’abord, puis quantité croissante ; fiches saines exclues', async () => {
    mockItemFindMany.mockResolvedValueOnce([
      {
        id: 'i1',
        name: 'Filtre',
        oemReference: null,
        stockQuantity: 1,
        lowStockThreshold: 2,
        vendor,
      },
      {
        id: 'i2',
        name: 'Plaquettes',
        oemReference: null,
        stockQuantity: 0,
        lowStockThreshold: 1,
        vendor,
      },
      {
        id: 'i3',
        name: 'Disques',
        oemReference: null,
        stockQuantity: 8,
        lowStockThreshold: 2,
        vendor,
      },
      {
        id: 'i4',
        name: 'Batterie',
        oemReference: null,
        stockQuantity: 0,
        lowStockThreshold: 0,
        vendor,
      },
    ])

    const res = await listVendorStockAlerts({})

    expect(res.total).toBe(3)
    expect(res.alerts.map((a: { id: string }) => a.id)).toEqual(['i2', 'i4', 'i1'])
    expect(res.alerts[0]).toMatchObject({ type: 'rupture' })
    expect(res.alerts[2]).toMatchObject({ type: 'bas' })
  })

  it('filtre par type', async () => {
    mockItemFindMany.mockResolvedValueOnce([
      {
        id: 'i1',
        name: 'Filtre',
        oemReference: null,
        stockQuantity: 1,
        lowStockThreshold: 2,
        vendor,
      },
      {
        id: 'i2',
        name: 'Plaquettes',
        oemReference: null,
        stockQuantity: 0,
        lowStockThreshold: 1,
        vendor,
      },
    ])

    const res = await listVendorStockAlerts({ type: 'bas' })

    expect(res.total).toBe(1)
    expect(res.alerts[0]).toMatchObject({ id: 'i1', type: 'bas' })
  })
})

describe('getSupplier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('retourne la fiche avec les 20 derniers BC et le volume hors annulés', async () => {
    mockSupplierFindUnique.mockResolvedValueOnce({ id: SUP1, nom: 'Auto Dubai Parts' })
    mockPoFindMany.mockResolvedValueOnce([{ id: PO1, numero: 'BC-20260731-ABCD' }])
    mockPoAggregate.mockResolvedValueOnce({ _sum: { montantEstimeFcfa: 1_500_000 } })

    const res = await getSupplier(SUP1)

    expect(res).toMatchObject({ id: SUP1, volumeFcfa: 1_500_000 })
    expect(res.bonsCommande).toHaveLength(1)
    expect(mockPoAggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { supplierId: SUP1, statut: { not: 'ANNULEE' } } }),
    )
  })

  it('volume à zéro quand aucun BC', async () => {
    mockSupplierFindUnique.mockResolvedValueOnce({ id: SUP1, nom: 'Auto Dubai Parts' })
    mockPoFindMany.mockResolvedValueOnce([])
    mockPoAggregate.mockResolvedValueOnce({ _sum: { montantEstimeFcfa: null } })

    const res = await getSupplier(SUP1)
    expect(res.volumeFcfa).toBe(0)
  })

  it('404 si fournisseur inconnu', async () => {
    mockSupplierFindUnique.mockResolvedValueOnce(null)

    await expect(getSupplier(SUP1)).rejects.toMatchObject({
      code: 'SUPPLIER_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('createPurchaseOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupplierFindUnique.mockResolvedValue({ id: SUP1 })
    mockLocationFindUnique.mockResolvedValue({ id: LOC1 })
    mockItemFindMany.mockResolvedValue([{ id: ITEM1 }])
    mockPoFindUnique.mockResolvedValue(null) // unicité du numéro
    mockPoCreate.mockImplementation(({ data }) => Promise.resolve({ id: PO1, ...data }))
  })

  const BODY = {
    supplierId: SUP1,
    destinationId: LOC1,
    mode: 'AIR_ECONOMY',
    devise: 'AED',
    tauxChange: 200,
    lines: [
      { designation: 'Plaquettes de frein', quantite: 10, prixUnitaire: 25.5, poidsEstimeKg: 2 },
      {
        catalogItemId: ITEM1,
        designation: 'Disques de frein',
        quantite: 4,
        prixUnitaire: 100,
      },
    ],
  }

  it('calcule numéro, montant converti et frais estimés', async () => {
    const res = await createPurchaseOrder(ADMIN, BODY)

    // (10 × 25,5 + 4 × 100) × 200 = 131 000 FCFA ; poids total = 20 kg
    // fret = max(20 × 5 000, 25 000) + 15 000 = 115 000 ; douane = 20 % × 246 000 = 49 200
    expect(res.numero).toMatch(/^BC-\d{8}-[A-HJ-NP-Z2-9]{4}$/)
    expect(res.montantEstimeFcfa).toBe(131_000)
    expect(res.fraisEstimes).toMatchObject({ fret: 115_000, douane: 49_200, lastMile: 2_000 })
    expect(mockPoCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierId: SUP1,
          destinationId: LOC1,
          createdById: ADMIN,
          lines: { create: expect.arrayContaining([expect.objectContaining({ quantite: 10 })]) },
        }),
      }),
    )
  })

  it('rejette un fournisseur inconnu', async () => {
    mockSupplierFindUnique.mockResolvedValueOnce(null)

    await expect(createPurchaseOrder(ADMIN, BODY)).rejects.toMatchObject({
      code: 'SUPPLIER_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('rejette une destination inconnue', async () => {
    mockLocationFindUnique.mockResolvedValueOnce(null)

    await expect(createPurchaseOrder(ADMIN, BODY)).rejects.toMatchObject({
      code: 'STOCK_LOCATION_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('rejette une fiche catalogue liée inconnue', async () => {
    mockItemFindMany.mockResolvedValueOnce([])

    await expect(createPurchaseOrder(ADMIN, BODY)).rejects.toMatchObject({
      code: 'CATALOG_ITEM_NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('updatePurchaseOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPoUpdate.mockImplementation(({ data }) => Promise.resolve({ id: PO1, ...data }))
  })

  it('404 si le bon est introuvable', async () => {
    mockPoFindUnique.mockResolvedValueOnce(null)

    await expect(updatePurchaseOrder(PO1, { notes: 'x' })).rejects.toMatchObject({
      code: 'PO_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('BROUILLON → ENVOYEE : envoyeAt et ETA par défaut du mode', async () => {
    mockPoFindUnique.mockResolvedValueOnce({
      id: PO1,
      statut: 'BROUILLON',
      mode: 'AIR_STANDARD',
      etaAt: null,
    })

    await updatePurchaseOrder(PO1, { statut: 'ENVOYEE' })

    const data = mockPoUpdate.mock.calls[0]![0].data
    expect(data.statut).toBe('ENVOYEE')
    expect(data.envoyeAt).toBeInstanceOf(Date)
    expect(data.etaAt).toBeInstanceOf(Date)
    // AIR_STANDARD = 5 jours (à la minute près)
    const expected = Date.now() + 5 * 24 * 60 * 60 * 1000
    expect(Math.abs(data.etaAt.getTime() - expected)).toBeLessThan(60_000)
  })

  it('EN_TRANSIT → ENVOYEE est refusé (matrice stricte)', async () => {
    mockPoFindUnique.mockResolvedValueOnce({ id: PO1, statut: 'EN_TRANSIT', mode: 'LOCAL' })

    await expect(updatePurchaseOrder(PO1, { statut: 'ENVOYEE' })).rejects.toMatchObject({
      code: 'PO_INVALID_TRANSITION',
      statusCode: 422,
    })
    expect(mockPoUpdate).not.toHaveBeenCalled()
  })

  it('RECEPTIONNEE est un état terminal', async () => {
    mockPoFindUnique.mockResolvedValueOnce({ id: PO1, statut: 'RECEPTIONNEE', mode: 'LOCAL' })

    await expect(updatePurchaseOrder(PO1, { statut: 'ANNULEE' })).rejects.toMatchObject({
      code: 'PO_INVALID_TRANSITION',
      statusCode: 422,
    })
  })

  it('met à jour destination, ETA et notes sans toucher au statut', async () => {
    mockPoFindUnique.mockResolvedValueOnce({
      id: PO1,
      statut: 'BROUILLON',
      mode: 'LOCAL',
      etaAt: null,
    })

    await updatePurchaseOrder(PO1, { destinationId: LOC1, notes: 'Urgent' })

    const data = mockPoUpdate.mock.calls[0]![0].data
    expect(data.destinationId).toBe(LOC1)
    expect(data.notes).toBe('Urgent')
    expect(data.statut).toBeUndefined()
  })
})

describe('receivePurchaseOrder', () => {
  const poLine = {
    id: LINE1,
    purchaseOrderId: PO1,
    catalogItemId: ITEM1,
    designation: 'Plaquettes de frein',
    quantite: 5,
    quantiteRecue: 0,
    prixUnitaire: 1_000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockTransaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        purchaseOrderItem: {
          update: (...a: unknown[]) => mockPoItemUpdate(...a),
          findMany: (...a: unknown[]) => mockPoItemFindMany(...a),
        },
        stockMovement: { create: (...a: unknown[]) => mockMovementCreate(...a) },
        stockLevel: {
          findUnique: (...a: unknown[]) => mockLevelFindUnique(...a),
          upsert: (...a: unknown[]) => mockLevelUpsert(...a),
        },
        catalogItem: {
          findUnique: (...a: unknown[]) => mockItemFindUnique(...a),
          update: (...a: unknown[]) => mockItemUpdate(...a),
        },
        purchaseOrder: { update: (...a: unknown[]) => mockPoUpdate(...a) },
      }),
    )
    mockPoFindUnique.mockResolvedValue({
      id: PO1,
      statut: 'ENVOYEE',
      destinationId: LOC1,
      tauxChange: null,
      montantReelFcfa: null,
      lines: [poLine],
    })
    mockPoItemUpdate.mockResolvedValue({})
    mockMovementCreate.mockResolvedValue({})
    mockLevelFindUnique.mockResolvedValue(null)
    mockLevelUpsert.mockResolvedValue({})
    mockItemFindUnique.mockResolvedValue({ stockQuantity: 2 })
    mockItemUpdate.mockResolvedValue({})
    mockPoUpdate.mockImplementation(({ data }) => Promise.resolve({ id: PO1, ...data }))
  })

  it('404 si le bon est introuvable', async () => {
    mockPoFindUnique.mockResolvedValueOnce(null)

    await expect(
      receivePurchaseOrder(ADMIN, PO1, { lines: [{ lineId: LINE1, quantiteRecue: 1 }] }),
    ).rejects.toMatchObject({ code: 'PO_NOT_FOUND', statusCode: 404 })
  })

  it('refuse une réception depuis BROUILLON', async () => {
    mockPoFindUnique.mockResolvedValueOnce({
      id: PO1,
      statut: 'BROUILLON',
      destinationId: LOC1,
      lines: [poLine],
    })

    await expect(
      receivePurchaseOrder(ADMIN, PO1, { lines: [{ lineId: LINE1, quantiteRecue: 1 }] }),
    ).rejects.toMatchObject({ code: 'PO_INVALID_TRANSITION', statusCode: 422 })
  })

  it('rejette la sur-réception (PO_OVER_RECEIVE)', async () => {
    mockPoFindUnique.mockResolvedValueOnce({
      id: PO1,
      statut: 'RECEPTION_PARTIELLE',
      destinationId: LOC1,
      tauxChange: null,
      montantReelFcfa: 3_000,
      lines: [{ ...poLine, quantiteRecue: 3 }],
    })

    await expect(
      receivePurchaseOrder(ADMIN, PO1, { lines: [{ lineId: LINE1, quantiteRecue: 3 }] }),
    ).rejects.toMatchObject({ code: 'PO_OVER_RECEIVE', statusCode: 422 })
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('rejette une ligne étrangère au bon', async () => {
    await expect(
      receivePurchaseOrder(ADMIN, PO1, { lines: [{ lineId: LINE2, quantiteRecue: 1 }] }),
    ).rejects.toMatchObject({ code: 'PO_LINE_NOT_FOUND', statusCode: 404 })
  })

  it('réception complète : mouvement, niveau, compteur marketplace, RECEPTIONNEE', async () => {
    mockPoItemFindMany.mockResolvedValueOnce([{ ...poLine, quantiteRecue: 5 }])

    const res = await receivePurchaseOrder(ADMIN, PO1, {
      lines: [{ lineId: LINE1, quantiteRecue: 5, prixUnitaireReelFcfa: 1_200 }],
    })

    expect(mockMovementCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'RECEPTION',
        catalogItemId: ITEM1,
        locationId: LOC1,
        quantite: 5,
        coutUnitaireFcfa: 1_200,
        refType: 'PurchaseOrder',
        refId: PO1,
        actorId: ADMIN,
      }),
    })
    expect(mockLevelUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ qtyOnHand: 5, cumpFcfa: 1_200 }),
      }),
    )
    expect(mockItemUpdate).toHaveBeenCalledWith({
      where: { id: ITEM1 },
      data: { stockQuantity: 7, inStock: true },
    })
    expect(res.statut).toBe('RECEPTIONNEE')
    expect(res.recuAt).toBeInstanceOf(Date)
    expect(res.montantReelFcfa).toBe(6_000)
  })

  it('réception partielle : statut RECEPTION_PARTIELLE', async () => {
    mockPoItemFindMany.mockResolvedValueOnce([{ ...poLine, quantiteRecue: 2 }])

    const res = await receivePurchaseOrder(ADMIN, PO1, {
      lines: [{ lineId: LINE1, quantiteRecue: 2 }],
    })

    // Sans prix réel : retombe sur prixUnitaire × taux (1 000 × 1)
    expect(res.statut).toBe('RECEPTION_PARTIELLE')
    expect(res.montantReelFcfa).toBe(2_000)
  })

  it('ligne libre : quantité trackée, aucun impact stock', async () => {
    const freeLine = { ...poLine, id: LINE2, catalogItemId: null }
    mockPoFindUnique.mockResolvedValueOnce({
      id: PO1,
      statut: 'ENVOYEE',
      destinationId: LOC1,
      tauxChange: null,
      montantReelFcfa: null,
      lines: [freeLine],
    })
    mockPoItemFindMany.mockResolvedValueOnce([{ ...freeLine, quantiteRecue: 5 }])

    const res = await receivePurchaseOrder(ADMIN, PO1, {
      lines: [{ lineId: LINE2, quantiteRecue: 5 }],
    })

    expect(mockMovementCreate).not.toHaveBeenCalled()
    expect(mockLevelUpsert).not.toHaveBeenCalled()
    expect(mockItemUpdate).not.toHaveBeenCalled()
    expect(res.statut).toBe('RECEPTIONNEE')
  })
})
