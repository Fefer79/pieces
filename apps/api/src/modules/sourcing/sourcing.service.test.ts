import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const mockSearchFindUnique = vi.fn()
const mockSearchFindFirst = vi.fn()
const mockSearchCreate = vi.fn()
const mockSearchUpdate = vi.fn()
const mockOfferFindUnique = vi.fn()
const mockOfferUpdate = vi.fn()
const mockOfferCreateMany = vi.fn()
const mockOfferCreate = vi.fn()
const mockOfferDelete = vi.fn()
const mockSupplierFindFirst = vi.fn()
const mockSupplierCreate = vi.fn()
const mockLeadFindUnique = vi.fn()
const mockEnqueue = vi.fn()
const mockCreatePurchaseOrder = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sourcingSearch: {
      findUnique: (...a: unknown[]) => mockSearchFindUnique(...a),
      findFirst: (...a: unknown[]) => mockSearchFindFirst(...a),
      create: (...a: unknown[]) => mockSearchCreate(...a),
      update: (...a: unknown[]) => mockSearchUpdate(...a),
    },
    sourcingOffer: {
      findUnique: (...a: unknown[]) => mockOfferFindUnique(...a),
      update: (...a: unknown[]) => mockOfferUpdate(...a),
      createMany: (...a: unknown[]) => mockOfferCreateMany(...a),
      create: (...a: unknown[]) => mockOfferCreate(...a),
      delete: (...a: unknown[]) => mockOfferDelete(...a),
    },
    supplier: {
      findFirst: (...a: unknown[]) => mockSupplierFindFirst(...a),
      create: (...a: unknown[]) => mockSupplierCreate(...a),
    },
    logisticsQuoteRequest: { findUnique: (...a: unknown[]) => mockLeadFindUnique(...a) },
    partRequest: { findUnique: vi.fn() },
  },
}))

vi.mock('../queue/queueService.js', () => ({
  enqueue: (...a: unknown[]) => mockEnqueue(...a),
}))

vi.mock('../stock/stock.service.js', () => ({
  createPurchaseOrder: (...a: unknown[]) => mockCreatePurchaseOrder(...a),
}))

vi.mock('./sourcing.agent.js', () => ({
  draftSupplierMessage: vi.fn(),
}))

const {
  createSearch,
  createOffer,
  deleteOffer,
  persistSearchResults,
  updateOffer,
  buildOfferMatrix,
  createPurchaseOrderFromOffer,
  resolveOfferMode,
  mapCondition,
  currencyOverridesFromEnv,
} = await import('./sourcing.service.js')

function offer(over: Record<string, unknown> = {}) {
  return {
    id: 'o1',
    supplierName: 'Fournisseur A',
    channel: 'EXPORTER',
    country: 'AE',
    city: null,
    url: null,
    sourceSite: null,
    title: null,
    brand: null,
    oemReference: null,
    conditionLabel: null,
    condition: null,
    priceAmount: 100,
    priceCurrency: 'AED',
    priceFcfa: 16_300,
    priceConfirmed: false,
    shippingAmount: null,
    moq: null,
    leadTimeDays: null,
    weightKg: null,
    availability: null,
    contactPhone: null,
    contactEmail: null,
    contactWhatsapp: null,
    confidence: 0.8,
    status: 'CANDIDATE',
    opsNote: null,
    chosenMode: null,
    purchaseOrderId: null,
    ...over,
  }
}

describe('mapCondition', () => {
  it('rattache les libellés courants à PartCondition', () => {
    expect(mapCondition('Neuf')).toBe('NEW')
    expect(mapCondition('Brand New')).toBe('NEW')
    expect(mapCondition('Genuine OEM')).toBe('NEW')
    expect(mapCondition('Occasion')).toBe('USED')
    expect(mapCondition('Used - Good')).toBe('USED')
    expect(mapCondition('Ré-usiné')).toBe('REFURBISHED')
    expect(mapCondition('Remanufactured')).toBe('REFURBISHED')
  })

  it('renvoie null plutôt que de deviner', () => {
    expect(mapCondition(null)).toBeNull()
    expect(mapCondition('Grade B')).toBeNull()
  })
})

