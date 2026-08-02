import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const AGENT1 = '11111111-2222-4333-8444-555555555555'
const AGENT2 = '11111111-2222-4333-8444-555555555556'
const COM1 = '99999999-8888-4777-8666-555555555555'
const OBJ1 = '99999999-8888-4777-8666-555555555556'

const mockUserFindUnique = vi.fn()
const mockUserFindMany = vi.fn()
const mockUserCount = vi.fn()
const mockProfileUpsert = vi.fn()
const mockProfileFindMany = vi.fn()
const mockObjectiveFindMany = vi.fn()
const mockObjectiveFindUnique = vi.fn()
const mockObjectiveUpsert = vi.fn()
const mockObjectiveDelete = vi.fn()
const mockCommissionFindMany = vi.fn()
const mockCommissionFindUnique = vi.fn()
const mockCommissionCount = vi.fn()
const mockCommissionUpsert = vi.fn()
const mockCommissionUpdate = vi.fn()
const mockCommissionAggregate = vi.fn()
const mockVendorFindMany = vi.fn()
const mockVendorCount = vi.fn()
const mockOrderItemAggregate = vi.fn()
const mockContactCount = vi.fn()
const mockItemCount = vi.fn()
const mockInteractionCount = vi.fn()
const mockInteractionFindMany = vi.fn()
const mockTaskCount = vi.fn()
const mockContactActivityCount = vi.fn()
const mockActivityCount = vi.fn()
const mockActivityFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => mockUserFindUnique(...a),
      findMany: (...a: unknown[]) => mockUserFindMany(...a),
      count: (...a: unknown[]) => mockUserCount(...a),
    },
    teamMemberProfile: {
      upsert: (...a: unknown[]) => mockProfileUpsert(...a),
      findMany: (...a: unknown[]) => mockProfileFindMany(...a),
    },
    agentObjective: {
      findMany: (...a: unknown[]) => mockObjectiveFindMany(...a),
      findUnique: (...a: unknown[]) => mockObjectiveFindUnique(...a),
      upsert: (...a: unknown[]) => mockObjectiveUpsert(...a),
      delete: (...a: unknown[]) => mockObjectiveDelete(...a),
    },
    agentCommission: {
      findMany: (...a: unknown[]) => mockCommissionFindMany(...a),
      findUnique: (...a: unknown[]) => mockCommissionFindUnique(...a),
      count: (...a: unknown[]) => mockCommissionCount(...a),
      upsert: (...a: unknown[]) => mockCommissionUpsert(...a),
      update: (...a: unknown[]) => mockCommissionUpdate(...a),
      aggregate: (...a: unknown[]) => mockCommissionAggregate(...a),
    },
    vendor: {
      findMany: (...a: unknown[]) => mockVendorFindMany(...a),
      count: (...a: unknown[]) => mockVendorCount(...a),
    },
    orderItem: { aggregate: (...a: unknown[]) => mockOrderItemAggregate(...a) },
    vendorContact: { count: (...a: unknown[]) => mockContactCount(...a) },
    catalogItem: { count: (...a: unknown[]) => mockItemCount(...a) },
    crmInteraction: {
      count: (...a: unknown[]) => mockInteractionCount(...a),
      findMany: (...a: unknown[]) => mockInteractionFindMany(...a),
    },
    crmTask: { count: (...a: unknown[]) => mockTaskCount(...a) },
    contactActivity: { count: (...a: unknown[]) => mockContactActivityCount(...a) },
    activityLog: {
      count: (...a: unknown[]) => mockActivityCount(...a),
      findMany: (...a: unknown[]) => mockActivityFindMany(...a),
    },
  },
}))

const {
  currentPeriode,
  periodeBounds,
  estimateCommissionBase,
  computeCommissionAmount,
  computeObjectiveProgress,
  listMembers,
  upsertProfile,
  getMember,
  setObjective,
  deleteObjective,
  generateCommissions,
  updateCommission,
  payCommission,
  cancelCommission,
  getEquipeOverview,
} = await import('./equipe.service.js')

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Périodes
// ---------------------------------------------------------------------------

