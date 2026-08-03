import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('ANTHROPIC_API_KEY', 'test-key')

const mockCreateWithPauseResume = vi.fn()
const mockMessagesCreate = vi.fn()

vi.mock('../../lib/anthropic.js', async () => {
  const actual = await vi.importActual<typeof import('../../lib/anthropic.js')>(
    '../../lib/anthropic.js',
  )
  return {
    ...actual,
    createWithPauseResume: (...args: unknown[]) => mockCreateWithPauseResume(...args),
    getAnthropicClient: () => ({ messages: { create: (...a: unknown[]) => mockMessagesCreate(...a) } }),
  }
})

const { runOfferSearch, draftSupplierMessage } = await import('./sourcing.agent.js')

const logger = { warn: vi.fn() }

const textResponse = (text: string) => ({ content: [{ type: 'text', text }] })

const validOutput = {
  offers: [
    {
      supplierName: 'Al Nahda Auto Parts',
      channel: 'EXPORTER',
      country: 'AE',
      url: 'https://example.com/p/1',
      priceAmount: 120,
      priceCurrency: 'AED',
      leadTimeDays: 4,
      confidence: 0.8,
    },
  ],
  note: null,
}

describe('runOfferSearch', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renvoie les offres quand la sortie est valide', async () => {
    mockCreateWithPauseResume.mockResolvedValue(textResponse(JSON.stringify(validOutput)))
    const result = await runOfferSearch({ partName: 'Plaquettes avant' }, logger)
    expect(result?.offers).toHaveLength(1)
    expect(result?.offers[0]?.supplierName).toBe('Al Nahda Auto Parts')
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it('tolère les fences markdown autour du JSON', async () => {
    mockCreateWithPauseResume.mockResolvedValue(
      textResponse('```json\n' + JSON.stringify(validOutput) + '\n```'),
    )
    const result = await runOfferSearch({ partName: 'Plaquettes avant' }, logger)
    expect(result?.offers).toHaveLength(1)
  })

  it('renvoie null et journalise quand la sortie ne valide pas le schéma', async () => {
    mockCreateWithPauseResume.mockResolvedValue(
      textResponse(JSON.stringify({ offers: [{ channel: 'EXPORTER' }] })),
    )
    const result = await runOfferSearch({ partName: 'Plaquettes avant' }, logger)
    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SOURCING_SEARCH_INVALID_OUTPUT' }),
      expect.any(String),
    )
  })

  it('renvoie null sur erreur API sans lever', async () => {
    mockCreateWithPauseResume.mockRejectedValue(new Error('529 overloaded'))
    const result = await runOfferSearch({ partName: 'Plaquettes avant' }, logger)
    expect(result).toBeNull()
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'SOURCING_SEARCH_API_ERROR' }),
      expect.any(String),
    )
  })

  it('borne la recherche web à 12 usages', async () => {
    mockCreateWithPauseResume.mockResolvedValue(textResponse(JSON.stringify(validOutput)))
    await runOfferSearch({ partName: 'Plaquettes avant' }, logger)
    const params = mockCreateWithPauseResume.mock.calls[0]?.[0] as {
      tools: { max_uses: number; name: string }[]
    }
    expect(params.tools[0]?.name).toBe('web_search')
    expect(params.tools[0]?.max_uses).toBe(12)
  })
})

describe('draftSupplierMessage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renvoie le texte du brouillon', async () => {
    mockMessagesCreate.mockResolvedValue(textResponse('Bonjour, avez-vous cette pièce ?'))
    const msg = await draftSupplierMessage({
      supplierName: 'X',
      partName: 'Plaquettes',
      quantity: 1,
    })
    expect(msg).toBe('Bonjour, avez-vous cette pièce ?')
  })

  it("n'utilise jamais la recherche web", async () => {
    mockMessagesCreate.mockResolvedValue(textResponse('ok'))
    await draftSupplierMessage({ supplierName: 'X', partName: 'P', quantity: 1 })
    const params = mockMessagesCreate.mock.calls[0]?.[0] as { tools?: unknown }
    expect(params.tools).toBeUndefined()
  })

  it('renvoie null sur erreur API', async () => {
    mockMessagesCreate.mockRejectedValue(new Error('timeout'))
    const msg = await draftSupplierMessage(
      { supplierName: 'X', partName: 'P', quantity: 1 },
      logger,
    )
    expect(msg).toBeNull()
    expect(logger.warn).toHaveBeenCalled()
  })
})
