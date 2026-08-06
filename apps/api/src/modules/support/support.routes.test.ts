import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '../../lib/appError.js'
import { createPrismaMock } from '../../test/prismaMock.js'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const D1 = '11111111-2222-4333-8444-555555555501'
const R1 = '11111111-2222-4333-8444-555555555502'

const mockGetUser = vi.fn()

// Mock Prisma complet : `buildApp()` monte tous les modules, donc toute
// requête peut toucher n'importe quel modèle (ici `teamMemberProfile`, lu par
// la garde de capacité). Énumérer les modèles à la main rendait ce fichier
// cassable par une modification sans rapport.
const { prismaMock, model, resetAll } = createPrismaMock()

const mockGetSupportOverview = vi.fn()
const mockListDisputes = vi.fn()
const mockGetDispute = vi.fn()
const mockReviewDispute = vi.fn()
const mockResolveDispute = vi.fn()
const mockCloseDispute = vi.fn()
const mockListReturns = vi.fn()
const mockGetReturn = vi.fn()
const mockTransitionReturn = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

vi.mock('../../lib/activityLog.js', () => ({
  recordActivity: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./support.service.js', () => ({
  getSupportOverview: (...args: unknown[]) => mockGetSupportOverview(...args),
  listDisputes: (...args: unknown[]) => mockListDisputes(...args),
  getDispute: (...args: unknown[]) => mockGetDispute(...args),
  reviewDispute: (...args: unknown[]) => mockReviewDispute(...args),
  resolveDispute: (...args: unknown[]) => mockResolveDispute(...args),
  closeDispute: (...args: unknown[]) => mockCloseDispute(...args),
  listReturns: (...args: unknown[]) => mockListReturns(...args),
  getReturn: (...args: unknown[]) => mockGetReturn(...args),
  transitionReturn: (...args: unknown[]) => mockTransitionReturn(...args),
}))

const { buildApp } = await import('../../server.js')
const { recordActivity } = await import('../../lib/activityLog.js')

function mockAuth(roles: string[] = ['ADMIN'], activeContext = 'ADMIN') {
  mockGetUser.mockResolvedValueOnce({
    data: { user: { id: 'sup-1', phone: '+2250700000000' } },
    error: null,
  })
  model('user').upsert.mockResolvedValueOnce({
    id: 'prisma-admin-1',
    phone: '+2250700000000',
    roles,
    activeContext,
    consentedAt: new Date(),
  })
  return { authorization: 'Bearer test-token' }
}