describe('periodeBounds / currentPeriode', () => {
  it('borne la période en UTC (cohérent avec la ventilation admin)', () => {
    const { start, end } = periodeBounds('2026-08')
    expect(start.toISOString()).toBe('2026-08-01T00:00:00.000Z')
    expect(end.toISOString()).toBe('2026-09-01T00:00:00.000Z')
  })

  it('currentPeriode formate en YYYY-MM', () => {
    expect(currentPeriode(new Date('2026-08-02T10:00:00Z'))).toBe('2026-08')
  })
})

// ---------------------------------------------------------------------------
// Estimation de base (règle métier centrale)
// ---------------------------------------------------------------------------

describe('estimateCommissionBase', () => {
  it('somme les OrderItem.commissionAmount des commandes COMPLETED de la période, vendeurs gérés par l’agent', async () => {
    mockVendorFindMany.mockResolvedValueOnce([{ id: 'v1' }, { id: 'v2' }])
    mockOrderItemAggregate.mockResolvedValueOnce({ _sum: { commissionAmount: 450_000 } })

    const base = await estimateCommissionBase(AGENT1, '2026-08')

    expect(base).toBe(450_000)
    expect(mockVendorFindMany).toHaveBeenCalledWith({
      where: { managedByLiaisonId: AGENT1 },
      select: { id: true },
    })
    expect(mockOrderItemAggregate).toHaveBeenCalledWith({
      where: {
        vendorId: { in: ['v1', 'v2'] },
        order: {
          status: 'COMPLETED',
          createdAt: {
            gte: new Date('2026-08-01T00:00:00.000Z'),
            lt: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
      },
      _sum: { commissionAmount: true },
    })
  })

  it('retourne 0 sans vendeur géré (pas d’agrégation)', async () => {
    mockVendorFindMany.mockResolvedValueOnce([])
    const base = await estimateCommissionBase(AGENT1, '2026-08')
    expect(base).toBe(0)
    expect(mockOrderItemAggregate).not.toHaveBeenCalled()
  })

  it('retourne 0 quand la somme est nulle', async () => {
    mockVendorFindMany.mockResolvedValueOnce([{ id: 'v1' }])
    mockOrderItemAggregate.mockResolvedValueOnce({ _sum: { commissionAmount: null } })
    expect(await estimateCommissionBase(AGENT1, '2026-08')).toBe(0)
  })
})

describe('computeCommissionAmount', () => {
  it('applique le taux puis arrondit aux 100 F', () => {
    expect(computeCommissionAmount(450_000, 10)).toBe(45_000)
    expect(computeCommissionAmount(45_250, 10)).toBe(4_500)
    expect(computeCommissionAmount(45_750, 10)).toBe(4_600)
    expect(computeCommissionAmount(0, 15)).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Progression des objectifs (7 métriques)
// ---------------------------------------------------------------------------

describe('computeObjectiveProgress', () => {
  it('VENDEURS_GERES : vendeurs actuellement gérés, sans borne de dates', async () => {
    mockVendorCount.mockResolvedValueOnce(12)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'VENDEURS_GERES')).toBe(12)
    expect(mockVendorCount).toHaveBeenCalledWith({ where: { managedByLiaisonId: AGENT1 } })
  })

  it('NOUVEAUX_VENDEURS : vendeurs gérés créés dans la période', async () => {
    mockVendorCount.mockResolvedValueOnce(3)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'NOUVEAUX_VENDEURS')).toBe(3)
    expect(mockVendorCount).toHaveBeenCalledWith({
      where: {
        managedByLiaisonId: AGENT1,
        createdAt: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lt: new Date('2026-09-01T00:00:00.000Z'),
        },
      },
    })
  })

  it('PROSPECTS_CONCLUS : contacts CONCLU mis à jour dans la période', async () => {
    mockContactCount.mockResolvedValueOnce(5)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'PROSPECTS_CONCLUS')).toBe(5)
    expect(mockContactCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ liaisonId: AGENT1, statut: 'CONCLU' }),
    })
  })

  it('PIECES_AJOUTEES : fiches créées par la liaison dans la période', async () => {
    mockItemCount.mockResolvedValueOnce(40)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'PIECES_AJOUTEES')).toBe(40)
    expect(mockItemCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ createdByLiaisonId: AGENT1 }),
    })
  })

  it('INTERACTIONS_CRM : interactions consignées par l’agent dans la période', async () => {
    mockInteractionCount.mockResolvedValueOnce(18)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'INTERACTIONS_CRM')).toBe(18)
    expect(mockInteractionCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ authorId: AGENT1 }),
    })
  })

  it('TACHES_FAITES : tâches closes (faitAt) dans la période', async () => {
    mockTaskCount.mockResolvedValueOnce(9)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'TACHES_FAITES')).toBe(9)
    expect(mockTaskCount).toHaveBeenCalledWith({
      where: {
        assigneeId: AGENT1,
        faitAt: {
          gte: new Date('2026-08-01T00:00:00.000Z'),
          lt: new Date('2026-09-01T00:00:00.000Z'),
        },
      },
    })
  })

  it('VISITES_TERRAIN : activités VISITE du carnet de prospects dans la période', async () => {
    mockContactActivityCount.mockResolvedValueOnce(7)
    expect(await computeObjectiveProgress(AGENT1, '2026-08', 'VISITES_TERRAIN')).toBe(7)
    expect(mockContactActivityCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ authorId: AGENT1, type: 'VISITE' }),
    })
  })
})

