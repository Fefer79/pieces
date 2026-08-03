import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('ANTHROPIC_API_KEY', 'sk-test')
vi.stubEnv('PINO_LOG_LEVEL', 'error')

const mockCreateWithPauseResume = vi.fn()
const mockMessagesCreate = vi.fn()

vi.mock('../../lib/anthropic.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/anthropic.js')>(
    '../../lib/anthropic.js',
  )
  return {
    ...actual,
    createWithPauseResume: (...a: unknown[]) => mockCreateWithPauseResume(...a),
    getAnthropicClient: () => ({ messages: { create: (...a: unknown[]) => mockMessagesCreate(...a) } }),
  }
})

const { runOfferSearch, draftSupplierMessage, MAX_WEB_SEARCHES } = await import('./sourcing.agent.js')

const textResponse = (text: string) => ({ content: [{ type: 'text', text }] })

const VALID_OUTPUT = {
  offres: [
    {
      fournisseur: 'Dubai Auto Parts',
      canal: 'EXPORTER',
      pays: 'AE',
      ville: 'Dubaï',
      url: 'https://example.com/p/123',
      site: 'example.com',
      titre: 'Alternateur Toyota Corolla 2015',
      marque: 'Denso',
      reference_oem: '27060-0T090',
      etat: 'occasion',
      prix: 120,
      devise: 'USD',
      frais_livraison: 30,
      quantite_minimale: 1,
      delai_jours: 7,
      poids_kg: 5.4,
      disponibilite: 'en stock',
      telephone: null,
      email: 'sales@example.com',
      whatsapp: null,
      confiance: 0.86,
    },
  ],
  note: null,
}

const INPUT = {
  partName: 'Alternateur',
  oemReference: '27060-0T090',
  vehicleBrand: 'Toyota',
  vehicleModel: 'Corolla',
  vehicleYear: 2015,
  quantity: 1,
}

describe('runOfferSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('parse une sortie valide et borne la recherche web', async () => {
    mockCreateWithPauseResume.mockResolvedValue(textResponse(JSON.stringify(VALID_OUTPUT)))

    const result = await runOfferSearch(INPUT)

    expect(result?.offres).toHaveLength(1)
    expect(result?.offres[0]?.fournisseur).toBe('Dubai Auto Parts')
    expect(result?.offres[0]?.prix).toBe(120)

    const params = mockCreateWithPauseResume.mock.calls[0]?.[0] as {
      tools: Array<{ name: string; max_uses: number }>
    }
    expect(params.tools[0]?.name).toBe('web_search')
    expect(params.tools[0]?.max_uses).toBe(MAX_WEB_SEARCHES)
  })

  it('tolère les fences markdown autour du JSON', async () => {
    mockCreateWithPauseResume.mockResolvedValue(
      textResponse('```json\n' + JSON.stringify(VALID_OUTPUT) + '\n```'),
    )
    const result = await runOfferSearch(INPUT)
    expect(result?.offres).toHaveLength(1)
  })

  it('renvoie null et journalise sur sortie invalide', async () => {
    mockCreateWithPauseResume.mockResolvedValue(textResponse('{"offres": "pas un tableau"}'))
    const warn = vi.fn()

    const result = await runOfferSearch(INPUT, { warn })

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SOURCING_OFFERS_INVALID_OUTPUT' }),
      expect.any(String),
    )
  })

  it('renvoie null sur erreur API', async () => {
    mockCreateWithPauseResume.mockRejectedValue(new Error('529 overloaded'))
    const warn = vi.fn()

    const result = await runOfferSearch(INPUT, { warn })

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SOURCING_OFFERS_API_ERROR', error: '529 overloaded' }),
      expect.any(String),
    )
  })

  it('accepte une liste vide (aucune offre trouvée)', async () => {
    mockCreateWithPauseResume.mockResolvedValue(
      textResponse(JSON.stringify({ offres: [], note: 'Référence introuvable en ligne' })),
    )
    const result = await runOfferSearch(INPUT)
    expect(result?.offres).toEqual([])
    expect(result?.note).toBe('Référence introuvable en ligne')
  })
})

describe('draftSupplierMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renvoie le texte du brouillon sans utiliser la recherche web', async () => {
    mockMessagesCreate.mockResolvedValue(textResponse('Bonjour,\nAvez-vous cette pièce ?'))

    const message = await draftSupplierMessage({
      supplierName: 'Dubai Auto Parts',
      country: 'AE',
      partName: 'Alternateur',
      quantity: 2,
    })

    expect(message).toContain('Bonjour')
    const params = mockMessagesCreate.mock.calls[0]?.[0] as { tools?: unknown }
    expect(params.tools).toBeUndefined()
  })

  it('renvoie null sur erreur API', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('timeout'))
    const warn = vi.fn()

    const message = await draftSupplierMessage(
      { supplierName: 'X', partName: 'Alternateur' },
      { warn },
    )

    expect(message).toBeNull()
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SOURCING_MESSAGE_API_ERROR' }),
      expect.any(String),
    )
  })
})