describe('Support Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetAll()
  })

  // -------------------------------------------------------------------------
  // Garde-fous
  // -------------------------------------------------------------------------

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/support/overview' })
    expect(response.statusCode).toBe(401)
  })

  // Séparation lecture / écriture : le rôle SUPPORT consulte les litiges mais
  // ne les tranche pas. Sans ce test, la garde d'écriture serait invisible —
  // tous les autres cas s'authentifient en ADMIN, qui a toutes les capacités.
  function asStaff(staffRole: string) {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'staff-user', phone: '+2250700000009' } },
      error: null,
    })
    model('user').upsert.mockResolvedValueOnce({
      id: 'prisma-staff-1',
      phone: '+2250700000009',
      roles: ['BUYER'],
      activeContext: 'BUYER',
      consentedAt: new Date(),
    })
    model('teamMemberProfile').findUnique.mockResolvedValue({
      id: 'staff-1',
      staffRole,
      businessUnits: [],
      fonction: null,
      actif: true,
    })
    return { authorization: 'Bearer test-token' }
  }

  it('un rôle SUPPORT consulte les litiges', async () => {
    mockListDisputes.mockResolvedValueOnce({ items: [], total: 0 })
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/disputes',
      headers: asStaff('SUPPORT'),
    })
    expect(response.statusCode).toBe(200)
  })

  it('un rôle SUPPORT ne tranche pas un litige — crm:write lui manque', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/resolve`,
      headers: asStaff('SUPPORT'),
      payload: { inFavorOf: 'buyer', resolution: 'Remboursement intégral' },
    })
    expect(response.statusCode).toBe(403)
    expect(mockResolveDispute).not.toHaveBeenCalled()
  })

  it('un rôle COMMERCIAL tranche, lui', async () => {
    mockResolveDispute.mockResolvedValueOnce({ id: D1 })
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/resolve`,
      headers: asStaff('COMMERCIAL'),
      payload: { inFavorOf: 'buyer', resolution: 'Remboursement intégral' },
    })
    expect(response.statusCode).not.toBe(403)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/disputes',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockListDisputes).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------------

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetSupportOverview.mockResolvedValueOnce({
      litigesOuverts: 3,
      litigesEnCours: 2,
      litigesResolus30j: 7,
      retoursDemandes: 4,
      retoursEnCours: 5,
      rembourses30j: 6,
      montantRembourse30j: 250_000,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/overview',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ litigesOuverts: 3, rembourses30j: 6 })
  })

  // -------------------------------------------------------------------------
  // Litiges
  // -------------------------------------------------------------------------

  it('lists disputes with filters', async () => {
    mockListDisputes.mockResolvedValueOnce({
      disputes: [{ id: D1, status: 'OPEN' }],
      total: 1,
      page: 1,
      limit: 20,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/disputes?statut=OPEN&search=pare-choc',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ total: 1 })
    expect(mockListDisputes).toHaveBeenCalledWith(
      expect.objectContaining({ statut: 'OPEN', search: 'pare-choc' }),
    )
  })

  it('returns 422 for an invalid disputes query (statut inconnu)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/disputes?statut=NOPE',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockListDisputes).not.toHaveBeenCalled()
  })

  it('returns a dispute detail', async () => {
    mockGetDispute.mockResolvedValueOnce({ id: D1, status: 'OPEN' })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/support/disputes/${D1}`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ id: D1 })
    expect(mockGetDispute).toHaveBeenCalledWith(D1)
  })

  it('returns 422 for a non-uuid dispute id', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/disputes/pas-un-uuid',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockGetDispute).not.toHaveBeenCalled()
  })

  it('propagates 404 DISPUTE_NOT_FOUND from the service', async () => {
    mockGetDispute.mockRejectedValueOnce(new AppError('DISPUTE_NOT_FOUND', 404))

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/support/disputes/${D1}`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('DISPUTE_NOT_FOUND')
  })

  it('takes a dispute under review and records the activity', async () => {
    mockReviewDispute.mockResolvedValueOnce({ id: D1, status: 'UNDER_REVIEW' })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/review`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ status: 'UNDER_REVIEW' })
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DISPUTE_REVIEWED',
        targetType: 'Dispute',
        targetId: D1,
        actorId: 'prisma-admin-1',
      }),
    )
  })

  it('resolves a dispute and records the activity', async () => {
    mockResolveDispute.mockResolvedValueOnce({ id: D1, status: 'RESOLVED_BUYER' })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/resolve`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ inFavorOf: 'buyer', resolution: 'Remboursement complet' }),
    })

    expect(response.statusCode).toBe(200)
    expect(mockResolveDispute).toHaveBeenCalledWith(D1, {
      inFavorOf: 'buyer',
      resolution: 'Remboursement complet',
    })
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DISPUTE_RESOLVED',
        targetType: 'Dispute',
        targetId: D1,
        payload: { inFavorOf: 'buyer' },
      }),
    )
  })

  it('returns 422 for an invalid resolve body (résolution manquante)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/resolve`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ inFavorOf: 'buyer' }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockResolveDispute).not.toHaveBeenCalled()
  })

  it('propagates 409 DISPUTE_INVALID_STATUS from the service', async () => {
    mockResolveDispute.mockRejectedValueOnce(
      new AppError('DISPUTE_INVALID_STATUS', 409, { message: 'Déjà clôturé' }),
    )

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/resolve`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ inFavorOf: 'seller', resolution: 'Pièce conforme' }),
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('DISPUTE_INVALID_STATUS')
  })

  it('closes a dispute and records the activity', async () => {
    mockCloseDispute.mockResolvedValueOnce({ id: D1, status: 'CLOSED' })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/disputes/${D1}/close`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ status: 'CLOSED' })
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DISPUTE_CLOSED',
        targetType: 'Dispute',
        targetId: D1,
      }),
    )
  })

  // -------------------------------------------------------------------------
  // Retours
  // -------------------------------------------------------------------------

  it('lists returns with filters', async () => {
    mockListReturns.mockResolvedValueOnce({
      returns: [{ id: R1, status: 'REQUESTED' }],
      total: 1,
      page: 1,
      limit: 20,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/support/returns?statut=REQUESTED',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ total: 1 })
    expect(mockListReturns).toHaveBeenCalledWith(expect.objectContaining({ statut: 'REQUESTED' }))
  })

  it('returns a return detail', async () => {
    mockGetReturn.mockResolvedValueOnce({ id: R1, status: 'INSPECTED' })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/support/returns/${R1}`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(mockGetReturn).toHaveBeenCalledWith(R1)
  })

  it('propagates 404 RETURN_NOT_FOUND from the service', async () => {
    mockGetReturn.mockRejectedValueOnce(new AppError('RETURN_NOT_FOUND', 404))

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: `/api/v1/admin/support/returns/${R1}`,
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('RETURN_NOT_FOUND')
  })

  it('transitions a return and records the activity', async () => {
    mockTransitionReturn.mockResolvedValueOnce({ id: R1, status: 'REFUNDED', refundAmount: 15_000 })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/returns/${R1}/transition`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ statut: 'REFUNDED', refundAmount: 15_000, note: 'OK' }),
    })

    expect(response.statusCode).toBe(200)
    expect(mockTransitionReturn).toHaveBeenCalledWith(R1, {
      statut: 'REFUNDED',
      refundAmount: 15_000,
      note: 'OK',
    })
    expect(recordActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RETURN_STATUS_UPDATED',
        targetType: 'ReturnOrder',
        targetId: R1,
        payload: { statut: 'REFUNDED', refundAmount: 15_000 },
      }),
    )
  })

  it('returns 422 for an invalid transition body (statut inconnu)', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/returns/${R1}/transition`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ statut: 'NOPE' }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockTransitionReturn).not.toHaveBeenCalled()
  })

  it('propagates 409 RETURN_INVALID_TRANSITION from the service', async () => {
    mockTransitionReturn.mockRejectedValueOnce(
      new AppError('RETURN_INVALID_TRANSITION', 409, {
        message: 'Transition REQUESTED → REFUNDED non autorisée',
      }),
    )

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/returns/${R1}/transition`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ statut: 'REFUNDED', refundAmount: 15_000 }),
    })

    expect(response.statusCode).toBe(409)
    expect(response.json().error.code).toBe('RETURN_INVALID_TRANSITION')
  })

  it('propagates 422 REFUND_AMOUNT_REQUIRED from the service', async () => {
    mockTransitionReturn.mockRejectedValueOnce(new AppError('REFUND_AMOUNT_REQUIRED', 422))

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/support/returns/${R1}/transition`,
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ statut: 'REFUNDED' }),
    })

    expect(response.statusCode).toBe(422)
    expect(response.json().error.code).toBe('REFUND_AMOUNT_REQUIRED')
  })
})
