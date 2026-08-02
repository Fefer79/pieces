import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Job } from '@prisma/client'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCampaignFindUnique = vi.fn()
const mockCampaignUpdate = vi.fn()
const mockInteractionCreate = vi.fn()
const mockNotify = vi.fn()
const mockResolveAudience = vi.fn()
const mockMarkCompleted = vi.fn()
const mockMarkFailed = vi.fn()

vi.mock('../../../lib/prisma.js', () => ({
  prisma: {
    marketingCampaign: {
      findUnique: (...args: unknown[]) => mockCampaignFindUnique(...args),
      update: (...args: unknown[]) => mockCampaignUpdate(...args),
    },
    crmInteraction: {
      create: (...args: unknown[]) => mockInteractionCreate(...args),
    },
  },
}))

vi.mock('../../whatsapp/whatsapp.service.js', () => ({
  notifyWhatsAppUser: (...args: unknown[]) => mockNotify(...args),
}))

vi.mock('../../marketing/marketing.service.js', () => ({
  resolveAudienceRecipients: (...args: unknown[]) => mockResolveAudience(...args),
}))

vi.mock('../queueService.js', () => ({
  markCompleted: (...args: unknown[]) => mockMarkCompleted(...args),
  markFailed: (...args: unknown[]) => mockMarkFailed(...args),
}))

const { handleMarketingCampaignSend } = await import('./marketingCampaignSend.js')

const logger = { info: vi.fn(), warn: vi.fn() }

function job(payload: unknown = { campaignId: 'camp-1' }): Job {
  return { id: 'job-1', payload } as Job
}

function campaign(over: Record<string, unknown> = {}) {
  return {
    id: 'camp-1',
    nom: 'Relance août',
    message: 'Bonjour, la livraison est offerte ce mois-ci.',
    audienceType: 'SEGMENT_CLIENT',
    audienceValue: 'a_risque',
    statut: 'EN_COURS',
    createdById: 'admin-1',
    ...over,
  }
}

function recipient(over: Record<string, unknown> = {}) {
  return {
    subject: 'USER',
    subjectId: 'u1',
    nom: 'Awa',
    phone: '+2250700000000',
    optedOut: false,
    ...over,
  }
}

describe('handleMarketingCampaignSend', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotify.mockResolvedValue({ sent: true, channel: 'cloud' })
    mockInteractionCreate.mockResolvedValue({})
    mockCampaignUpdate.mockResolvedValue({})
  })

  it('complete silencieusement un job sans campaignId', async () => {
    await handleMarketingCampaignSend(job({}), logger)

    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
    expect(mockCampaignFindUnique).not.toHaveBeenCalled()
  })

  it.each(['ANNULEE', 'TERMINEE'])('ignore une campagne %s sans rien envoyer', async (statut) => {
    mockCampaignFindUnique.mockResolvedValue(campaign({ statut }))

    await handleMarketingCampaignSend(job(), logger)

    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
    expect(mockResolveAudience).not.toHaveBeenCalled()
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('fait passer une campagne PLANIFIEE à EN_COURS avant l’envoi', async () => {
    mockCampaignFindUnique.mockResolvedValue(campaign({ statut: 'PLANIFIEE' }))
    mockResolveAudience.mockResolvedValue([])

    await handleMarketingCampaignSend(job(), logger)

    expect(mockCampaignUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'camp-1' },
        data: expect.objectContaining({ statut: 'EN_COURS' }),
      }),
    )
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
  })

  it('envoie aux destinataires éligibles et compte exclusions et échecs', async () => {
    mockCampaignFindUnique.mockResolvedValue(campaign())
    mockResolveAudience.mockResolvedValue([
      recipient({ subjectId: 'u1', phone: '+2250700000001' }),
      recipient({ subjectId: 'u2', optedOut: true }),
      recipient({ subjectId: 'u3', phone: null }),
      recipient({ subjectId: 'u4', phone: '+2250700000004' }),
    ])
    // Le 2e envoi échoue côté fournisseur.
    mockNotify
      .mockResolvedValueOnce({ sent: true, channel: 'cloud' })
      .mockResolvedValueOnce({ sent: false, channel: null })

    await handleMarketingCampaignSend(job(), logger)

    // Seuls les 2 destinataires éligibles sont contactés.
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenCalledWith('+2250700000001', campaign().message)
    expect(mockNotify).toHaveBeenCalledWith('+2250700000004', campaign().message)

    // L'interaction CRM est tracée pour chaque envoi tenté, même en échec.
    expect(mockInteractionCreate).toHaveBeenCalledTimes(2)
    expect(mockInteractionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subject: 'USER',
          subjectId: 'u1',
          type: 'RELANCE',
          authorId: 'admin-1',
          meta: { campaignId: 'camp-1', sent: true, channel: 'cloud' },
        }),
      }),
    )

    // Compteurs finaux et clôture de la campagne.
    expect(mockCampaignUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: 'camp-1' },
        data: expect.objectContaining({
          envoyes: 1,
          echecs: 1,
          optouts: 1,
          sansTelephone: 1,
          statut: 'TERMINEE',
        }),
      }),
    )
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-1')
    expect(mockMarkFailed).not.toHaveBeenCalled()
  })

  it('marque le job en échec si le traitement lève une erreur', async () => {
    mockCampaignFindUnique.mockRejectedValue(new Error('db down'))

    await handleMarketingCampaignSend(job(), logger)

    expect(mockMarkFailed).toHaveBeenCalledWith('job-1', 'db down')
    expect(mockMarkCompleted).not.toHaveBeenCalled()
  })
})
