import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const CAMP1 = '99999999-8888-4777-8666-555555555555'
const ADMIN1 = '11111111-2222-4333-8444-555555555555'

const mockUserFindMany = vi.fn()
const mockVendorFindMany = vi.fn()
const mockTagAssignmentFindMany = vi.fn()
const mockTagFindMany = vi.fn()
const mockCampaignCount = vi.fn()
const mockCampaignGroupBy = vi.fn()
const mockCampaignAggregate = vi.fn()
const mockCampaignFindMany = vi.fn()
const mockCampaignCreate = vi.fn()
const mockCampaignFindUnique = vi.fn()
const mockCampaignUpdate = vi.fn()

const mockResolveClientSegmentIds = vi.fn()
const mockResolveVendorSegmentIds = vi.fn()
const mockCountClientSegments = vi.fn()

const mockEnqueue = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { findMany: (...a: unknown[]) => mockUserFindMany(...a) },
    vendor: { findMany: (...a: unknown[]) => mockVendorFindMany(...a) },
    crmTagAssignment: { findMany: (...a: unknown[]) => mockTagAssignmentFindMany(...a) },
    crmTag: { findMany: (...a: unknown[]) => mockTagFindMany(...a) },
    marketingCampaign: {
      count: (...a: unknown[]) => mockCampaignCount(...a),
      groupBy: (...a: unknown[]) => mockCampaignGroupBy(...a),
      aggregate: (...a: unknown[]) => mockCampaignAggregate(...a),
      findMany: (...a: unknown[]) => mockCampaignFindMany(...a),
      create: (...a: unknown[]) => mockCampaignCreate(...a),
      findUnique: (...a: unknown[]) => mockCampaignFindUnique(...a),
      update: (...a: unknown[]) => mockCampaignUpdate(...a),
    },
  },
}))

vi.mock('../../lib/crmSegments.js', () => ({
  resolveClientSegmentIds: (...a: unknown[]) => mockResolveClientSegmentIds(...a),
  resolveVendorSegmentIds: (...a: unknown[]) => mockResolveVendorSegmentIds(...a),
  countClientSegments: (...a: unknown[]) => mockCountClientSegments(...a),
}))

vi.mock('../queue/queueService.js', () => ({
  enqueue: (...a: unknown[]) => mockEnqueue(...a),
}))

const {
  resolveAudienceRecipients,
  getMarketingOverview,
  listAudiences,
  previewAudience,
  listCampaigns,
  createCampaign,
  getCampaign,
  launchCampaign,
  cancelCampaign,
} = await import('./marketing.service.js')

beforeEach(() => {
  vi.clearAllMocks()
})

function user(over: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    name: 'Awa Koné',
    phone: '+2250700000001',
    notificationPreference: null,
    ...over,
  }
}

function vendor(over: Record<string, unknown> = {}) {
  return {
    id: 'v1',
    shopName: 'Garage Moderne',
    phone: '+2250700000002',
    userId: null,
    user: null,
    ...over,
  }
}

function campaign(over: Record<string, unknown> = {}) {
  return {
    id: CAMP1,
    nom: 'Promo août',
    message: 'Bonjour, promo !',
    audienceType: 'SEGMENT_CLIENT',
    audienceValue: 'actif',
    statut: 'BROUILLON',
    scheduledAt: null,
    createdById: ADMIN1,
    ...over,
  }
}

// ---------------------------------------------------------------------------
// Résolution d'audience
// ---------------------------------------------------------------------------

