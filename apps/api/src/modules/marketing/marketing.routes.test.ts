import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const CAMP1 = '99999999-8888-4777-8666-555555555555'

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

const mockGetMarketingOverview = vi.fn()
const mockListAudiences = vi.fn()
const mockPreviewAudience = vi.fn()
const mockListCampaigns = vi.fn()
const mockCreateCampaign = vi.fn()
const mockGetCampaign = vi.fn()
const mockLaunchCampaign = vi.fn()
const mockCancelCampaign = vi.fn()
const mockRecordActivity = vi.fn().mockResolvedValue(undefined)

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    // Contexte staff chargé par requireCapability sur toute route back-office.
    teamMemberProfile: { findUnique: vi.fn().mockResolvedValue(null) },
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
  },
}))

vi.mock('../../lib/activityLog.js', () => ({
  recordActivity: (...args: unknown[]) => mockRecordActivity(...args),
}))

vi.mock('./marketing.service.js', () => ({
  getMarketingOverview: (...args: unknown[]) => mockGetMarketingOverview(...args),
  listAudiences: (...args: unknown[]) => mockListAudiences(...args),
  previewAudience: (...args: unknown[]) => mockPreviewAudience(...args),
  listCampaigns: (...args: unknown[]) => mockListCampaigns(...args),
  createCampaign: (...args: unknown[]) => mockCreateCampaign(...args),
  getCampaign: (...args: unknown[]) => mockGetCampaign(...args),
  launchCampaign: (...args: unknown[]) => mockLaunchCampaign(...args),
  cancelCampaign: (...args: unknown[]) => mockCancelCampaign(...args),
}))

const { buildApp } = await import('../../server.js')

function mockAuth(roles: string[] = ['ADMIN'], activeContext = 'ADMIN') {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-admin-1',
    phone: '+2250700000000',
    roles,
    activeContext,
    consentedAt: new Date(),
  })
  return { authorization: 'Bearer test-token' }
}

describe('Marketing Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordActivity.mockResolvedValue(undefined)
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/marketing/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/overview',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockGetMarketingOverview).not.toHaveBeenCalled()
  })

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetMarketingOverview.mockResolvedValueOnce({
      total: 7,
      parStatut: { BROUILLON: 3, PLANIFIEE: 1, EN_COURS: 0, TERMINEE: 3, ANNULEE: 0 },
      envoyes30j: 120,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/overview',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ total: 7, envoyes30j: 120 })
  })

  it('returns 200 with the audiences payload', async () => {
    mockListAudiences.mockResolvedValueOnce({
      segmentsClients: [{ key: 'a_risque', label: 'À risque', count: 12 }],
      segmentsVendeurs: [{ key: 'actif', label: 'Actifs', count: 30 }],
      tags: [{ id: 'tag-1', nom: 'VIP', couleur: '#fff', count: 4 }],
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/audiences',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.segmentsClients).toHaveLength(1)
  })

  it('returns 200 with an audience preview', async () => {
    mockPreviewAudience.mockResolvedValueOnce({
      total: 12,
      optouts: 2,
      sansTelephone: 1,
      echantillon: [{ nom: 'Awa', telephone: '+2250700000001' }],
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/audiences/preview?audienceType=SEGMENT_CLIENT&audienceValue=a_risque',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(mockPreviewAudience).toHaveBeenCalledWith(
      expect.objectContaining({ audienceType: 'SEGMENT_CLIENT', audienceValue: 'a_risque' }),
    )
  })

  it('returns 422 for an invalid audienceType on preview', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/audiences/preview?audienceType=INCONNU&audienceValue=a_risque',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockPreviewAudience).not.toHaveBeenCalled()
  })

  it('lists campaigns with filters', async () => {
    mockListCampaigns.mockResolvedValueOnce({
      campaigns: [{ id: CAMP1, statut: 'TERMINEE' }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/campaigns?statut=TERMINEE',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(mockListCampaigns).toHaveBeenCalledWith(expect.objectContaining({ statut: 'TERMINEE' }))
  })

  it('creates a campaign and records the activity', async () => {
    mockCreateCampaign.mockResolvedValueOnce({ id: CAMP1, statut: 'BROUILLON' })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/marketing/campaigns',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        nom: 'Promo août',
        message: 'Bonjour, -20% sur les plaquettes cette semaine !',
        audienceType: 'SEGMENT_CLIENT',
        audienceValue: 'a_risque',
      }),
    })

    expect(response.statusCode).toBe(200)
    expect(mockCreateCampaign).toHaveBeenCalledWith(
      {
        nom: 'Promo août',
        message: 'Bonjour, -20% sur les plaquettes cette semaine !',
        audienceType: 'SEGMENT_CLIENT',
        audienceValue: 'a_risque',
      },
      'prisma-admin-1',
    )
    expect(mockRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'prisma-admin-1',
        action: 'CAMPAIGN_CREATED',
        targetType: 'MarketingCampaign',
        targetId: CAMP1,
      }),
    )
  })

  it('returns 422 for an empty message on create', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/marketing/campaigns',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        nom: 'Promo août',
        message: '',
        audienceType: 'SEGMENT_CLIENT',
        audienceValue: 'a_risque',
      }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('returns 422 for an invalid audienceType on create', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/marketing/campaigns',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        nom: 'Promo août',
        message: 'Hello',
        audienceType: 'INCONNU',
        audienceValue: 'a_risque',
      }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockCreateCampaign).not.toHaveBeenCalled()
  })

  it('returns 200 with a campaign detail', async () => {
    mockGetCampaign.mockResolvedValueOnce({ id: CAMP1, nom: 'Promo août' })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/marketing/campaigns/${CAMP1}`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ id: CAMP1 })
  })

  it('returns 422 for a non-uuid campaign id', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/marketing/campaigns/pas-un-uuid',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockGetCampaign).not.toHaveBeenCalled()
  })

  it('launches a campaign and records the activity', async () => {
    mockLaunchCampaign.mockResolvedValueOnce({ id: CAMP1, statut: 'EN_COURS', totalCibles: 12 })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/marketing/campaigns/${CAMP1}/launch`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ statut: 'EN_COURS', totalCibles: 12 })
    expect(mockRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CAMPAIGN_LAUNCHED',
        targetType: 'MarketingCampaign',
        targetId: CAMP1,
      }),
    )
  })

  it('cancels a campaign and records the activity', async () => {
    mockCancelCampaign.mockResolvedValueOnce({ id: CAMP1, statut: 'ANNULEE', nom: 'Promo août' })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/marketing/campaigns/${CAMP1}/cancel`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ statut: 'ANNULEE' })
    expect(mockRecordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CAMPAIGN_CANCELLED',
        targetType: 'MarketingCampaign',
        targetId: CAMP1,
      }),
    )
  })
})
