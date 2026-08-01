import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const U1 = '11111111-2222-4333-8444-555555555555'

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

const mockGetCrmOverview = vi.fn()
const mockGetCrmTimeline = vi.fn()
const mockAddCrmInteraction = vi.fn()
const mockListCrmTasks = vi.fn()
const mockCreateCrmTask = vi.fn()
const mockUpdateCrmTask = vi.fn()
const mockListCrmTags = vi.fn()
const mockCreateCrmTag = vi.fn()
const mockDeleteCrmTag = vi.fn()
const mockGetCrmTagsOn = vi.fn()
const mockAssignCrmTag = vi.fn()
const mockUnassignCrmTag = vi.fn()
const mockSendCrmRelance = vi.fn()

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

vi.mock('./crm.service.js', () => ({
  getCrmOverview: (...args: unknown[]) => mockGetCrmOverview(...args),
  getCrmTimeline: (...args: unknown[]) => mockGetCrmTimeline(...args),
  addCrmInteraction: (...args: unknown[]) => mockAddCrmInteraction(...args),
  listCrmTasks: (...args: unknown[]) => mockListCrmTasks(...args),
  createCrmTask: (...args: unknown[]) => mockCreateCrmTask(...args),
  updateCrmTask: (...args: unknown[]) => mockUpdateCrmTask(...args),
  listCrmTags: (...args: unknown[]) => mockListCrmTags(...args),
  createCrmTag: (...args: unknown[]) => mockCreateCrmTag(...args),
  deleteCrmTag: (...args: unknown[]) => mockDeleteCrmTag(...args),
  getCrmTagsOn: (...args: unknown[]) => mockGetCrmTagsOn(...args),
  assignCrmTag: (...args: unknown[]) => mockAssignCrmTag(...args),
  unassignCrmTag: (...args: unknown[]) => mockUnassignCrmTag(...args),
  sendCrmRelance: (...args: unknown[]) => mockSendCrmRelance(...args),
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

describe('CRM Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/crm/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/crm/overview',
      headers: mockAuth(['BUYER'], 'BUYER'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockGetCrmOverview).not.toHaveBeenCalled()
  })

  it('returns 422 for an invalid interaction body', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/crm/interactions',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ subject: 'USER', subjectId: 'pas-un-uuid', type: 'NOTE' }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockAddCrmInteraction).not.toHaveBeenCalled()
  })

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetCrmOverview.mockResolvedValueOnce({
      tachesDuJour: 2,
      tachesEnRetard: 1,
      interactions7j: 9,
      relances7j: 3,
      segmentsClients: { nouveau: 4, actif: 10, fidele: 2, a_risque: 1, inactif: 5 },
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/crm/overview',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ tachesDuJour: 2, tachesEnRetard: 1 })
  })

  it('returns 201 when an interaction is created', async () => {
    mockAddCrmInteraction.mockResolvedValueOnce({
      id: 'i1',
      subject: 'USER',
      subjectId: U1,
      type: 'NOTE',
      details: 'Cliente intéressée par un pare-chocs',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/crm/interactions',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        subject: 'USER',
        subjectId: U1,
        type: 'NOTE',
        details: 'Cliente intéressée par un pare-chocs',
      }),
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ id: 'i1', type: 'NOTE' })
  })
})