// ---------------------------------------------------------------------------
// Membres & profils
// ---------------------------------------------------------------------------

describe('listMembers', () => {
  it('retourne compteurs, commission du mois estimée et objectifs', async () => {
    mockUserFindMany.mockResolvedValueOnce([
      {
        id: AGENT1,
        name: 'Awa Koné',
        phone: '+2250700000001',
        email: null,
        createdAt: new Date('2026-01-15T00:00:00Z'),
        teamProfile: { tauxCommissionPct: 15, actif: true },
        _count: { managedVendors: 8 },
      },
    ])
    mockUserCount.mockResolvedValueOnce(1)
    mockActivityCount.mockResolvedValueOnce(12)
    mockTaskCount.mockResolvedValueOnce(2)
    mockVendorFindMany.mockResolvedValueOnce([{ id: 'v1' }])
    mockOrderItemAggregate.mockResolvedValueOnce({ _sum: { commissionAmount: 100_000 } })
    mockObjectiveFindMany.mockResolvedValueOnce([])

    const result = await listMembers({})

    expect(result.total).toBe(1)
    expect(result.members[0]).toMatchObject({
      id: AGENT1,
      vendeursGeres: 8,
      activite7j: 12,
      tachesEnRetard: 2,
      commissionMois: { baseFcfa: 100_000, tauxPct: 15, montantFcfa: 15_000 },
      objectifsMois: { atteints: 0, total: 0 },
    })
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ roles: { has: 'LIAISON' } }) }),
    )
  })
})

describe('upsertProfile', () => {
  it('404 si le membre n’existe pas', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    await expect(upsertProfile(AGENT1, { tauxCommissionPct: 12 })).rejects.toMatchObject({
      code: 'TEAM_MEMBER_NOT_FOUND',
      statusCode: 404,
    })
    expect(mockProfileUpsert).not.toHaveBeenCalled()
  })

  it('crée avec les valeurs fournies et met à jour le taux', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: AGENT1 })
    mockProfileUpsert.mockResolvedValueOnce({ userId: AGENT1, tauxCommissionPct: 12 })

    await upsertProfile(AGENT1, { tauxCommissionPct: 12, fonction: 'Liaison — Yopougon' })

    expect(mockProfileUpsert).toHaveBeenCalledWith({
      where: { userId: AGENT1 },
      create: expect.objectContaining({
        userId: AGENT1,
        fonction: 'Liaison — Yopougon',
        tauxCommissionPct: 12,
      }),
      update: expect.objectContaining({ tauxCommissionPct: 12, fonction: 'Liaison — Yopougon' }),
    })
  })

  it('rejette un taux hors 0–100', async () => {
    await expect(upsertProfile(AGENT1, { tauxCommissionPct: 120 })).rejects.toMatchObject({
      code: 'VALIDATION',
      statusCode: 422,
    })
  })
})

