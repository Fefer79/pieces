import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const ADMIN_ID = 'f0f0f0f0-1111-4222-8333-444444444444'
const SEARCH1 = '11111111-2222-4333-8444-555555555555'

const mockGetUser = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) } },
}))

const searchFindFirst = vi.fn()
const searchFindUnique = vi.fn()
const searchFindMany = vi.fn()
const searchCreate = vi.fn()
const offerCreateMany = vi.fn()
const offerFindMany = vi.fn()
const userUpsert = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    sourcingSearch: {
      findFirst: (...a: unknown[]) => searchFindFirst(...a),
      findUnique: (...a: unknown[]) => searchFindUnique(...a),
      findMany: (...a: unknown[]) => searchFindMany(...a),
      create: (...a: unknown[]) => searchCreate(...a),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    sourcingOffer: {
      createMany: (...a: unknown[]) => offerCreateMany(...a),
      findMany: (...a: unknown[]) => offerFindMany(...a),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    shipment: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    logisticsQuoteRequest: { findUnique: vi.fn() },
    partRequest: { findUnique: vi.fn() },
    purchaseOrder: { findUnique: vi.fn(), update: vi.fn() },
    supplier: { findFirst: vi.fn(), create: vi.fn() },
    user: {
      upsert: (...a: unknown[]) => userUpsert(...a),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../whatsapp/baileys.sender.js', () => ({
  sendBaileysText: vi.fn(async () => true),
  isBaileysConnected: () => false,
}))

vi.mock('../queue/worker.js', () => ({
  startWorker: vi.fn(),
  ensureMaintenanceReminderScheduled: vi.fn(),
  ensureBufferReplenishScheduled: vi.fn(),
  ensureVendorRelanceScheduled: vi.fn(),
  ensureEnrichmentSourcingScheduled: vi.fn(),
  ensureCrmDueTasksScheduled: vi.fn(),
}))

const { buildApp } = await import('../../server.js')

const app = buildApp()

function authAs(roles: string[]) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: 'sb-1', phone: '2250707000000' } },
    error: null,
  })
  userUpsert.mockResolvedValue({
    id: ADMIN_ID,
    phone: '+2250707000000',
    email: null,
    roles,
    activeContext: roles[0],
    consentedAt: new Date(),
  })
}

const BEARER = { authorization: 'Bearer token' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RBAC /api/v1/admin/sourcing', () => {
  it('refuse un appel sans jeton', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/sourcing/searches' })
    expect(res.statusCode).toBe(401)
  })

  it('refuse un compte non administrateur', async () => {
    authAs(['BUYER'])
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches',
      headers: BEARER,
    })
    expect(res.statusCode).toBe(403)
  })

  it('laisse passer un administrateur', async () => {
    authAs(['ADMIN'])
    searchFindMany.mockResolvedValue([])
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches',
      headers: BEARER,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({ items: [], total: 0, page: 1, pageSize: 25 })
  })

  it('protège aussi les expéditions', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/shipments' })
    expect(res.statusCode).toBe(401)
  })
})

describe('POST /searches/:id/offers — collage de liens', () => {
  beforeEach(() => {
    authAs(['ADMIN'])
    searchFindUnique.mockResolvedValue({ id: SEARCH1 })
    offerFindMany.mockResolvedValue([])
  })

  it('accepte plusieurs liens d\'un coup et renvoie le compte', async () => {
    offerCreateMany.mockResolvedValue({ count: 2 })

    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/sourcing/searches/${SEARCH1}/offers`,
      headers: BEARER,
      payload: { urls: ['https://www.ebay.de/itm/1', 'https://autodoc.de/p/2'] },
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().data).toMatchObject({ created: 2, skipped: 0 })
  })

  it('rejette une entrée qui n\'est pas une URL', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/sourcing/searches/${SEARCH1}/offers`,
      headers: BEARER,
      payload: { urls: ['plaquettes pas chères'] },
    })
    expect(res.statusCode).toBe(422)
  })

  it('borne le collage à 20 liens', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/sourcing/searches/${SEARCH1}/offers`,
      headers: BEARER,
      payload: { urls: Array.from({ length: 21 }, (_, i) => `https://ebay.de/itm/${i}`) },
    })
    expect(res.statusCode).toBe(422)
  })

  it('refuse une liste vide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/admin/sourcing/searches/${SEARCH1}/offers`,
      headers: BEARER,
      payload: { urls: [] },
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('POST /searches — rattachement', () => {
  beforeEach(() => authAs(['ADMIN']))

  it('refuse un dossier sans demande rattachée', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches',
      headers: BEARER,
      payload: {},
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('pagination', () => {
  it('accepte page et pageSize en query string', async () => {
    authAs(['ADMIN'])
    searchFindMany.mockResolvedValue([])
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches?page=3&pageSize=10',
      headers: BEARER,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({ page: 3, pageSize: 10 })
    expect(searchFindMany.mock.calls[0]![0]).toMatchObject({ skip: 20, take: 10 })
  })
})
