import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')

const ADMIN = 'f0f0f0f0-1111-4222-8333-444444444444'
const SEARCH1 = '11111111-2222-4333-8444-555555555555'
const OFFER1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const OFFER2 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeef'
const SUP1 = '99999999-8888-4777-8666-555555555555'
// Les cotations logistique portent un CUID, pas un UUID.
const LEAD1 = 'clz9k3x7t0000abcd1234efgh'

const mockSearchFindFirst = vi.fn()
const mockSearchFindUnique = vi.fn()
const mockSearchCreate = vi.fn()
const mockOfferCreateMany = vi.fn()
const mockOfferFindMany = vi.fn()
const mockOfferFindUnique = vi.fn()
const mockOfferUpdate = vi.fn()
const mockOfferDelete = vi.fn()
const mockLeadFindUnique = vi.fn()
const mockSupplierFindFirst = vi.fn()
const mockSupplierCreate = vi.fn()
const mockCreatePurchaseOrder = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sourcingSearch: {
      findFirst: (...a: unknown[]) => mockSearchFindFirst(...a),
      findUnique: (...a: unknown[]) => mockSearchFindUnique(...a),
      create: (...a: unknown[]) => mockSearchCreate(...a),
    },
    sourcingOffer: {
      createMany: (...a: unknown[]) => mockOfferCreateMany(...a),
      findMany: (...a: unknown[]) => mockOfferFindMany(...a),
      findUnique: (...a: unknown[]) => mockOfferFindUnique(...a),
      update: (...a: unknown[]) => mockOfferUpdate(...a),
      delete: (...a: unknown[]) => mockOfferDelete(...a),
    },
    logisticsQuoteRequest: {
      findUnique: (...a: unknown[]) => mockLeadFindUnique(...a),
    },
    supplier: {
      findFirst: (...a: unknown[]) => mockSupplierFindFirst(...a),
      create: (...a: unknown[]) => mockSupplierCreate(...a),
    },
  },
}))

vi.mock('../stock/stock.service.js', () => ({
  createPurchaseOrder: (...a: unknown[]) => mockCreatePurchaseOrder(...a),
  PO_TRANSITIONS: {},
}))

const {
  createSearch,
  addOffersFromUrls,
  updateOffer,
  deleteOffer,
  buildOfferMatrix,
  createPurchaseOrderFromOffer,
  hostnameOf,
  guessChannel,
} = await import('./sourcing.service.js')