describe('getMember', () => {
  it('404 si le membre n’existe pas', async () => {
    mockUserFindUnique.mockResolvedValueOnce(null)
    await expect(getMember(AGENT1)).rejects.toMatchObject({ code: 'TEAM_MEMBER_NOT_FOUND' })
  })
})

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

describe('setObjective', () => {
  it('upserte par (agent, période, métrique) et retourne la progression', async () => {
    mockUserFindUnique.mockResolvedValueOnce({ id: AGENT1 })
    mockObjectiveUpsert.mockResolvedValueOnce({
      id: OBJ1,
      agentId: AGENT1,
      periode: '2026-08',
      metrique: 'VISITES_TERRAIN',
      cible: 20,
    })
    mockContactActivityCount.mockResolvedValueOnce(7)

    const result = await setObjective(AGENT1, {
      periode: '2026-08',
      metrique: 'VISITES_TERRAIN',
      cible: 20,
    })

    expect(mockObjectiveUpsert).toHaveBeenCalledWith({
      where: {
        agentId_periode_metrique: {
          agentId: AGENT1,
          periode: '2026-08',
          metrique: 'VISITES_TERRAIN',
        },
      },
      create: { agentId: AGENT1, periode: '2026-08', metrique: 'VISITES_TERRAIN', cible: 20 },
      update: { cible: 20 },
    })
    expect(result).toMatchObject({ id: OBJ1, progression: 7 })
  })

  it('rejette une période mal formée', async () => {
    await expect(
      setObjective(AGENT1, { periode: '2026-13', metrique: 'VENDEURS_GERES', cible: 10 }),
    ).rejects.toMatchObject({ code: 'VALIDATION', statusCode: 422 })
    expect(mockObjectiveUpsert).not.toHaveBeenCalled()
  })
})

describe('deleteObjective', () => {
  it('404 si introuvable', async () => {
    mockObjectiveFindUnique.mockResolvedValueOnce(null)
    await expect(deleteObjective(OBJ1)).rejects.toMatchObject({ code: 'OBJECTIVE_NOT_FOUND' })
    expect(mockObjectiveDelete).not.toHaveBeenCalled()
  })

  it('supprime un objectif existant', async () => {
    mockObjectiveFindUnique.mockResolvedValueOnce({ id: OBJ1 })
    mockObjectiveDelete.mockResolvedValueOnce({ id: OBJ1 })
    await deleteObjective(OBJ1)
    expect(mockObjectiveDelete).toHaveBeenCalledWith({ where: { id: OBJ1 } })
  })
})

// ---------------------------------------------------------------------------
// Génération des commissions
// ---------------------------------------------------------------------------

