import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')

const searchFindUnique = vi.fn()
const searchFindFirst = vi.fn()
const searchCreate = vi.fn()
const searchUpdate = vi.fn()
const offerFindUnique = vi.fn()
const offerUpdate = vi.fn()
const offerCreateMany = vi.fn()
const leadFindUnique = vi.fn()
const supplierFindFirst = vi.fn()
const supplierCreate = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sourcingSearch: {
      findUnique: (...a: unknown[]) => searchFindUnique(...a),
      findFirst: (...a: unknown[]) => searchFindFirst(...a),
      create: (...a: unknown[]) => searchCreate(...a),
      update: (...a: unknown[]) => searchUpdate(...a),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    sourcingOffer: {
      findUnique: (...a: unknown[]) => offerFindUnique(...a),
      update: (...a: unknown[]) => offerUpdate(...a),
      createMany: (...a: unknown[]) => offerCreateMany(...a),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    logisticsQuoteRequest: { findUnique: (...a: unknown[]) => leadFindUnique(...a) },
    partRequest: { findUnique: vi.fn() },
    supplier: {
      findFirst: (...a: unknown[]) => supplierFindFirst(...a),
      create: (...a: unknown[]) => supplierCreate(...a),
    },
  },
}))

const mockEnqueue = vi.fn()
vi.mock('../queue/queueService.js', () => ({ enqueue: (...a: unknown[]) => mockEnqueue(...a) }))

const mockCreatePurchaseOrder = vi.fn()
vi.mock('../stock/stock.service.js', () => ({
  createPurchaseOrder: (...a: unknown[]) => mockCreatePurchaseOrder(...a),
}))

const mockRunOfferSearch = vi.fn()
const mockDraftSupplierMessage = vi.fn()
vi.mock('./sourcing.agent.js', () => ({
  runOfferSearch: (...a: unknown[]) => mockRunOfferSearch(...a),
  draftSupplierMessage: (...a: unknown[]) => mockDraftSupplierMessage(...a),
  sourcingModel: () => 'claude-sonnet-4-6',
}))

const {
  createSearch,
  runSourcingSearch,
  buildOfferRows,
  mapCondition,
  resolveOfferMode,
  buildOfferMatrix,
  updateOffer,
  createPurchaseOrderFromOffer,
  buildSupplierMessage,
} = await import('./sourcing.service.js')

const ADMIN = '11111111-2222-4333-8444-555555555555'

beforeEach(() => {
  vi.clearAllMocks()
  searchFindFirst.mockResolvedValue(null)
  searchCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: 'search-1',
    ...data,
  }))
  searchUpdate.mockResolvedValue({})
})