describe('currencyOverridesFromEnv', () => {
  it('lit CURRENCY_RATE_XXX et ignore les valeurs invalides', () => {
    vi.stubEnv('CURRENCY_RATE_USD', '612')
    vi.stubEnv('CURRENCY_RATE_ZZZ', 'abc')
    const overrides = currencyOverridesFromEnv()
    expect(overrides.USD).toBe(612)
    expect(overrides.ZZZ).toBeUndefined()
    vi.unstubAllEnvs()
  })
})

describe('resolveOfferMode', () => {
  it('le mode forcé par l\'ops gagne toujours', () => {
    expect(resolveOfferMode(offer({ chosenMode: 'AIR_NOW' }), null)).toBe('AIR_NOW')
  })

  it('un vendeur ivoirien passe en achat local', () => {
    expect(resolveOfferMode(offer({ country: 'CI' }), null)).toBe('LOCAL')
    expect(resolveOfferMode(offer({ country: "Côte d'Ivoire" }), null)).toBe('LOCAL')
  })

  it('une matière restreinte en aérien part en maritime', () => {
    const family = {
      id: 'BATTERY',
      label: 'Batterie',
      weightKgMin: 14,
      weightKgMax: 22,
      volumeDm3Min: 12,
      volumeDm3Max: 18,
      airRestricted: true,
      keywords: [],
    }
    expect(resolveOfferMode(offer(), family)).toBe('SEA_LCL')
  })

  it('un colis volumineux part en maritime', () => {
    const family = {
      id: 'BUMPER',
      label: 'Pare-chocs',
      weightKgMin: 5,
      weightKgMax: 9,
      volumeDm3Min: 150,
      volumeDm3Max: 250,
      keywords: [],
    }
    expect(resolveOfferMode(offer(), family)).toBe('SEA_LCL')
  })

  it('aérien standard par défaut', () => {
    expect(resolveOfferMode(offer(), null)).toBe('AIR_STANDARD')
  })
})

describe('createSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchFindFirst.mockResolvedValue(null)
    mockSearchCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: 's1', ...data }),
    )
    mockLeadFindUnique.mockResolvedValue({
      partName: 'Plaquettes avant',
      oemReference: '04465-02220',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Yaris',
      vehicleYear: 2018,
      quantity: 2,
    })
  })

  it('ouvre un dossier manuel par défaut, sans job ni attente', async () => {
    const search = await createSearch({ quoteRequestId: 'q1' }, 'admin-1')

    expect(search.origin).toBe('MANUAL')
    expect(search.status).toBe('DONE')
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('prend le snapshot de la cotation', async () => {
    const search = await createSearch({ quoteRequestId: 'q1' }, 'admin-1')

    expect(search.partName).toBe('Plaquettes avant')
    expect(search.quantity).toBe(2)
    expect(search.oemReference).toBe('04465-02220')
  })

  it('enqueue le job seulement pour une recherche automatique', async () => {
    const search = await createSearch({ quoteRequestId: 'q1', origin: 'AGENT' }, 'admin-1')

    expect(search.origin).toBe('AGENT')
    expect(search.status).toBeUndefined()
    expect(mockEnqueue).toHaveBeenCalledWith(
      'SOURCING_SEARCH_RUN',
      { searchId: 's1' },
      { maxAttempts: 1 },
    )
  })

  it("refuse une seconde recherche automatique tant qu'une est en cours", async () => {
    mockSearchFindFirst.mockResolvedValue({ id: 's-existing' })

    await expect(
      createSearch({ quoteRequestId: 'q1', origin: 'AGENT' }, 'admin-1'),
    ).rejects.toMatchObject({ code: 'SOURCING_SEARCH_IN_FLIGHT', statusCode: 409 })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it("un dossier manuel n'est jamais bloqué par une recherche automatique en cours", async () => {
    mockSearchFindFirst.mockResolvedValue({ id: 's-existing' })

    const search = await createSearch({ quoteRequestId: 'q1' }, 'admin-1')
    expect(search.id).toBe('s1')
  })

  it('refuse un dossier sans nom de pièce exploitable', async () => {
    await expect(createSearch({ partName: undefined }, 'admin-1')).rejects.toMatchObject({
      code: 'SOURCING_SEARCH_EMPTY',
    })
  })
})

describe('createOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchFindUnique.mockResolvedValue({ id: 's1' })
    mockOfferCreate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data))
  })

  it('marque la provenance et convertit le prix comme pour une offre agent', async () => {
    const data = (await createOffer('s1', {
      supplierName: 'Al Nahda',
      priceAmount: 100,
      priceCurrency: 'eur',
      conditionLabel: 'Neuf',
    })) as Record<string, unknown>

    expect(data.enteredManually).toBe(true)
    expect(data.priceCurrency).toBe('EUR')
    expect(data.priceFcfa).toBe(65_596)
    expect(data.condition).toBe('NEW')
    // Un humain a ouvert la page : la confiance ne se discute pas.
    expect(data.confidence).toBe(1)
  })

  it("déduit le site source de l'URL", async () => {
    const data = (await createOffer('s1', {
      supplierName: 'X',
      url: 'https://www.ebay.com/itm/12345',
    })) as Record<string, unknown>
    expect(data.sourceSite).toBe('ebay.com')
  })

  it('accepte une offre sans prix — une piste à chiffrer reste utile', async () => {
    const data = (await createOffer('s1', { supplierName: 'X' })) as Record<string, unknown>
    expect(data.priceFcfa).toBeNull()
    expect(data.priceConfirmed).toBe(false)
  })

  it('conserve le prix confirmé quand il vient du vendeur', async () => {
    const data = (await createOffer('s1', {
      supplierName: 'X',
      priceAmount: 50,
      priceCurrency: 'EUR',
      priceConfirmed: true,
    })) as Record<string, unknown>
    expect(data.priceConfirmed).toBe(true)
  })

  it('refuse une devise dont on ne connaît pas le taux', async () => {
    await expect(
      createOffer('s1', { supplierName: 'X', priceAmount: 10, priceCurrency: 'ZZZ' }),
    ).rejects.toMatchObject({ code: 'SOURCING_UNKNOWN_CURRENCY' })
  })

  it('refuse un dossier inexistant', async () => {
    mockSearchFindUnique.mockResolvedValue(null)
    await expect(createOffer('s1', { supplierName: 'X' })).rejects.toMatchObject({
      code: 'SOURCING_SEARCH_NOT_FOUND',
    })
  })
})