describe('generateCommissions', () => {
  it('crée une DUE pour un profil actif avec base > 0', async () => {
    mockProfileFindMany.mockResolvedValueOnce([{ userId: AGENT1, tauxCommissionPct: 10 }])
    mockCommissionFindUnique.mockResolvedValueOnce(null)
    mockVendorFindMany.mockResolvedValueOnce([{ id: 'v1' }])
    mockOrderItemAggregate.mockResolvedValueOnce({ _sum: { commissionAmount: 450_000 } })
    mockCommissionUpsert.mockResolvedValueOnce({})

    const result = await generateCommissions({ periode: '2026-08' })

    expect(mockCommissionUpsert).toHaveBeenCalledWith({
      where: { agentId_periode: { agentId: AGENT1, periode: '2026-08' } },
      create: {
        agentId: AGENT1,
        periode: '2026-08',
        baseFcfa: 450_000,
        tauxPct: 10,
        montantFcfa: 45_000,
        statut: 'DUE',
      },
      update: { baseFcfa: 450_000, tauxPct: 10, montantFcfa: 45_000, statut: 'DUE' },
    })
    expect(result).toMatchObject({
      periode: '2026-08',
      creees: 1,
      misesAJour: 0,
      sautees: 0,
      profilsActifs: 1,
    })
  })

  it('base 0 → statut ESTIMEE', async () => {
    mockProfileFindMany.mockResolvedValueOnce([{ userId: AGENT1, tauxCommissionPct: 10 }])
    mockCommissionFindUnique.mockResolvedValueOnce(null)
    mockVendorFindMany.mockResolvedValueOnce([])
    mockCommissionUpsert.mockResolvedValueOnce({})

    await generateCommissions({ periode: '2026-08' })

    expect(mockCommissionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ baseFcfa: 0, montantFcfa: 0, statut: 'ESTIMEE' }),
      }),
    )
  })

  it('ne réécrit jamais une PAYEE ni une ANNULEE, met à jour une DUE', async () => {
    mockProfileFindMany.mockResolvedValueOnce([
      { userId: AGENT1, tauxCommissionPct: 10 },
      { userId: AGENT2, tauxCommissionPct: 10 },
    ])
    // AGENT1 : PAYEE existante → skip. AGENT2 : DUE existante → mise à jour.
    mockCommissionFindUnique
      .mockResolvedValueOnce({ id: COM1, statut: 'PAYEE' })
      .mockResolvedValueOnce({ id: 'com-2', statut: 'DUE' })
    mockVendorFindMany.mockResolvedValueOnce([{ id: 'v9' }])
    mockOrderItemAggregate.mockResolvedValueOnce({ _sum: { commissionAmount: 200_000 } })
    mockCommissionUpsert.mockResolvedValueOnce({})

    const result = await generateCommissions({ periode: '2026-08' })

    expect(mockCommissionUpsert).toHaveBeenCalledTimes(1)
    expect(mockCommissionUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { agentId_periode: { agentId: AGENT2, periode: '2026-08' } },
      }),
    )
    expect(result).toMatchObject({ creees: 0, misesAJour: 1, sautees: 1 })
  })

  it('rejette une période mal formée', async () => {
    await expect(generateCommissions({ periode: 'août 2026' })).rejects.toMatchObject({
      code: 'VALIDATION',
      statusCode: 422,
    })
    expect(mockProfileFindMany).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cycle de vie d'une commission
// ---------------------------------------------------------------------------

describe('updateCommission', () => {
  it('404 si introuvable', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce(null)
    await expect(updateCommission(COM1, { montantFcfa: 10_000 })).rejects.toMatchObject({
      code: 'COMMISSION_NOT_FOUND',
    })
  })

  it('409 si déjà payée', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'PAYEE' })
    await expect(updateCommission(COM1, { montantFcfa: 10_000 })).rejects.toMatchObject({
      code: 'COMMISSION_ALREADY_PAID',
      statusCode: 409,
    })
    expect(mockCommissionUpdate).not.toHaveBeenCalled()
  })

  it('met à jour montant et note tant que non payée', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'DUE' })
    mockCommissionUpdate.mockResolvedValueOnce({ id: COM1, montantFcfa: 50_000 })
    await updateCommission(COM1, { montantFcfa: 50_000, note: 'Ajustement prime' })
    expect(mockCommissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COM1 },
        data: { montantFcfa: 50_000, note: 'Ajustement prime' },
      }),
    )
  })
})

