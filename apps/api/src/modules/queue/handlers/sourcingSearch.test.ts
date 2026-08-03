import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from '@prisma/client'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockMarkCompleted = vi.fn()
const mockMarkFailed = vi.fn()
const mockRunOfferSearch = vi.fn()
const mockPersist = vi.fn()
const mockIsConfigured = vi.fn()

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    sourcingSearch: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

vi.mock('../queueService.js', () => ({
  markCompleted: (...a: unknown[]) => mockMarkCompleted(...a),
  markFailed: (...a: unknown[]) => mockMarkFailed(...a),
}))

vi.mock('../../../lib/anthropic.js', () => ({
  isAnthropicConfigured: () => mockIsConfigured(),
}))

vi.mock('../../sourcing/sourcing.agent.js', () => ({
  runOfferSearch: (...a: unknown[]) => mockRunOfferSearch(...a),
  sourcingModel: () => 'claude-sonnet-4-6',
}))

vi.mock('../../sourcing/sourcing.service.js', () => ({
  persistSearchResults: (...a: unknown[]) => mockPersist(...a),
}))

const { handleSourcingSearchRun } = await import('./sourcingSearch.js')

const logger = { info: vi.fn(), warn: vi.fn() }
const job = { id: 'job-1', payload: { searchId: 's1' } } as unknown as Job

const search = {
  id: 's1',
  status: 'PENDING',
  partName: 'Plaquettes avant',
  oemReference: null,
  vehicleBrand: 'Toyota',
  vehicleModel: 'Yaris',
  vehicleYear: 2018,
  quantity: 1,
}

describe('handleSourcingSearchRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsConfigured.mockReturnValue(true)
    mockUpdate.mockResolvedValue({})
    mockPersist.mockResolvedValue({})
  })

  it('exécute la recherche et persiste les offres', async () => {
    mockFindUnique.mockResolvedValue(search)
    mockRunOfferSearch.mockResolvedValue({ offers: [{ supplierName: 'A' }], note: null })

    await handleSourcingSearchRun(job, logger)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RUNNING' }) }),
    )
    expect(mockPersist).toHaveBeenCalledWith('s1', { offers: [{ supplierName: 'A' }], note: null })
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('marque FAILED sans clé API, sans consommer de retry', async () => {
    mockFindUnique.mockResolvedValue(search)
    mockIsConfigured.mockReturnValue(false)

    await handleSourcingSearchRun(job, logger)

    expect(mockRunOfferSearch).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED', error: 'ANTHROPIC_API_KEY absente' }),
      }),
    )
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
    expect(mockMarkFailed).not.toHaveBeenCalled()
  })

  it('marque FAILED quand l\'agent ne renvoie rien', async () => {
    mockFindUnique.mockResolvedValue(search)
    mockRunOfferSearch.mockResolvedValue(null)

    await handleSourcingSearchRun(job, logger)

    expect(mockPersist).not.toHaveBeenCalled()
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED' }) }),
    )
  })

  it('sort en silence si la recherche est déjà terminée (pas de doublon d\'offres)', async () => {
    mockFindUnique.mockResolvedValue({ ...search, status: 'DONE' })

    await handleSourcingSearchRun(job, logger)

    expect(mockRunOfferSearch).not.toHaveBeenCalled()
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('marque le job en échec et la recherche FAILED sur exception', async () => {
    mockFindUnique.mockResolvedValue(search)
    mockRunOfferSearch.mockRejectedValue(new Error('boom'))

    await handleSourcingSearchRun(job, logger)

    expect(mockMarkFailed).toHaveBeenCalledWith('job-1', 'boom')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'FAILED', error: 'boom' }) }),
    )
  })

  it('termine sans rien faire quand le payload n\'a pas de searchId', async () => {
    await handleSourcingSearchRun({ id: 'job-2', payload: {} } as unknown as Job, logger)
    expect(mockFindUnique).not.toHaveBeenCalled()
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-2')
  })
})