describe('deleteOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOfferDelete.mockResolvedValue({})
  })

  it('supprime une offre saisie par erreur', async () => {
    mockOfferFindUnique.mockResolvedValue({ id: 'o1', status: 'CANDIDATE', purchaseOrderId: null })
    await deleteOffer('o1')
    expect(mockOfferDelete).toHaveBeenCalledWith({ where: { id: 'o1' } })
  })

  it('refuse de supprimer une offre commandée', async () => {
    mockOfferFindUnique.mockResolvedValue({ id: 'o1', status: 'ORDERED', purchaseOrderId: 'po1' })
    await expect(deleteOffer('o1')).rejects.toMatchObject({ code: 'SOURCING_OFFER_LOCKED' })
    expect(mockOfferDelete).not.toHaveBeenCalled()
  })
})

describe('persistSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchUpdate.mockResolvedValue({ id: 's1' })
  })

  it('convertit les prix en FCFA et laisse priceConfirmed à faux', async () => {
    await persistSearchResults('s1', {
      offers: [
        {
          supplierName: 'A',
          channel: 'EXPORTER',
          priceAmount: 100,
          priceCurrency: 'eur',
          conditionLabel: 'Neuf',
          confidence: 0.9,
        },
      ],
      note: null,
    })

    const rows = mockOfferCreateMany.mock.calls[0]?.[0].data as Record<string, unknown>[]
    expect(rows[0]?.priceCurrency).toBe('EUR')
    // 100 € × 655,957 (parité fixe XOF/EUR)
    expect(rows[0]?.priceFcfa).toBe(65_596)
    expect(rows[0]?.condition).toBe('NEW')
    expect(rows[0]).not.toHaveProperty('priceConfirmed')
  })

  it('laisse priceFcfa vide quand la devise est inconnue', async () => {
    await persistSearchResults('s1', {
      offers: [
        { supplierName: 'A', channel: 'EXPORTER', priceAmount: 100, priceCurrency: 'ZZZ', confidence: 0.5 },
      ],
      note: null,
    })
    const rows = mockOfferCreateMany.mock.calls[0]?.[0].data as Record<string, unknown>[]
    expect(rows[0]?.priceFcfa).toBeNull()
  })

  it('marque la recherche terminée avec la note quand il n\'y a aucune offre', async () => {
    await persistSearchResults('s1', { offers: [], note: 'Référence introuvable' })
    expect(mockOfferCreateMany).not.toHaveBeenCalled()
    expect(mockSearchUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'DONE', error: 'Référence introuvable' }),
      }),
    )
  })
})