describe('resolveAudienceRecipients', () => {
  it('SEGMENT_CLIENT : résout les utilisateurs avec téléphone et opt-out', async () => {
    mockResolveClientSegmentIds.mockResolvedValueOnce(['u1', 'u2'])
    mockUserFindMany.mockResolvedValueOnce([
      user(),
      user({ id: 'u2', name: 'Kofi', phone: null, notificationPreference: { whatsapp: false } }),
    ])

    const recipients = await resolveAudienceRecipients('SEGMENT_CLIENT', 'a_risque')

    expect(mockResolveClientSegmentIds).toHaveBeenCalledWith('a_risque')
    expect(mockUserFindMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1', 'u2'] } },
      select: {
        id: true,
        name: true,
        phone: true,
        notificationPreference: { select: { whatsapp: true } },
      },
    })
    expect(recipients).toEqual([
      { subject: 'USER', subjectId: 'u1', nom: 'Awa Koné', phone: '+2250700000001', optedOut: false },
      { subject: 'USER', subjectId: 'u2', nom: 'Kofi', phone: null, optedOut: true },
    ])
  })

  it('SEGMENT_CLIENT : clé de segment inconnue → liste vide, sans appel', async () => {
    const recipients = await resolveAudienceRecipients('SEGMENT_CLIENT', 'segment_inconnu')
    expect(recipients).toEqual([])
    expect(mockResolveClientSegmentIds).not.toHaveBeenCalled()
    expect(mockUserFindMany).not.toHaveBeenCalled()
  })

  it('SEGMENT_VENDEUR : opt-out via le compte utilisateur lié', async () => {
    mockResolveVendorSegmentIds.mockResolvedValueOnce(['v1', 'v2'])
    mockVendorFindMany.mockResolvedValueOnce([
      vendor({
        userId: 'u9',
        user: { notificationPreference: { whatsapp: false } },
      }),
      vendor({ id: 'v2', shopName: 'Pièces Express' }),
    ])

    const recipients = await resolveAudienceRecipients('SEGMENT_VENDEUR', 'actif')

    expect(mockResolveVendorSegmentIds).toHaveBeenCalledWith('actif')
    expect(recipients).toEqual([
      {
        subject: 'VENDOR',
        subjectId: 'v1',
        nom: 'Garage Moderne',
        phone: '+2250700000002',
        optedOut: true,
      },
      {
        subject: 'VENDOR',
        subjectId: 'v2',
        nom: 'Pièces Express',
        phone: '+2250700000002',
        optedOut: false,
      },
    ])
  })

  it('SEGMENT_VENDEUR : clé de segment inconnue → liste vide, sans appel', async () => {
    const recipients = await resolveAudienceRecipients('SEGMENT_VENDEUR', 'nimporte_quoi')
    expect(recipients).toEqual([])
    expect(mockResolveVendorSegmentIds).not.toHaveBeenCalled()
  })

  it('TAG : audience mixte utilisateurs + vendeurs', async () => {
    mockTagAssignmentFindMany.mockResolvedValueOnce([
      { tagId: 'tag-1', subject: 'USER', subjectId: 'u1' },
      { tagId: 'tag-1', subject: 'VENDOR', subjectId: 'v1' },
    ])
    mockUserFindMany.mockResolvedValueOnce([user()])
    mockVendorFindMany.mockResolvedValueOnce([vendor()])

    const recipients = await resolveAudienceRecipients('TAG', 'tag-1')

    expect(mockTagAssignmentFindMany).toHaveBeenCalledWith({ where: { tagId: 'tag-1' } })
    expect(recipients).toHaveLength(2)
    expect(recipients[0]).toMatchObject({ subject: 'USER', subjectId: 'u1' })
    expect(recipients[1]).toMatchObject({ subject: 'VENDOR', subjectId: 'v1' })
  })

  it('TAG : aucune assignation → liste vide sans requêtes complémentaires', async () => {
    mockTagAssignmentFindMany.mockResolvedValueOnce([])

    const recipients = await resolveAudienceRecipients('TAG', 'tag-1')

    expect(recipients).toEqual([])
    expect(mockUserFindMany).not.toHaveBeenCalled()
    expect(mockVendorFindMany).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cockpit & audiences
// ---------------------------------------------------------------------------

describe('getMarketingOverview', () => {
  it('agrège les campagnes par statut et les envois des 30 derniers jours', async () => {
    mockCampaignCount.mockResolvedValueOnce(7)
    mockCampaignGroupBy.mockResolvedValueOnce([
      { statut: 'BROUILLON', _count: { _all: 3 } },
      { statut: 'TERMINEE', _count: { _all: 4 } },
    ])
    mockCampaignAggregate.mockResolvedValueOnce({ _sum: { envoyes: 120 } })

    const overview = await getMarketingOverview()

    expect(overview).toEqual({
      total: 7,
      parStatut: { BROUILLON: 3, PLANIFIEE: 0, EN_COURS: 0, TERMINEE: 4, ANNULEE: 0 },
      envoyes30j: 120,
    })
    expect(mockCampaignAggregate).toHaveBeenCalledWith({
      where: { statut: 'TERMINEE', completedAt: { gte: expect.any(Date) } },
      _sum: { envoyes: true },
    })
  })
})

describe('listAudiences', () => {
  it('retourne segments clients, vendeurs et tags avec compteurs', async () => {
    mockCountClientSegments.mockResolvedValueOnce({
      nouveau: 5,
      actif: 20,
      fidele: 8,
      a_risque: 12,
      inactif: 30,
    })
    mockResolveVendorSegmentIds
      .mockResolvedValueOnce(['v1', 'v2']) // actif
      .mockResolvedValueOnce(['v3']) // sans_commande_30j
      .mockResolvedValueOnce([]) // fiche_incomplete
      .mockResolvedValueOnce(['v1']) // litiges_ouverts
    mockTagFindMany.mockResolvedValueOnce([
      { id: 'tag-1', nom: 'VIP', couleur: '#002366', _count: { assignments: 4 } },
    ])

    const audiences = await listAudiences()

    expect(audiences.segmentsClients).toEqual([
      { key: 'nouveau', label: 'Nouveaux', count: 5 },
      { key: 'actif', label: 'Actifs', count: 20 },
      { key: 'fidele', label: 'Fidèles', count: 8 },
      { key: 'a_risque', label: 'À risque', count: 12 },
      { key: 'inactif', label: 'Inactifs', count: 30 },
    ])
    expect(audiences.segmentsVendeurs).toEqual([
      { key: 'actif', label: 'Actifs', count: 2 },
      { key: 'sans_commande_30j', label: 'Sans commande depuis 30 j', count: 1 },
      { key: 'fiche_incomplete', label: 'Fiche incomplète', count: 0 },
      { key: 'litiges_ouverts', label: 'Litiges ouverts', count: 1 },
    ])
    expect(audiences.tags).toEqual([{ id: 'tag-1', nom: 'VIP', couleur: '#002366', count: 4 }])
  })
})

describe('previewAudience', () => {
  it('retourne les compteurs et un échantillon de 10 maximum', async () => {
    const users = Array.from({ length: 12 }, (_, i) => user({ id: `u${i}` }))
    users[0]!.notificationPreference = { whatsapp: false }
    users[1]!.notificationPreference = { whatsapp: false }
    users[2]!.phone = null
    mockResolveClientSegmentIds.mockResolvedValueOnce(users.map((u) => u.id))
    mockUserFindMany.mockResolvedValueOnce(users)

    const preview = await previewAudience({ audienceType: 'SEGMENT_CLIENT', audienceValue: 'actif' })

    expect(preview.total).toBe(12)
    expect(preview.optouts).toBe(2)
    expect(preview.sansTelephone).toBe(1)
    expect(preview.echantillon).toHaveLength(10)
    expect(preview.echantillon[0]).toEqual({ nom: 'Awa Koné', telephone: '+2250700000001' })
  })

  it('rejette une requête invalide avec MARKETING_INVALID_QUERY (400)', async () => {
    await expect(
      previewAudience({ audienceType: 'INCONNU', audienceValue: 'actif' }),
    ).rejects.toMatchObject({ code: 'MARKETING_INVALID_QUERY', statusCode: 400 })
  })
})

// ---------------------------------------------------------------------------
// Campagnes — liste, création, fiche
// ---------------------------------------------------------------------------

describe('listCampaigns', () => {
  it('pagine et filtre par statut, les plus récentes d’abord', async () => {
    mockCampaignFindMany.mockResolvedValueOnce([campaign()])
    mockCampaignCount.mockResolvedValueOnce(21)

    const result = await listCampaigns({ statut: 'BROUILLON', page: 2, limit: 10 })

    expect(result).toMatchObject({ total: 21, page: 2, limit: 10 })
    expect(mockCampaignFindMany).toHaveBeenCalledWith({
      where: { statut: 'BROUILLON' },
      orderBy: { createdAt: 'desc' },
      skip: 10,
      take: 10,
      include: { createdBy: { select: { name: true } } },
    })
    expect(mockCampaignCount).toHaveBeenCalledWith({ where: { statut: 'BROUILLON' } })
  })
})

describe('createCampaign', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-02T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const body = {
    nom: 'Promo août',
    message: 'Bonjour, promo !',
    audienceType: 'SEGMENT_CLIENT',
    audienceValue: 'actif',
  }

  it('crée un BROUILLON sans date d’envoi', async () => {
    mockCampaignCreate.mockResolvedValueOnce(campaign())

    await createCampaign(body, ADMIN1)

    expect(mockCampaignCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nom: 'Promo août',
        statut: 'BROUILLON',
        scheduledAt: null,
        createdById: ADMIN1,
      }),
      include: { createdBy: { select: { name: true } } },
    })
  })

  it('crée une PLANIFIEE avec une date d’envoi future', async () => {
    mockCampaignCreate.mockResolvedValueOnce(campaign({ statut: 'PLANIFIEE' }))

    await createCampaign({ ...body, scheduledAt: '2026-08-05T08:00:00.000Z' }, ADMIN1)

    expect(mockCampaignCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        statut: 'PLANIFIEE',
        scheduledAt: new Date('2026-08-05T08:00:00.000Z'),
      }),
      include: { createdBy: { select: { name: true } } },
    })
  })

  it('une date d’envoi passée reste un BROUILLON', async () => {
    mockCampaignCreate.mockResolvedValueOnce(campaign())

    await createCampaign({ ...body, scheduledAt: '2026-08-01T08:00:00.000Z' }, ADMIN1)

    expect(mockCampaignCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ statut: 'BROUILLON' }),
      include: { createdBy: { select: { name: true } } },
    })
  })

  it('rejette un message vide avec VALIDATION (422)', async () => {
    await expect(createCampaign({ ...body, message: '' }, ADMIN1)).rejects.toMatchObject({
      code: 'VALIDATION',
      statusCode: 422,
    })
    expect(mockCampaignCreate).not.toHaveBeenCalled()
  })
})