describe('createSearch', () => {
  it('reprend le snapshot de la cotation et enfile le job', async () => {
    leadFindUnique.mockResolvedValue({
      partName: 'Alternateur',
      oemReference: '27060-0T090',
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: 2015,
      quantity: 2,
    })

    const search = await createSearch({ quoteRequestId: 'lead-1' }, ADMIN)

    expect(search.partName).toBe('Alternateur')
    expect(search.quantity).toBe(2)
    expect(mockEnqueue).toHaveBeenCalledWith('SOURCING_SEARCH_RUN', { searchId: 'search-1' })
  })

  it('refuse une seconde recherche tant qu\'une tourne sur la même demande', async () => {
    leadFindUnique.mockResolvedValue({ partName: 'Alternateur', quantity: 1 })
    searchFindFirst.mockResolvedValue({ id: 'search-en-cours' })

    await expect(createSearch({ quoteRequestId: 'lead-1' }, ADMIN)).rejects.toMatchObject({
      code: 'SOURCING_SEARCH_ALREADY_RUNNING',
      statusCode: 409,
    })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('exige un nom de pièce exploitable', async () => {
    await expect(createSearch({}, ADMIN)).rejects.toMatchObject({
      code: 'SOURCING_PART_NAME_REQUIRED',
    })
  })

  it('404 si la cotation n\'existe pas', async () => {
    leadFindUnique.mockResolvedValue(null)
    await expect(createSearch({ quoteRequestId: 'absent' }, ADMIN)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('mapCondition', () => {
  it.each([
    ['Neuf', 'NEW'],
    ['Brand new', 'NEW'],
    ['occasion importée', 'USED'],
    ['Used - good condition', 'USED'],
    ['Reconditionné', 'REFURBISHED'],
    ['remanufactured', 'REFURBISHED'],
  ])('%s → %s', (label, expected) => {
    expect(mapCondition(label)).toBe(expected)
  })

  it('renvoie null quand l\'état n\'est pas annoncé', () => {
    expect(mapCondition(null)).toBeNull()
    expect(mapCondition('pièce d\'origine')).toBeNull()
  })
})

describe('buildOfferRows', () => {
  const offer = {
    fournisseur: 'Dubai Auto Parts',
    canal: 'EXPORTER' as const,
    pays: 'AE',
    prix: 120,
    devise: 'USD',
    etat: 'occasion',
    delai_jours: 7.4,
    confiance: 0.8,
  }

  it('convertit le prix en FCFA et laisse le prix NON confirmé', () => {
    const [row] = buildOfferRows('search-1', { offres: [offer] })

    expect(row?.priceCurrency).toBe('USD')
    expect(row?.priceFcfa).toBe(72600) // 120 × 605, arrondi à la centaine
    expect(row?.priceConfirmed).toBe(false)
    expect(row?.condition).toBe('USED')
    expect(row?.leadTimeDays).toBe(7)
  })

  it('laisse priceFcfa à null quand la source n\'affiche aucun prix', () => {
    const [row] = buildOfferRows('search-1', {
      offres: [{ ...offer, prix: null, devise: null }],
    })
    expect(row?.priceFcfa).toBeNull()
    expect(row?.priceAmount).toBeNull()
  })

  it('laisse priceFcfa à null sur une devise inconnue plutôt que de deviner', () => {
    const [row] = buildOfferRows('search-1', { offres: [{ ...offer, devise: 'ZWL' }] })
    expect(row?.priceFcfa).toBeNull()
  })
})

describe('runSourcingSearch', () => {
  it('écrit les offres et passe la recherche à DONE', async () => {
    searchFindUnique.mockResolvedValue({
      id: 'search-1',
      partName: 'Alternateur',
      oemReference: null,
      vehicleBrand: 'Toyota',
      vehicleModel: 'Corolla',
      vehicleYear: 2015,
      quantity: 1,
    })
    mockRunOfferSearch.mockResolvedValue({
      offres: [{ fournisseur: 'A', canal: 'EXPORTER', prix: 100, devise: 'EUR', confiance: 0.9 }],
    })

    const count = await runSourcingSearch('search-1')

    expect(count).toBe(1)
    expect(offerCreateMany).toHaveBeenCalled()
    expect(searchUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DONE' }) }),
    )
  })

  it('marque FAILED et lève quand l\'agent ne renvoie rien d\'exploitable', async () => {
    searchFindUnique.mockResolvedValue({ id: 'search-1', partName: 'Alternateur', quantity: 1 })
    mockRunOfferSearch.mockResolvedValue(null)

    await expect(runSourcingSearch('search-1')).rejects.toMatchObject({
      code: 'SOURCING_AGENT_FAILED',
    })
    expect(searchUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    )
    expect(offerCreateMany).not.toHaveBeenCalled()
  })
})

describe('resolveOfferMode', () => {
  it('respecte toujours le mode forcé par l\'ops', () => {
    expect(resolveOfferMode({ chosenMode: 'SEA_LCL', country: 'CI' })).toBe('SEA_LCL')
  })

  it('classe la Côte d\'Ivoire en achat local', () => {
    expect(resolveOfferMode({ country: 'CI' })).toBe('LOCAL')
    expect(resolveOfferMode({ country: "Côte d'Ivoire" })).toBe('LOCAL')
    expect(resolveOfferMode({ country: 'Ivory Coast' })).toBe('LOCAL')
  })

  it('bascule en maritime au-delà de 100 kg', () => {
    expect(resolveOfferMode({ country: 'AE', weightKg: 180 })).toBe('SEA_LCL')
  })

  it('prend l\'aérien express sur un délai annoncé très court', () => {
    expect(resolveOfferMode({ country: 'AE', leadTimeDays: 3 })).toBe('AIR_NOW')
  })

  it('retombe sur l\'aérien standard', () => {
    expect(resolveOfferMode({ country: 'AE' })).toBe('AIR_STANDARD')
    expect(resolveOfferMode({ country: null, leadTimeDays: 21 })).toBe('AIR_STANDARD')
  })
})

describe('buildOfferMatrix', () => {
  const baseSearch = {
    id: 'search-1',
    partName: 'Alternateur',
    oemReference: null,
    vehicleBrand: 'Toyota',
    vehicleModel: 'Corolla',
    quoteRequest: {
      economyCategory: 'ECONOMY_ICE',
      downtimeCostPerDay: 30000,
      energyType: null,
      vehicleModel: 'Corolla',
    },
  }

  it('trie par coût total et recommande la meilleure option disponible', async () => {
    searchFindUnique.mockResolvedValue({
      ...baseSearch,
      offers: [
        {
          id: 'o-air',
          status: 'SHORTLISTED',
          priceFcfa: 120000,
          leadTimeDays: 7,
          weightKg: 5,
          country: 'AE',
          chosenMode: 'AIR_STANDARD',
          priceConfirmed: false,
          supplierName: 'Air',
          condition: 'USED',
          conditionLabel: 'occasion',
          url: null,
        },
        {
          id: 'o-sea',
          status: 'SHORTLISTED',
          priceFcfa: 80000,
          leadTimeDays: 45,
          weightKg: 5,
          country: 'AE',
          chosenMode: 'SEA_LCL',
          priceConfirmed: false,
          supplierName: 'Sea',
          condition: 'USED',
          conditionLabel: 'occasion',
          url: null,
        },
      ],
    })

    const result = await buildOfferMatrix('search-1')

    // 45 j × 30 000 F d'immobilisation : le maritime moins cher perd largement.
    expect(result.options[0]?.mode).toBe('AIR_STANDARD')
    expect(result.options[0]?.recommended).toBe(true)
    expect(result.options[0]?.offerId).toBe('o-air')
    expect(result.options[0]?.totalCost).toBeLessThan(result.options[1]?.totalCost ?? 0)
    expect(result.downtimeCostPerDay).toBe(30000)
  })

  it('signale que tous les prix retenus sont non confirmés', async () => {
    searchFindUnique.mockResolvedValue({
      ...baseSearch,
      offers: [
        {
          id: 'o1',
          status: 'SHORTLISTED',
          priceFcfa: 100000,
          leadTimeDays: 7,
          weightKg: null,
          country: 'AE',
          chosenMode: null,
          priceConfirmed: false,
          supplierName: 'A',
          condition: null,
          conditionLabel: null,
          url: null,
        },
      ],
    })

    const result = await buildOfferMatrix('search-1')

    expect(result.allPricesUnconfirmed).toBe(true)
    expect(result.unconfirmedCount).toBe(1)
  })

  it('ignore les offres rejetées et celles sans prix', async () => {
    searchFindUnique.mockResolvedValue({
      ...baseSearch,
      offers: [
        { id: 'o1', status: 'REJECTED', priceFcfa: 50000, country: 'AE', priceConfirmed: false },
        { id: 'o2', status: 'CANDIDATE', priceFcfa: null, country: 'AE', priceConfirmed: false },
      ],
    })

    const result = await buildOfferMatrix('search-1')

    expect(result.matrix).toBeNull()
    expect(result.options).toEqual([])
  })
})

describe('updateOffer', () => {
  it('reconvertit le prix en FCFA quand l\'ops le corrige', async () => {
    offerFindUnique.mockResolvedValue({
      id: 'o1',
      status: 'CANDIDATE',
      priceAmount: 120,
      priceCurrency: 'USD',
    })
    offerUpdate.mockImplementation(async (args: { data: Record<string, unknown> }) => args.data)

    const data = (await updateOffer('o1', { priceAmount: 100, priceConfirmed: true })) as {
      priceFcfa: number
      priceConfirmed: boolean
    }

    expect(data.priceFcfa).toBe(60500) // 100 × 605
    expect(data.priceConfirmed).toBe(true)
  })

  it('refuse de sortir une offre déjà commandée de l\'état ORDERED', async () => {
    offerFindUnique.mockResolvedValue({ id: 'o1', status: 'ORDERED' })
    await expect(updateOffer('o1', { status: 'REJECTED' })).rejects.toMatchObject({
      code: 'SOURCING_OFFER_ORDERED',
    })
  })
})

describe('createPurchaseOrderFromOffer', () => {
  const offer = {
    id: 'o1',
    supplierName: 'Dubai Auto Parts',
    country: 'AE',
    city: 'Dubaï',
    url: 'https://example.com/p/1',
    title: 'Alternateur Denso',
    oemReference: '27060-0T090',
    priceAmount: 120,
    priceCurrency: 'USD',
    priceFcfa: 72600,
    weightKg: 5,
    leadTimeDays: 7,
    chosenMode: null,
    contactPhone: null,
    contactWhatsapp: null,
    contactEmail: null,
    purchaseOrderId: null,
    search: { partName: 'Alternateur', oemReference: '27060-0T090', quantity: 2 },
  }

  it('crée le fournisseur s\'il n\'existe pas et passe l\'offre en ORDERED', async () => {
    offerFindUnique.mockResolvedValue(offer)
    supplierFindFirst.mockResolvedValue(null)
    supplierCreate.mockResolvedValue({ id: 'sup-1' })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1', numero: 'BC-20260803-AAAA' })

    const po = await createPurchaseOrderFromOffer('o1', {}, ADMIN)

    expect(supplierCreate).toHaveBeenCalled()
    expect(po.id).toBe('po-1')
    const body = mockCreatePurchaseOrder.mock.calls[0]?.[1] as {
      devise: string
      tauxChange: number
      mode: string
      lines: Array<{ quantite: number; prixUnitaire: number }>
    }
    expect(body.devise).toBe('USD')
    expect(body.tauxChange).toBe(605)
    expect(body.mode).toBe('AIR_STANDARD') // pas de mode forcé, 7 j annoncés → au-delà du seuil express
    expect(body.lines[0]?.quantite).toBe(2)
    expect(body.lines[0]?.prixUnitaire).toBe(120)
    expect(offerUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'ORDERED', purchaseOrderId: 'po-1' } }),
    )
  })

  it('réutilise un fournisseur existant', async () => {
    offerFindUnique.mockResolvedValue(offer)
    supplierFindFirst.mockResolvedValue({ id: 'sup-existant' })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-2' })

    await createPurchaseOrderFromOffer('o1', {}, ADMIN)

    expect(supplierCreate).not.toHaveBeenCalled()
    const body = mockCreatePurchaseOrder.mock.calls[0]?.[1] as { supplierId: string }
    expect(body.supplierId).toBe('sup-existant')
  })

  it('refuse une offre sans prix', async () => {
    offerFindUnique.mockResolvedValue({ ...offer, priceAmount: null })
    await expect(createPurchaseOrderFromOffer('o1', {}, ADMIN)).rejects.toMatchObject({
      code: 'SOURCING_OFFER_NO_PRICE',
    })
  })

  it('refuse une offre déjà commandée', async () => {
    offerFindUnique.mockResolvedValue({ ...offer, purchaseOrderId: 'po-deja' })
    await expect(createPurchaseOrderFromOffer('o1', {}, ADMIN)).rejects.toMatchObject({
      code: 'SOURCING_OFFER_ORDERED',
    })
  })
})

describe('buildSupplierMessage', () => {
  it('renvoie un brouillon et les liens d\'envoi, sans rien envoyer', async () => {
    offerFindUnique.mockResolvedValue({
      id: 'o1',
      supplierName: 'Dubai Auto Parts',
      country: 'AE',
      url: null,
      oemReference: null,
      contactWhatsapp: '+971 50 123 4567',
      contactPhone: null,
      contactEmail: 'sales@example.com',
      search: {
        partName: 'Alternateur',
        oemReference: null,
        vehicleBrand: 'Toyota',
        vehicleModel: 'Corolla',
        vehicleYear: 2015,
        quantity: 2,
      },
    })
    mockDraftSupplierMessage.mockResolvedValue('Bonjour, avez-vous cette pièce ?')

    const result = await buildSupplierMessage('o1')

    expect(result.message).toContain('Bonjour')
    expect(result.whatsappUrl).toContain('https://wa.me/971501234567')
    expect(result.mailtoUrl).toContain('mailto:sales@example.com')
  })

  it('502 si le brouillon échoue', async () => {
    offerFindUnique.mockResolvedValue({
      id: 'o1',
      supplierName: 'X',
      search: { partName: 'Alternateur', quantity: 1 },
    })
    mockDraftSupplierMessage.mockResolvedValue(null)

    await expect(buildSupplierMessage('o1')).rejects.toMatchObject({
      code: 'SOURCING_MESSAGE_FAILED',
    })
  })
})
