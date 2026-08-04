import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockStaffFindUnique = vi.fn()

const mockGetErpIdentity = vi.fn()
const mockListStaff = vi.fn()
const mockListStaffCandidates = vi.fn()
const mockCreateStaff = vi.fn()
const mockUpdateStaff = vi.fn()
const mockGetNavCounts = vi.fn()
const mockSearchErp = vi.fn()
const mockGetAdminOverview = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

// `loadStaffContext` interroge directement Prisma : c'est la garde elle-même
// qu'on teste ici, on ne la simule pas.
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      upsert: (...args: unknown[]) => mockUserUpsert(...args),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    staffMember: { findUnique: (...args: unknown[]) => mockStaffFindUnique(...args) },
    vendor: { findUnique: vi.fn() },
  },
}))

vi.mock('./erp.service.js', () => ({
  getErpIdentity: (...args: unknown[]) => mockGetErpIdentity(...args),
  listStaff: (...args: unknown[]) => mockListStaff(...args),
  listStaffCandidates: (...args: unknown[]) => mockListStaffCandidates(...args),
  createStaff: (...args: unknown[]) => mockCreateStaff(...args),
  updateStaff: (...args: unknown[]) => mockUpdateStaff(...args),
  getNavCounts: (...args: unknown[]) => mockGetNavCounts(...args),
  searchErp: (...args: unknown[]) => mockSearchErp(...args),
}))

vi.mock('../admin/admin.service.js', () => ({
  getAdminOverview: (...args: unknown[]) => mockGetAdminOverview(...args),
}))

const { buildApp } = await import('../../server.js')

/** Authentifie un appelant. `staff` = fiche équipe renvoyée par Prisma. */
function mockAuth(
  roles: string[] = ['BUYER'],
  staff: {
    id: string
    staffRole: string
    businessUnits: string[]
    title: string | null
    active: boolean
  } | null = null,
) {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  mockUserUpsert.mockResolvedValueOnce({
    id: 'prisma-user-1',
    phone: '+2250700000000',
    roles,
    activeContext: roles[0],
    consentedAt: new Date(),
  })
  mockStaffFindUnique.mockResolvedValue(staff)
  return { authorization: 'Bearer test-token' }
}

const COMPTABLE = {
  id: 'staff-1',
  staffRole: 'COMPTABLE',
  businessUnits: ['MARKETPLACE'],
  title: 'Comptable',
  active: true,
}

describe('Routes ERP — garde', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetErpIdentity.mockResolvedValue({
      id: 'prisma-user-1',
      name: 'Awa',
      phone: '+2250700000000',
      email: null,
    })
  })

  it('refuse sans authentification', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/erp/cockpit' })
    expect(res.statusCode).toBe(401)
  })

  /**
   * /me répond 200 même sans capacité : c'est ce qui permet au web de
   * distinguer « pas connecté » de « pas de l'équipe ».
   */
  it('rend 200 et zéro capacité pour un utilisateur hors équipe', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/me',
      headers: mockAuth(['BUYER'], null),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.capabilities).toEqual([])
    expect(body.data.staffRole).toBeNull()
    expect(body.data.isPlatformAdmin).toBe(false)
  })

  it('refuse le cockpit à un utilisateur hors équipe', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/cockpit',
      headers: mockAuth(['BUYER'], null),
    })
    expect(res.statusCode).toBe(403)
    expect(mockGetAdminOverview).not.toHaveBeenCalled()
  })

  it('ouvre la console à un membre de l’équipe', async () => {
    mockGetAdminOverview.mockResolvedValueOnce({ totals: {}, thisMonth: {}, revenueByMonth: [], topVendors: [] })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/cockpit',
      headers: mockAuth(['BUYER'], COMPTABLE),
    })
    expect(res.statusCode).toBe(200)
    expect(mockGetAdminOverview).toHaveBeenCalled()
  })

  it('ferme la console à un membre désactivé', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/cockpit',
      headers: mockAuth(['BUYER'], { ...COMPTABLE, active: false }),
    })
    expect(res.statusCode).toBe(403)
  })

  /** Amorçage : un ADMIN plateforme entre sans fiche équipe. */
  it('laisse entrer un ADMIN plateforme sans fiche', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/me',
      headers: mockAuth(['ADMIN'], null),
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.data.isPlatformAdmin).toBe(true)
    expect(body.data.capabilities).toContain('erp:admin')
  })
})

describe('Routes ERP — équipe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse l’enrôlement à un membre sans erp:admin', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/erp/staff',
      headers: { ...mockAuth(['BUYER'], COMPTABLE), 'content-type': 'application/json' },
      payload: JSON.stringify({ userId: 'u-1', staffRole: 'SUPPORT', businessUnits: [] }),
    })
    expect(res.statusCode).toBe(403)
    expect(mockCreateStaff).not.toHaveBeenCalled()
  })

  it('autorise l’enrôlement par la direction', async () => {
    mockCreateStaff.mockResolvedValueOnce({ member: { id: 'staff-2' } })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/erp/staff',
      headers: {
        ...mockAuth(['BUYER'], { ...COMPTABLE, staffRole: 'DIRECTION' }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ userId: 'u-1', staffRole: 'SUPPORT', businessUnits: ['FLOTTE'] }),
    })
    expect(res.statusCode).toBe(201)
    expect(mockCreateStaff).toHaveBeenCalled()
  })

  it('refuse un rôle métier inconnu', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/erp/staff',
      headers: {
        ...mockAuth(['BUYER'], { ...COMPTABLE, staffRole: 'DIRECTION' }),
        'content-type': 'application/json',
      },
      payload: JSON.stringify({ userId: 'u-1', staffRole: 'PLOMBIER', businessUnits: [] }),
    })
    expect(res.statusCode).toBe(422)
    expect(mockCreateStaff).not.toHaveBeenCalled()
  })

  it('laisse tout membre consulter la liste de l’équipe', async () => {
    mockListStaff.mockResolvedValueOnce({ members: [] })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/staff',
      headers: mockAuth(['BUYER'], { ...COMPTABLE, staffRole: 'SUPPORT' }),
    })
    expect(res.statusCode).toBe(200)
  })
})

describe('Routes ERP — compteurs et recherche', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Les compteurs sont filtrés par capacité côté service : la route transmet
   * les capacités de l'appelant, jamais une liste en dur.
   */
  it('transmet les capacités de l’appelant aux compteurs', async () => {
    mockGetNavCounts.mockResolvedValueOnce({ counts: { sav: 3 } })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/nav-counts',
      headers: mockAuth(['BUYER'], COMPTABLE),
    })
    expect(res.statusCode).toBe(200)
    const capabilities = mockGetNavCounts.mock.calls[0][0] as string[]
    expect(capabilities).toContain('accounting:read')
    expect(capabilities).not.toContain('stock:adjust')
  })

  it('exige deux caractères pour chercher', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/search?q=a',
      headers: mockAuth(['BUYER'], COMPTABLE),
    })
    expect(res.statusCode).toBe(422)
    expect(mockSearchErp).not.toHaveBeenCalled()
  })

  it('passe les capacités à la recherche pour qu’elle ne contourne pas les droits', async () => {
    mockSearchErp.mockResolvedValueOnce({ hits: [] })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/erp/search?q=peugeot',
      headers: mockAuth(['BUYER'], COMPTABLE),
    })
    expect(res.statusCode).toBe(200)
    const [query, capabilities] = mockSearchErp.mock.calls[0] as [{ q: string }, string[]]
    expect(query.q).toBe('peugeot')
    expect(capabilities).toContain('sales:read')
  })
})