/** Offre minimale : seuls les champs lus par le code testé sont renseignés. */
function offer(over: Record<string, unknown> = {}) {
  return {
    id: OFFER1,
    searchId: SEARCH1,
    url: 'https://www.ebay.de/itm/1',
    sourceSite: 'ebay.de',
    supplierName: null,
    country: null,
    city: null,
    title: 'Plaquettes avant',
    oemReference: null,
    condition: null,
    source: null,
    priceAmount: null,
    priceCurrency: 'EUR',
    priceFcfa: null,
    priceConfirmed: false,
    moq: null,
    leadTimeDays: null,
    weightKg: null,
    contactPhone: null,
    contactEmail: null,
    contactWhatsapp: null,
    status: 'CANDIDATE',
    chosenMode: null,
    purchaseOrderId: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('hostnameOf / guessChannel', () => {
  it('retire le www. et met en minuscules', () => {
    expect(hostnameOf('https://WWW.Ebay.de/itm/123?x=1')).toBe('ebay.de')
    expect(hostnameOf('https://partsouq.com/en/search')).toBe('partsouq.com')
  })

  it('devine le canal depuis le domaine', () => {
    expect(guessChannel('ebay.de')).toBe('MARKETPLACE_INTL')
    expect(guessChannel('aliexpress.com')).toBe('MARKETPLACE_INTL')
    expect(guessChannel('goafricaonline.com')).toBe('LOCAL')
    expect(guessChannel('pieces-auto.ci')).toBe('LOCAL')
    expect(guessChannel('indiamart.com')).toBe('EXPORTER')
  })

  it('retombe sur MARKETPLACE_INTL pour un domaine inconnu', () => {
    expect(guessChannel('un-grossiste-quelconque.de')).toBe('MARKETPLACE_INTL')
  })
})

describe('createSearch', () => {
  it('accepte un identifiant de cotation en CUID (et pas seulement un UUID)', async () => {
    mockSearchFindFirst.mockResolvedValue(null)
    mockLeadFindUnique.mockResolvedValue({
      partName: 'Plaquettes avant',
      oemReference: 'A0044208420',
      vehicleBrand: 'Bestune',
      vehicleModel: 'T55',
      vehicleYear: 2022,
      quantity: 2,
    })
    mockSearchCreate.mockResolvedValue({ id: SEARCH1 })

    await createSearch(ADMIN, { quoteRequestId: LEAD1 })

    expect(mockSearchCreate).toHaveBeenCalledTimes(1)
    const data = mockSearchCreate.mock.calls[0]![0].data
    expect(data.quoteRequestId).toBe(LEAD1)
    expect(data.partName).toBe('Plaquettes avant')
    // Un dossier manuel n'attend rien : il naît prêt à recevoir des liens.
    expect(data.status).toBe('DONE')
    expect(data.origin).toBe('MANUAL')
  })

  it('renvoie le dossier existant plutôt que d\'en ouvrir un second', async () => {
    mockSearchFindFirst.mockResolvedValue({ id: SEARCH1 })
    const res = await createSearch(ADMIN, { quoteRequestId: LEAD1 })
    expect(res).toEqual({ id: SEARCH1 })
    expect(mockSearchCreate).not.toHaveBeenCalled()
  })

  it('refuse un dossier sans rattachement', async () => {
    await expect(createSearch(ADMIN, {})).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('addOffersFromUrls', () => {
  beforeEach(() => {
    mockSearchFindUnique.mockResolvedValue({ id: SEARCH1 })
    mockOfferFindMany.mockResolvedValue([])
  })

  it('crée une offre par lien, avec le site et le canal déduits', async () => {
    mockOfferCreateMany.mockResolvedValue({ count: 2 })

    await addOffersFromUrls(SEARCH1, ADMIN, {
      urls: ['https://www.ebay.de/itm/1', 'https://goafricaonline.com/x'],
    })

    const rows = mockOfferCreateMany.mock.calls[0]![0].data
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      url: 'https://www.ebay.de/itm/1',
      sourceSite: 'ebay.de',
      channel: 'MARKETPLACE_INTL',
      origin: 'MANUAL',
      createdById: ADMIN,
    })
    expect(rows[1]).toMatchObject({ sourceSite: 'goafricaonline.com', channel: 'LOCAL' })
  })

  it('n\'exige rien d\'autre que l\'URL — ni prix, ni pays', async () => {
    mockOfferCreateMany.mockResolvedValue({ count: 1 })
    await addOffersFromUrls(SEARCH1, ADMIN, { urls: ['https://autodoc.de/p/1'] })
    const row = mockOfferCreateMany.mock.calls[0]![0].data[0]
    expect(row.priceAmount).toBeUndefined()
    expect(row.country).toBeUndefined()
  })

  it('dédoublonne à l\'intérieur du collage et compte les liens ignorés', async () => {
    mockOfferCreateMany.mockResolvedValue({ count: 1 })

    const res = await addOffersFromUrls(SEARCH1, ADMIN, {
      urls: ['https://www.ebay.de/itm/1', 'https://www.ebay.de/itm/1'],
    })

    expect(mockOfferCreateMany.mock.calls[0]![0].data).toHaveLength(1)
    expect(mockOfferCreateMany.mock.calls[0]![0].skipDuplicates).toBe(true)
    expect(res).toMatchObject({ created: 1, skipped: 1 })
  })

  it('refuse un dossier inconnu', async () => {
    mockSearchFindUnique.mockResolvedValue(null)
    await expect(
      addOffersFromUrls(SEARCH1, ADMIN, { urls: ['https://ebay.de/x'] }),
    ).rejects.toMatchObject({ statusCode: 404 })
  })

  it('rejette une entrée qui n\'est pas une URL', async () => {
    await expect(
      addOffersFromUrls(SEARCH1, ADMIN, { urls: ['plaquettes pas chères'] }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('updateOffer', () => {
  it('recalcule priceFcfa quand le montant change', async () => {
    mockOfferFindUnique.mockResolvedValue({
      id: OFFER1,
      priceAmount: null,
      priceCurrency: 'EUR',
      status: 'CANDIDATE',
    })
    mockOfferUpdate.mockResolvedValue(offer())

    await updateOffer(OFFER1, { priceAmount: 100 })

    // 100 € × 655,957 = 65 596 F (parité fixe XOF/EUR)
    expect(mockOfferUpdate.mock.calls[0]![0].data.priceFcfa).toBe(65596)
  })

  it('recalcule priceFcfa quand seule la devise change', async () => {
    mockOfferFindUnique.mockResolvedValue({
      id: OFFER1,
      priceAmount: 100,
      priceCurrency: 'EUR',
      status: 'CANDIDATE',
    })
    mockOfferUpdate.mockResolvedValue(offer())

    await updateOffer(OFFER1, { priceCurrency: 'AED' })

    expect(mockOfferUpdate.mock.calls[0]![0].data.priceFcfa).toBe(16300)
  })

  it('ne touche pas à priceFcfa quand le prix n\'est pas concerné', async () => {
    mockOfferFindUnique.mockResolvedValue({
      id: OFFER1,
      priceAmount: 100,
      priceCurrency: 'EUR',
      status: 'CANDIDATE',
    })
    mockOfferUpdate.mockResolvedValue(offer())

    await updateOffer(OFFER1, { status: 'SHORTLISTED' })

    expect(mockOfferUpdate.mock.calls[0]![0].data.priceFcfa).toBeUndefined()
  })

  it('refuse de sortir une offre déjà commandée de son statut', async () => {
    mockOfferFindUnique.mockResolvedValue({
      id: OFFER1,
      priceAmount: 100,
      priceCurrency: 'EUR',
      status: 'ORDERED',
    })
    await expect(updateOffer(OFFER1, { status: 'REJECTED' })).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})

describe('deleteOffer', () => {
  it('supprime une offre candidate', async () => {
    mockOfferFindUnique.mockResolvedValue({ id: OFFER1, status: 'CANDIDATE' })
    mockOfferDelete.mockResolvedValue({})
    await expect(deleteOffer(OFFER1)).resolves.toEqual({ id: OFFER1 })
  })

  it('refuse de supprimer une offre commandée', async () => {
    mockOfferFindUnique.mockResolvedValue({ id: OFFER1, status: 'ORDERED' })
    await expect(deleteOffer(OFFER1)).rejects.toMatchObject({ statusCode: 422 })
  })
})

describe('buildOfferMatrix', () => {
  function searchWith(offers: ReturnType<typeof offer>[]) {
    return {
      id: SEARCH1,
      partName: 'Plaquettes avant',
      oemReference: null,
      vehicleModel: 'T55',
      quoteRequest: {
        partCategory: 'Freinage',
        economyCategory: 'PREMIUM_ICE',
        energyType: 'ICE',
      },
      offers,
    }
  }

  it('mappe le pays CI sur le mode LOCAL et le reste sur l\'aérien standard', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'CI', priceFcfa: 90_000, status: 'SHORTLISTED' }),
        offer({ id: OFFER2, country: 'DE', priceFcfa: 40_000, status: 'SHORTLISTED' }),
      ]),
    )

    const { result, offerIdByMode } = await buildOfferMatrix(SEARCH1)

    expect(offerIdByMode.LOCAL).toBe(OFFER1)
    expect(offerIdByMode.AIR_STANDARD).toBe(OFFER2)
    expect(result.options.map((o) => o.mode).sort()).toEqual(['AIR_STANDARD', 'LOCAL'])
  })

  it('respecte le mode forcé par l\'ops', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'DE', priceFcfa: 40_000, chosenMode: 'SEA_LCL', status: 'SHORTLISTED' }),
      ]),
    )
    const { offerIdByMode } = await buildOfferMatrix(SEARCH1)
    expect(offerIdByMode.SEA_LCL).toBe(OFFER1)
  })

  it('trie par coût total et recommande la première option disponible', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'CI', priceFcfa: 120_000, status: 'SHORTLISTED' }),
        offer({ id: OFFER2, country: 'DE', priceFcfa: 40_000, chosenMode: 'SEA_LCL', status: 'SHORTLISTED' }),
      ]),
    )

    const { result } = await buildOfferMatrix(SEARCH1)

    const totals = result.options.map((o) => o.totalCost)
    expect([...totals].sort((a, b) => a - b)).toEqual(totals)
    expect(result.options[0]!.recommended).toBe(true)
    // 45 j de maritime × 30 000 F d'immobilisation écrasent l'écart de prix pièce.
    expect(result.options[0]!.mode).toBe('LOCAL')
  })

  it('ne garde qu\'une offre par mode et signale celle écartée', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'DE', priceFcfa: 80_000, status: 'SHORTLISTED' }),
        offer({ id: OFFER2, country: 'FR', priceFcfa: 50_000, status: 'SHORTLISTED' }),
      ]),
    )

    const { result, offerIdByMode, ignoredOffers } = await buildOfferMatrix(SEARCH1)

    expect(result.options).toHaveLength(1)
    expect(offerIdByMode.AIR_STANDARD).toBe(OFFER2) // la moins chère gagne
    expect(ignoredOffers).toContainEqual({
      id: OFFER1,
      reason: 'Offre plus chère sur le même mode (AIR_STANDARD)',
    })
  })

  it('écarte les offres sans prix au lieu de les compter à zéro', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'DE', priceFcfa: null, status: 'SHORTLISTED' }),
        offer({ id: OFFER2, country: 'CI', priceFcfa: 50_000, status: 'SHORTLISTED' }),
      ]),
    )

    const { result, ignoredOffers, pricedCount } = await buildOfferMatrix(SEARCH1)

    expect(pricedCount).toBe(1)
    expect(result.options).toHaveLength(1)
    expect(ignoredOffers).toContainEqual({ id: OFFER1, reason: 'Prix manquant' })
  })

  it('signale que les prix ne sont pas confirmés tant qu\'un seul ne l\'est pas', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'CI', priceFcfa: 50_000, priceConfirmed: true, status: 'SHORTLISTED' }),
        offer({ id: OFFER2, country: 'DE', priceFcfa: 40_000, priceConfirmed: false, status: 'SHORTLISTED' }),
      ]),
    )
    const { allPricesConfirmed } = await buildOfferMatrix(SEARCH1)
    expect(allPricesConfirmed).toBe(false)
  })

  it('retombe sur toutes les offres non rejetées quand rien n\'est shortlisté', async () => {
    mockSearchFindUnique.mockResolvedValue(
      searchWith([
        offer({ id: OFFER1, country: 'CI', priceFcfa: 50_000, status: 'CANDIDATE' }),
        offer({ id: OFFER2, country: 'DE', priceFcfa: 40_000, status: 'REJECTED' }),
      ]),
    )
    const { result, pricedCount } = await buildOfferMatrix(SEARCH1)
    expect(pricedCount).toBe(1)
    expect(result.options[0]!.mode).toBe('LOCAL')
  })
})