describe('payCommission', () => {
  it('DUE → PAYEE avec horodatage', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'DUE' })
    mockCommissionUpdate.mockResolvedValueOnce({ id: COM1, statut: 'PAYEE' })
    await payCommission(COM1)
    expect(mockCommissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COM1 },
        data: { statut: 'PAYEE', paidAt: expect.any(Date) },
      }),
    )
  })

  it('409 si déjà payée', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'PAYEE' })
    await expect(payCommission(COM1)).rejects.toMatchObject({
      code: 'COMMISSION_ALREADY_PAID',
      statusCode: 409,
    })
    expect(mockCommissionUpdate).not.toHaveBeenCalled()
  })

  it('422 si annulée', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'ANNULEE' })
    await expect(payCommission(COM1)).rejects.toMatchObject({
      code: 'COMMISSION_INVALID_TRANSITION',
      statusCode: 422,
    })
  })
})

describe('cancelCommission', () => {
  it('DUE → ANNULEE (paidAt effacé)', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'DUE' })
    mockCommissionUpdate.mockResolvedValueOnce({ id: COM1, statut: 'ANNULEE' })
    await cancelCommission(COM1)
    expect(mockCommissionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: COM1 },
        data: { statut: 'ANNULEE', paidAt: null },
      }),
    )
  })

  it('409 si déjà payée', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'PAYEE' })
    await expect(cancelCommission(COM1)).rejects.toMatchObject({
      code: 'COMMISSION_ALREADY_PAID',
      statusCode: 409,
    })
    expect(mockCommissionUpdate).not.toHaveBeenCalled()
  })

  it('idempotent sur une ANNULEE', async () => {
    mockCommissionFindUnique.mockResolvedValueOnce({ id: COM1, statut: 'ANNULEE' })
    const result = await cancelCommission(COM1)
    expect(result).toMatchObject({ id: COM1, statut: 'ANNULEE' })
    expect(mockCommissionUpdate).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

describe('getEquipeOverview', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('compte les membres actifs, commissions dues/payées et activité 7 j (avant mi-mois)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T09:00:00Z'))

    mockUserCount.mockResolvedValueOnce(6)
    mockUserFindMany.mockResolvedValueOnce([{ id: AGENT1 }, { id: AGENT2 }])
    mockCommissionAggregate
      .mockResolvedValueOnce({ _sum: { montantFcfa: 130_000 }, _count: { _all: 4 } })
      .mockResolvedValueOnce({ _sum: { montantFcfa: 1_020_000 }, _count: { _all: 22 } })
    mockActivityCount.mockResolvedValueOnce(45)

    const result = await getEquipeOverview()

    expect(result).toMatchObject({
      periode: '2026-08',
      membresActifs: 6,
      commissionsDues: { count: 4, montantFcfa: 130_000 },
      commissionsPayeesAnnee: { count: 22, montantFcfa: 1_020_000 },
      objectifsSous50: 0,
      miMois: false,
      activites7j: 45,
    })
    // Avant mi-mois : la progression des objectifs n'est pas calculée.
    expect(mockObjectiveFindMany).not.toHaveBeenCalled()
  })

  it('à mi-mois, compte les objectifs sous 50 % de progression', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T09:00:00Z'))

    mockUserCount.mockResolvedValueOnce(1)
    mockUserFindMany.mockResolvedValueOnce([{ id: AGENT1 }])
    mockCommissionAggregate
      .mockResolvedValueOnce({ _sum: { montantFcfa: 0 }, _count: { _all: 0 } })
      .mockResolvedValueOnce({ _sum: { montantFcfa: 0 }, _count: { _all: 0 } })
    mockActivityCount.mockResolvedValueOnce(3)
    mockObjectiveFindMany.mockResolvedValueOnce([
      { id: OBJ1, agentId: AGENT1, periode: '2026-08', metrique: 'VISITES_TERRAIN', cible: 20 },
    ])
    mockContactActivityCount.mockResolvedValueOnce(5) // 5 < 10 (50 % de 20)

    const result = await getEquipeOverview()

    expect(result.miMois).toBe(true)
    expect(result.objectifsSous50).toBe(1)
  })
})