describe('updateOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOfferUpdate.mockImplementation(({ data }: { data: unknown }) => Promise.resolve(data))
  })

  it('un prix corrigé à la main est recalculé et considéré confirmé', async () => {
    mockOfferFindUnique.mockResolvedValue(offer())
    const data = (await updateOffer('o1', { priceAmount: 200, priceCurrency: 'EUR' })) as Record<
      string,
      unknown
    >
    expect(data.priceFcfa).toBe(131_191)
    expect(data.priceConfirmed).toBe(true)
  })

  it('refuse de sortir une offre déjà commandée de son état', async () => {
    mockOfferFindUnique.mockResolvedValue(offer({ status: 'ORDERED' }))
    await expect(updateOffer('o1', { status: 'REJECTED' })).rejects.toMatchObject({
      code: 'SOURCING_OFFER_LOCKED',
    })
  })
})

describe('buildOfferMatrix', () => {
  beforeEach(() => vi.clearAllMocks())

  const search = (offers: Record<string, unknown>[]) => ({
    id: 's1',
    partName: 'Plaquettes avant',
    oemReference: null,
    quantity: 1,
    offers,
    quoteRequest: {
      downtimeCostPerDay: 30_000,
      economyCategory: 'PREMIUM_ICE',
      energyType: 'ICE',
      vehicleModel: 'Bestune T55',
      partCategory: 'Freinage / Plaquettes',
    },
  })

  it('classe par coût total et recommande le moins cher', async () => {
    mockSearchFindUnique.mockResolvedValue(
      search([
        offer({ id: 'cher', priceFcfa: 200_000, country: 'AE' }),
        offer({ id: 'local', priceFcfa: 90_000, country: 'CI' }),
      ]),
    )
    const matrix = await buildOfferMatrix('s1')
    expect(matrix.rows[0]?.offerId).toBe('local')
    expect(matrix.rows[0]?.option.recommended).toBe(true)
    expect(matrix.rows[1]?.option.extraCostVsBest).toBeGreaterThan(0)
  })

  it("l'immobilisation fait perdre le maritime sur les longs délais", async () => {
    mockSearchFindUnique.mockResolvedValue(
      search([
        offer({ id: 'mer', priceFcfa: 20_000, country: 'CN', chosenMode: 'SEA_LCL' }),
        offer({ id: 'air', priceFcfa: 120_000, country: 'CN', chosenMode: 'AIR_STANDARD' }),
      ]),
    )
    const matrix = await buildOfferMatrix('s1')
    // 45 j × 30 000 F = 1 350 000 F d'immobilisation : le maritime ne peut pas gagner.
    expect(matrix.rows[0]?.offerId).toBe('air')
  })

  it('ajoute le délai de préparation du vendeur au délai du mode', async () => {
    mockSearchFindUnique.mockResolvedValue(
      search([offer({ id: 'o1', priceFcfa: 50_000, leadTimeDays: 3, chosenMode: 'AIR_STANDARD' })]),
    )
    const matrix = await buildOfferMatrix('s1')
    // AIR_STANDARD = 5 j + 3 j annoncés
    expect(matrix.rows[0]?.option.transitDays).toBe(8)
  })

  it('multiplie le prix pièce par la quantité', async () => {
    const s = search([offer({ id: 'o1', priceFcfa: 50_000, chosenMode: 'LOCAL' })])
    mockSearchFindUnique.mockResolvedValue({ ...s, quantity: 4 })
    const matrix = await buildOfferMatrix('s1')
    expect(matrix.rows[0]?.option.partPrice).toBe(200_000)
  })

  it("n'arbitre que sur les offres retenues quand il y en a", async () => {
    mockSearchFindUnique.mockResolvedValue(
      search([
        offer({ id: 'retenue', priceFcfa: 300_000, status: 'SHORTLISTED' }),
        offer({ id: 'candidate', priceFcfa: 10_000, status: 'CANDIDATE' }),
      ]),
    )
    const matrix = await buildOfferMatrix('s1')
    expect(matrix.rows).toHaveLength(1)
    expect(matrix.rows[0]?.offerId).toBe('retenue')
  })

  it('ignore les offres sans prix — arbitrer sans prix n\'a pas de sens', async () => {
    mockSearchFindUnique.mockResolvedValue(
      search([offer({ id: 'sansPrix', priceFcfa: null }), offer({ id: 'avecPrix', priceFcfa: 50_000 })]),
    )
    const matrix = await buildOfferMatrix('s1')
    expect(matrix.rows).toHaveLength(1)
    expect(matrix.rows[0]?.offerId).toBe('avecPrix')
  })

  it('signale que le classement repose sur des prix non confirmés', async () => {
    mockSearchFindUnique.mockResolvedValue(search([offer({ priceFcfa: 50_000 })]))
    const matrix = await buildOfferMatrix('s1')
    expect(matrix.pricesUnconfirmed).toBe(true)
  })
})

describe('createPurchaseOrderFromOffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po1', numero: 'BC-20260803-AAAA' })
    mockOfferUpdate.mockResolvedValue({})
  })

  const withSearch = (over: Record<string, unknown> = {}) => ({
    ...offer(over),
    search: {
      id: 's1',
      partName: 'Plaquettes avant',
      quantity: 2,
      oemReference: '04465',
      partRequestId: null,
    },
  })

  it('réutilise un fournisseur existant', async () => {
    mockOfferFindUnique.mockResolvedValue(withSearch())
    mockSupplierFindFirst.mockResolvedValue({ id: 'sup-existant' })

    await createPurchaseOrderFromOffer('o1', 'admin-1', {})

    expect(mockSupplierCreate).not.toHaveBeenCalled()
    const body = mockCreatePurchaseOrder.mock.calls[0]?.[1] as Record<string, unknown>
    expect(body.supplierId).toBe('sup-existant')
    expect(body.devise).toBe('AED')
    expect(body.lines).toHaveLength(1)
    expect((body.lines as Record<string, unknown>[])[0]?.quantite).toBe(2)
  })

  it('crée le fournisseur quand il est inconnu', async () => {
    mockOfferFindUnique.mockResolvedValue(withSearch())
    mockSupplierFindFirst.mockResolvedValue(null)
    mockSupplierCreate.mockResolvedValue({ id: 'sup-neuf' })

    await createPurchaseOrderFromOffer('o1', 'admin-1', {})

    expect(mockSupplierCreate).toHaveBeenCalled()
    const body = mockCreatePurchaseOrder.mock.calls[0]?.[1] as Record<string, unknown>
    expect(body.supplierId).toBe('sup-neuf')
  })

  it('passe l\'offre en ORDERED et la relie au bon de commande', async () => {
    mockOfferFindUnique.mockResolvedValue(withSearch())
    mockSupplierFindFirst.mockResolvedValue({ id: 's' })

    await createPurchaseOrderFromOffer('o1', 'admin-1', {})

    expect(mockOfferUpdate).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'ORDERED', purchaseOrderId: 'po1' },
    })
  })

  it('refuse de commander une offre sans prix', async () => {
    mockOfferFindUnique.mockResolvedValue(withSearch({ priceAmount: null }))
    await expect(createPurchaseOrderFromOffer('o1', 'admin-1', {})).rejects.toMatchObject({
      code: 'SOURCING_OFFER_NO_PRICE',
    })
  })

  it('refuse un second bon de commande sur la même offre', async () => {
    mockOfferFindUnique.mockResolvedValue(withSearch({ purchaseOrderId: 'po-existant' }))
    await expect(createPurchaseOrderFromOffer('o1', 'admin-1', {})).rejects.toMatchObject({
      code: 'SOURCING_OFFER_ALREADY_ORDERED',
    })
  })
})