describe('getCampaign', () => {
  it('retourne la campagne avec son créateur', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign())
    const result = await getCampaign(CAMP1)
    expect(result).toMatchObject({ id: CAMP1 })
    expect(mockCampaignFindUnique).toHaveBeenCalledWith({
      where: { id: CAMP1 },
      include: { createdBy: { select: { name: true } } },
    })
  })

  it('404 CAMPAIGN_NOT_FOUND si absente', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(null)
    await expect(getCampaign(CAMP1)).rejects.toMatchObject({
      code: 'CAMPAIGN_NOT_FOUND',
      statusCode: 404,
    })
  })
})

// ---------------------------------------------------------------------------
// Lancement & annulation
// ---------------------------------------------------------------------------

describe('launchCampaign', () => {
  const NOW = new Date('2026-08-02T10:00:00.000Z')

  it('404 si la campagne est absente', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(null)
    await expect(launchCampaign(CAMP1, NOW)).rejects.toMatchObject({
      code: 'CAMPAIGN_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('409 si le statut ne permet pas le lancement', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign({ statut: 'TERMINEE' }))
    await expect(launchCampaign(CAMP1, NOW)).rejects.toMatchObject({
      code: 'CAMPAIGN_INVALID_STATUS',
      statusCode: 409,
    })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('422 si l’audience est vide', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign())
    mockResolveClientSegmentIds.mockResolvedValueOnce([])

    await expect(launchCampaign(CAMP1, NOW)).rejects.toMatchObject({
      code: 'MARKETING_EMPTY_AUDIENCE',
      statusCode: 422,
    })
    expect(mockCampaignUpdate).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('lancement immédiat : EN_COURS, totalCibles figé, job enfilé sans date', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign())
    mockResolveClientSegmentIds.mockResolvedValueOnce(['u1', 'u2', 'u3'])
    mockUserFindMany.mockResolvedValueOnce([user(), user({ id: 'u2' }), user({ id: 'u3' })])
    mockCampaignUpdate.mockResolvedValueOnce(campaign({ statut: 'EN_COURS', totalCibles: 3 }))

    const result = await launchCampaign(CAMP1, NOW)

    expect(mockCampaignUpdate).toHaveBeenCalledWith({
      where: { id: CAMP1 },
      data: { statut: 'EN_COURS', totalCibles: 3, startedAt: NOW },
      include: { createdBy: { select: { name: true } } },
    })
    expect(mockEnqueue).toHaveBeenCalledWith(
      'MARKETING_CAMPAIGN_SEND',
      { campaignId: CAMP1 },
      { maxAttempts: 1 },
    )
    expect(result).toMatchObject({ statut: 'EN_COURS', totalCibles: 3 })
  })

  it('lancement planifié : PLANIFIEE, job enfilé à la date d’envoi', async () => {
    const scheduledAt = new Date('2026-08-05T08:00:00.000Z')
    mockCampaignFindUnique.mockResolvedValueOnce(
      campaign({ statut: 'PLANIFIEE', scheduledAt }),
    )
    mockResolveClientSegmentIds.mockResolvedValueOnce(['u1'])
    mockUserFindMany.mockResolvedValueOnce([user()])
    mockCampaignUpdate.mockResolvedValueOnce(
      campaign({ statut: 'PLANIFIEE', scheduledAt, totalCibles: 1 }),
    )

    await launchCampaign(CAMP1, NOW)

    expect(mockCampaignUpdate).toHaveBeenCalledWith({
      where: { id: CAMP1 },
      data: { statut: 'PLANIFIEE', totalCibles: 1 },
      include: { createdBy: { select: { name: true } } },
    })
    expect(mockEnqueue).toHaveBeenCalledWith(
      'MARKETING_CAMPAIGN_SEND',
      { campaignId: CAMP1 },
      { maxAttempts: 1, scheduledAt },
    )
  })

  it('une date d’envoi passée bascule en envoi immédiat', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(
      campaign({ statut: 'PLANIFIEE', scheduledAt: new Date('2026-08-01T08:00:00.000Z') }),
    )
    mockResolveClientSegmentIds.mockResolvedValueOnce(['u1'])
    mockUserFindMany.mockResolvedValueOnce([user()])
    mockCampaignUpdate.mockResolvedValueOnce(campaign({ statut: 'EN_COURS', totalCibles: 1 }))

    await launchCampaign(CAMP1, NOW)

    expect(mockCampaignUpdate).toHaveBeenCalledWith({
      where: { id: CAMP1 },
      data: { statut: 'EN_COURS', totalCibles: 1, startedAt: NOW },
      include: { createdBy: { select: { name: true } } },
    })
    expect(mockEnqueue).toHaveBeenCalledWith(
      'MARKETING_CAMPAIGN_SEND',
      { campaignId: CAMP1 },
      { maxAttempts: 1 },
    )
  })
})

describe('cancelCampaign', () => {
  it('404 si la campagne est absente', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(null)
    await expect(cancelCampaign(CAMP1)).rejects.toMatchObject({
      code: 'CAMPAIGN_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('409 si la campagne est en cours', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign({ statut: 'EN_COURS' }))
    await expect(cancelCampaign(CAMP1)).rejects.toMatchObject({
      code: 'CAMPAIGN_INVALID_STATUS',
      statusCode: 409,
    })
    expect(mockCampaignUpdate).not.toHaveBeenCalled()
  })

  it('annule un brouillon', async () => {
    mockCampaignFindUnique.mockResolvedValueOnce(campaign())
    mockCampaignUpdate.mockResolvedValueOnce(campaign({ statut: 'ANNULEE' }))

    const result = await cancelCampaign(CAMP1)

    expect(mockCampaignUpdate).toHaveBeenCalledWith({
      where: { id: CAMP1 },
      data: { statut: 'ANNULEE' },
      include: { createdBy: { select: { name: true } } },
    })
    expect(result).toMatchObject({ statut: 'ANNULEE' })
  })
})
