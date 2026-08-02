import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const AGENT1 = '11111111-2222-4333-8444-555555555555'
const COM1 = '99999999-8888-4777-8666-555555555555'

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

const mockGetEquipeOverview = vi.fn()
const mockListMembers = vi.fn()
const mockUpsertProfile = vi.fn()
const mockGetMember = vi.fn()
const mockListObjectives = vi.fn()
const mockSetObjective = vi.fn()
const mockDeleteObjective = vi.fn()
const mockListCommissions = vi.fn()
const mockGenerateCommissions = vi.fn()
const mockUpdateCommission = vi.fn()
const mockPayCommission = vi.fn()
const mockCancelCommission = vi.fn()

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
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    vendor: { findUnique: vi.fn() },
  },
}))

vi.mock('../../lib/activityLog.js', () => ({
  recordActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./equipe.service.js', () => ({
  getEquipeOverview: (...args: unknown[]) => mockGetEquipeOverview(...args),
  listMembers: (...args: unknown[]) => mockListMembers(...args),
  upsertProfile: (...args: unknown[]) => mockUpsertProfile(...args),
  getMember: (...args: unknown[]) => mockGetMember(...args),
  listObjectives: (...args: unknown[]) => mockListObjectives(...args),
  setObjective: (...args: unknown[]) => mockSetObjective(...args),
  deleteObjective: (...args: unknown[]) => mockDeleteObjective(...args),
  listCommissions: (...args: unknown[]) => mockListCommissions(...args),
  generateCommissions: (...args: unknown[]) => mockGenerateCommissions(...args),
  updateCommission: (...args: unknown[]) => mockUpdateCommission(...args),
  payCommission: (...args: unknown[]) => mockPayCommission(...args),
  cancelCommission: (...args: unknown[]) => mockCancelCommission(...args),
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

describe('Equipe Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/equipe/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/equipe/overview',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockGetEquipeOverview).not.toHaveBeenCalled()
  })

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetEquipeOverview.mockResolvedValueOnce({
      periode: '2026-08',
      membresActifs: 6,
      commissionsDues: { count: 4, montantFcfa: 130_000 },
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/equipe/overview',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ membresActifs: 6 })
  })

  it('returns 200 with the members list', async () => {
    mockListMembers.mockResolvedValueOnce({
      members: [{ id: AGENT1 }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/equipe/members?actif=true',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ total: 1 })
  })

  it('upserts a member profile (PUT)', async () => {
    mockUpsertProfile.mockResolvedValueOnce({ userId: AGENT1, tauxCommissionPct: 12 })

    const app = buildApp()
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/equipe/members/${AGENT1}/profile`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ tauxCommissionPct: 12, fonction: 'Liaison — Yopougon' }),
    })

    expect(response.statusCode).toBe(200)
    expect(mockUpsertProfile).toHaveBeenCalledWith(AGENT1, {
      tauxCommissionPct: 12,
      fonction: 'Liaison — Yopougon',
    })
  })

  it('returns 422 for an out-of-range taux on profile upsert', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/equipe/members/${AGENT1}/profile`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ tauxCommissionPct: 150 }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockUpsertProfile).not.toHaveBeenCalled()
  })

  it('sets an objective (PUT)', async () => {
    mockSetObjective.mockResolvedValueOnce({ id: 'obj-1', cible: 20, progression: 7 })

    const app = buildApp()
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/equipe/members/${AGENT1}/objectives`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ periode: '2026-08', metrique: 'VISITES_TERRAIN', cible: 20 }),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ cible: 20, progression: 7 })
  })

  it('returns 422 for an invalid objective (cible 0)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'PUT',
      url: `/api/v1/admin/equipe/members/${AGENT1}/objectives`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ periode: '2026-08', metrique: 'VISITES_TERRAIN', cible: 0 }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockSetObjective).not.toHaveBeenCalled()
  })

  it('returns 422 for a malformed periode on generate', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/equipe/commissions/generate',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ periode: '2026-13' }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockGenerateCommissions).not.toHaveBeenCalled()
  })

  it('generates commissions for a periode', async () => {
    mockGenerateCommissions.mockResolvedValueOnce({
      periode: '2026-08',
      creees: 5,
      misesAJour: 1,
      sautees: 2,
      profilsActifs: 8,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/equipe/commissions/generate',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ periode: '2026-08' }),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ creees: 5, sautees: 2 })
  })

  it('lists commissions with filters', async () => {
    mockListCommissions.mockResolvedValueOnce({
      commissions: [{ id: COM1, statut: 'DUE' }],
      total: 1,
      page: 1,
      limit: 50,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/equipe/commissions?periode=2026-08&statut=DUE',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(mockListCommissions).toHaveBeenCalledWith(
      expect.objectContaining({ periode: '2026-08', statut: 'DUE' }),
    )
  })

  it('marks a commission as paid', async () => {
    mockPayCommission.mockResolvedValueOnce({
      id: COM1,
      statut: 'PAYEE',
      agentId: AGENT1,
      periode: '2026-08',
      montantFcfa: 45_000,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/equipe/commissions/${COM1}/pay`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ statut: 'PAYEE' })
  })

  it('cancels a commission', async () => {
    mockCancelCommission.mockResolvedValueOnce({
      id: COM1,
      statut: 'ANNULEE',
      agentId: AGENT1,
      periode: '2026-08',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/equipe/commissions/${COM1}/cancel`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ statut: 'ANNULEE' })
  })
})
