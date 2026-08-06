import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FastifyRequest } from 'fastify'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

const mockFindUnique = vi.fn()

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    teamMemberProfile: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}))

const { loadStaffContext, requireCapability, requireRoleOrCapability, requireStaffId } =
  await import('./erpAuth.js')

/** Requête minimale : la garde ne lit que `user`, et décore `staff`. */
function fakeRequest(user: { id: string; roles: string[] } | null) {
  return { user } as unknown as FastifyRequest
}

describe('loadStaffContext', () => {
  beforeEach(() => vi.clearAllMocks())

  it('donne toutes les capacités à un ADMIN plateforme sans fiche', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const staff = await loadStaffContext('u1', ['ADMIN'])
    expect(staff.isPlatformAdmin).toBe(true)
    expect(staff.staffId).toBeNull()
    expect(staff.capabilities).toContain('erp:admin')
  })

  it('applique la matrice du rôle métier', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-1',
      staffRole: 'MAGASINIER',
      businessUnits: ['MARKETPLACE'],
      fonction: 'Magasinier Yopougon',
      actif: true,
    })
    const staff = await loadStaffContext('u2', ['BUYER'])
    expect(staff.staffId).toBe('staff-1')
    expect(staff.capabilities).toContain('stock:move')
    expect(staff.capabilities).not.toContain('accounting:read')
  })

  it('ne donne aucune capacité à un membre désactivé', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-2',
      staffRole: 'DIRECTION',
      businessUnits: [],
      fonction: null,
      actif: false,
    })
    const staff = await loadStaffContext('u3', ['BUYER'])
    expect(staff.capabilities).toEqual([])
  })

  it('ne donne aucune capacité à un compte sans fiche ni rôle ADMIN', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const staff = await loadStaffContext('u4', ['BUYER'])
    expect(staff.capabilities).toEqual([])
  })
})

describe('requireCapability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('laisse passer et décore request.staff', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-1',
      staffRole: 'COMPTABLE',
      businessUnits: [],
      fonction: null,
      actif: true,
    })
    const request = fakeRequest({ id: 'u1', roles: ['BUYER'] })
    await requireCapability('accounting:read')(request)
    expect(request.staff.staffRole).toBe('COMPTABLE')
  })

  it('refuse en 403 une capacité hors du rôle', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-1',
      staffRole: 'COMPTABLE',
      businessUnits: [],
      fonction: null,
      actif: true,
    })
    const request = fakeRequest({ id: 'u1', roles: ['BUYER'] })
    await expect(requireCapability('stock:adjust')(request)).rejects.toMatchObject({
      code: 'ERP_FORBIDDEN',
      statusCode: 403,
    })
  })

  it('refuse en 401 sans utilisateur authentifié', async () => {
    await expect(requireCapability('erp:read')(fakeRequest(null))).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('laisse passer un ADMIN plateforme sur n’importe quelle capacité', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const request = fakeRequest({ id: 'u9', roles: ['ADMIN'] })
    await expect(requireCapability('stock:adjust')(request)).resolves.toBeUndefined()
  })
})

describe('requireRoleOrCapability', () => {
  beforeEach(() => vi.clearAllMocks())

  it('laisse passer sur le rôle plateforme, sans interroger la base', async () => {
    // Une liaison n'a pas de fiche d'équipe : basculer ces routes sur la seule
    // capacité lui fermerait la porte de son propre espace.
    const request = fakeRequest({ id: 'u1', roles: ['LIAISON'] })
    await expect(requireRoleOrCapability(['LIAISON'], 'crm:read')(request)).resolves.toBeUndefined()
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('laisse passer un membre DIRECTION dépourvu du rôle plateforme', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-1',
      staffRole: 'DIRECTION',
      businessUnits: [],
      fonction: null,
      actif: true,
    })
    const request = fakeRequest({ id: 'u2', roles: ['BUYER'] })
    await expect(requireRoleOrCapability(['LIAISON'], 'crm:read')(request)).resolves.toBeUndefined()
    expect(request.staff.staffRole).toBe('DIRECTION')
  })

  it('refuse qui n’a ni le rôle ni la capacité', async () => {
    mockFindUnique.mockResolvedValueOnce(null)
    const request = fakeRequest({ id: 'u3', roles: ['BUYER'] })
    await expect(requireRoleOrCapability(['LIAISON'], 'crm:read')(request)).rejects.toMatchObject({
      code: 'AUTH_INSUFFICIENT_ROLE',
      statusCode: 403,
    })
  })

  it('refuse un magasinier sur une route CRM — sa capacité ne couvre pas', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'staff-2',
      staffRole: 'MAGASINIER',
      businessUnits: [],
      fonction: null,
      actif: true,
    })
    const request = fakeRequest({ id: 'u4', roles: ['BUYER'] })
    await expect(requireRoleOrCapability(['LIAISON'], 'crm:read')(request)).rejects.toMatchObject({
      statusCode: 403,
    })
  })
})

describe('requireStaffId', () => {
  it('exige une fiche d’équipe réelle', () => {
    expect(() =>
      requireStaffId({
        staffId: null,
        staffRole: null,
        businessUnits: [],
        fonction: null,
        active: false,
        isPlatformAdmin: true,
        capabilities: [],
      }),
    ).toThrowError('ERP_STAFF_PROFILE_REQUIRED')
  })
})