describe('createPurchaseOrderFromOffer', () => {
  const base = {
    ...offer({
      id: OFFER1,
      country: 'AE',
      city: 'Dubaï',
      supplierName: 'Al Futtaim Parts',
      priceAmount: 250,
      priceCurrency: 'AED',
      priceFcfa: 40_750,
      weightKg: 3.2,
      leadTimeDays: 6,
      status: 'SHORTLISTED',
    }),
    search: { partName: 'Plaquettes avant', quantity: 2, oemReference: 'A0044208420' },
  }

  it('réutilise un fournisseur existant et délègue le calcul des frais au BC', async () => {
    mockOfferFindUnique.mockResolvedValue(base)
    mockSupplierFindFirst.mockResolvedValue({ id: SUP1 })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1', numero: 'BC-20260803-AAAA' })
    mockOfferUpdate.mockResolvedValue({})

    await createPurchaseOrderFromOffer(OFFER1, ADMIN, {})

    expect(mockSupplierCreate).not.toHaveBeenCalled()
    const [actorId, body] = mockCreatePurchaseOrder.mock.calls[0]!
    expect(actorId).toBe(ADMIN)
    expect(body).toMatchObject({
      supplierId: SUP1,
      mode: 'AIR_STANDARD',
      devise: 'AED',
      tauxChange: 163,
    })
    expect(body.lines).toHaveLength(1)
    expect(body.lines[0]).toMatchObject({
      designation: 'Plaquettes avant',
      quantite: 2,
      prixUnitaire: 250, // en devise fournisseur, pas en FCFA
      poidsEstimeKg: 3.2,
    })
    // fraisEstimes est produit par createPurchaseOrder — jamais recalculé ici.
    expect(body).not.toHaveProperty('fraisEstimes')
  })

  it('crée le fournisseur quand il n\'existe pas encore', async () => {
    mockOfferFindUnique.mockResolvedValue(base)
    mockSupplierFindFirst.mockResolvedValue(null)
    mockSupplierCreate.mockResolvedValue({ id: SUP1 })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1' })
    mockOfferUpdate.mockResolvedValue({})

    await createPurchaseOrderFromOffer(OFFER1, ADMIN, {})

    expect(mockSupplierCreate.mock.calls[0]![0].data).toMatchObject({
      nom: 'Al Futtaim Parts',
      pays: 'AE',
      devise: 'AED',
      delaiTypiqueJours: 6,
    })
  })

  it('retombe sur le nom de domaine quand le fournisseur n\'est pas renseigné', async () => {
    mockOfferFindUnique.mockResolvedValue({ ...base, supplierName: null })
    mockSupplierFindFirst.mockResolvedValue(null)
    mockSupplierCreate.mockResolvedValue({ id: SUP1 })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1' })
    mockOfferUpdate.mockResolvedValue({})

    await createPurchaseOrderFromOffer(OFFER1, ADMIN, {})

    expect(mockSupplierCreate.mock.calls[0]![0].data.nom).toBe('ebay.de')
  })

  it('passe l\'offre en ORDERED et la relie au bon de commande', async () => {
    mockOfferFindUnique.mockResolvedValue(base)
    mockSupplierFindFirst.mockResolvedValue({ id: SUP1 })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1' })
    mockOfferUpdate.mockResolvedValue({})

    await createPurchaseOrderFromOffer(OFFER1, ADMIN, {})

    expect(mockOfferUpdate).toHaveBeenCalledWith({
      where: { id: OFFER1 },
      data: { status: 'ORDERED', purchaseOrderId: 'po-1' },
    })
  })

  it('honore le MOQ quand il dépasse la quantité demandée', async () => {
    mockOfferFindUnique.mockResolvedValue({ ...base, moq: 10 })
    mockSupplierFindFirst.mockResolvedValue({ id: SUP1 })
    mockCreatePurchaseOrder.mockResolvedValue({ id: 'po-1' })
    mockOfferUpdate.mockResolvedValue({})

    await createPurchaseOrderFromOffer(OFFER1, ADMIN, {})

    expect(mockCreatePurchaseOrder.mock.calls[0]![1].lines[0].quantite).toBe(10)
  })

  it('refuse une offre sans prix', async () => {
    mockOfferFindUnique.mockResolvedValue({ ...base, priceAmount: null })
    await expect(createPurchaseOrderFromOffer(OFFER1, ADMIN, {})).rejects.toMatchObject({
      statusCode: 422,
    })
  })

  it('refuse une offre déjà commandée', async () => {
    mockOfferFindUnique.mockResolvedValue({ ...base, purchaseOrderId: 'po-0' })
    await expect(createPurchaseOrderFromOffer(OFFER1, ADMIN, {})).rejects.toMatchObject({
      statusCode: 422,
    })
  })
})
