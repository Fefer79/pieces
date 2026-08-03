import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: (...a: unknown[]) => mockGetUser(...a) } },
}))

const userUpsert = vi.fn()
const shipmentFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: { upsert: (...a: unknown[]) => userUpsert(...a), findUnique: vi.fn(), update: vi.fn() },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
    shipment: { findUnique: (...a: unknown[]) => shipmentFindUnique(...a) },
  },
}))

const mockCreateSearch = vi.fn()
const mockAdminListSearches = vi.fn()
const mockAdminSearchStats = vi.fn()
const mockGetSearch = vi.fn()
const mockBuildOfferMatrix = vi.fn()
const mockUpdateOffer = vi.fn()
const mockCreatePoFromOffer = vi.fn()
const mockBuildSupplierMessage = vi.fn()

vi.mock('./sourcing.service.js', () => ({
  createSearch: (...a: unknown[]) => mockCreateSearch(...a),
  getSearch: (...a: unknown[]) => mockGetSearch(...a),
  adminListSearches: (...a: unknown[]) => mockAdminListSearches(...a),
  adminSearchStats: (...a: unknown[]) => mockAdminSearchStats(...a),
  updateOffer: (...a: unknown[]) => mockUpdateOffer(...a),
  buildOfferMatrix: (...a: unknown[]) => mockBuildOfferMatrix(...a),
  createPurchaseOrderFromOffer: (...a: unknown[]) => mockCreatePoFromOffer(...a),
  buildSupplierMessage: (...a: unknown[]) => mockBuildSupplierMessage(...a),
}))

const mockGetShipmentPublic = vi.fn()
vi.mock('./shipment.service.js', () => ({
  createShipment: vi.fn(),
  updateShipment: vi.fn(),
  transitionShipment: vi.fn(),
  adminListShipments: vi.fn(),
  adminShipmentStats: vi.fn(),
  adminGetShipment: vi.fn(),
  getShipmentPublic: (...a: unknown[]) => mockGetShipmentPublic(...a),
  getShipmentForQuoteRequest: vi.fn().mockResolvedValue(null),
  notifyShipmentUpdate: vi.fn(),
}))

vi.mock('../queue/worker.js', () => ({
  startWorker: vi.fn(),
  ensureMaintenanceReminderScheduled: vi.fn(),
  ensureBufferReplenishScheduled: vi.fn(),
  ensureVendorRelanceScheduled: vi.fn(),
  ensureEnrichmentSourcingScheduled: vi.fn(),
}))

const { buildApp } = await import('../../server.js')
const app = buildApp()

const asRole = (roles: string[], activeContext: string) => {
  mockGetUser.mockResolvedValue({ data: { user: { id: 'sb-1', phone: '2250707000000' } }, error: null })
  userUpsert.mockResolvedValue({
    id: 'user-1',
    phone: '+2250707000000',
    email: null,
    roles,
    activeContext,
    consentedAt: new Date(),
  })
}

const AUTH = { authorization: 'Bearer token' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RBAC /api/v1/admin/sourcing', () => {
  it('401 sans jeton', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/sourcing/searches' })
    expect(res.statusCode).toBe(401)
  })

  it('403 pour un non-ADMIN', async () => {
    asRole(['BUYER'], 'BUYER')
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches',
      headers: AUTH,
    })
    expect(res.statusCode).toBe(403)
  })

  it('200 pour un ADMIN', async () => {
    asRole(['ADMIN'], 'ADMIN')
    mockAdminListSearches.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches',
      headers: AUTH,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.total).toBe(0)
  })

  it('403 pour un non-ADMIN sur les expéditions aussi', async () => {
    asRole(['SELLER'], 'SELLER')
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/shipments', headers: AUTH })
    expect(res.statusCode).toBe(403)
  })
})

describe('POST /api/v1/admin/sourcing/searches', () => {
  beforeEach(() => asRole(['ADMIN'], 'ADMIN'))

  it('201 et enfile la recherche', async () => {
    mockCreateSearch.mockResolvedValue({ id: 'search-1', partName: 'Alternateur' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches',
      headers: AUTH,
      payload: { quoteRequestId: 'lead-1' },
    })

    expect(res.statusCode).toBe(201)
    expect(mockCreateSearch).toHaveBeenCalledWith({ quoteRequestId: 'lead-1' }, 'user-1')
  })

  it('422 sur un corps invalide', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches',
      headers: AUTH,
      payload: { partName: 'x', quantity: -3 },
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('pagination et filtres', () => {
  beforeEach(() => asRole(['ADMIN'], 'ADMIN'))

  it('transmet la pagination au service', async () => {
    mockAdminListSearches.mockResolvedValue({ items: [], total: 0, page: 2, pageSize: 10 })

    await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches?page=2&pageSize=10&status=DONE',
      headers: AUTH,
    })

    expect(mockAdminListSearches).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10, status: 'DONE' }),
    )
  })

  it('422 sur un statut hors énumération', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches?status=INCONNU',
      headers: AUTH,
    })
    expect(res.statusCode).toBe(422)
  })
})

describe('arbitrage et bon de commande', () => {
  beforeEach(() => asRole(['ADMIN'], 'ADMIN'))

  it('renvoie la matrice d\'une recherche', async () => {
    mockBuildOfferMatrix.mockResolvedValue({ searchId: 'search-1', options: [] })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches/search-1/matrix',
      headers: AUTH,
    })

    expect(res.statusCode).toBe(200)
    expect(mockBuildOfferMatrix).toHaveBeenCalledWith('search-1')
  })

  it('201 à la génération du bon de commande', async () => {
    mockCreatePoFromOffer.mockResolvedValue({ id: 'po-1', numero: 'BC-20260803-AAAA' })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/offers/o1/purchase-order',
      headers: AUTH,
      payload: {},
    })

    expect(res.statusCode).toBe(201)
    expect(res.json().data.numero).toMatch(/^BC-/)
  })

  it('renvoie un brouillon de message sans l\'envoyer', async () => {
    mockBuildSupplierMessage.mockResolvedValue({
      message: 'Bonjour',
      whatsappUrl: 'https://wa.me/971501234567',
      mailtoUrl: null,
    })

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/offers/o1/message',
      headers: AUTH,
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.whatsappUrl).toContain('wa.me')
  })
})

describe('suivi public d\'une expédition', () => {
  it('accessible sans authentification avec un jeton', async () => {
    mockGetShipmentPublic.mockResolvedValue({ reference: 'EXP-1', status: 'IN_TRANSIT', events: [] })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/logistics/shipments/EXP-20260803-AAAA/public?t=' + 'a'.repeat(48),
    })

    expect(res.statusCode).toBe(200)
    expect(res.json().data.reference).toBe('EXP-1')
  })

  it('422 sans jeton', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/logistics/shipments/EXP-20260803-AAAA/public',
    })
    expect(res.statusCode).toBe(422)
  })
})
