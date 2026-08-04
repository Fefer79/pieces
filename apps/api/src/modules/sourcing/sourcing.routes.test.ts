import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()
const mockRecordActivity = vi.fn().mockResolvedValue(undefined)

const mockCreateSearch = vi.fn()
const mockGetSearch = vi.fn()
const mockAdminListSearches = vi.fn()
const mockAdminSearchStats = vi.fn()
const mockCreateOffer = vi.fn()
const mockUpdateOffer = vi.fn()
const mockDeleteOffer = vi.fn()
const mockBuildOfferMatrix = vi.fn()
const mockCreatePoFromOffer = vi.fn()
const mockDraftMessage = vi.fn()

const mockCreateShipment = vi.fn()
const mockGetShipment = vi.fn()
const mockListShipments = vi.fn()
const mockShipmentStats = vi.fn()
const mockUpdateShipment = vi.fn()
const mockTransitionShipment = vi.fn()
const mockGetShipmentPublic = vi.fn()
const mockNotifyShipmentUpdate = vi.fn()

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
  recordActivity: (...args: unknown[]) => mockRecordActivity(...args),
}))

vi.mock('./sourcing.service.js', () => ({
  createSearch: (...a: unknown[]) => mockCreateSearch(...a),
  getSearch: (...a: unknown[]) => mockGetSearch(...a),
  adminListSearches: (...a: unknown[]) => mockAdminListSearches(...a),
  adminSearchStats: (...a: unknown[]) => mockAdminSearchStats(...a),
  createOffer: (...a: unknown[]) => mockCreateOffer(...a),
  updateOffer: (...a: unknown[]) => mockUpdateOffer(...a),
  deleteOffer: (...a: unknown[]) => mockDeleteOffer(...a),
  buildOfferMatrix: (...a: unknown[]) => mockBuildOfferMatrix(...a),
  createPurchaseOrderFromOffer: (...a: unknown[]) => mockCreatePoFromOffer(...a),
  draftMessageForOffer: (...a: unknown[]) => mockDraftMessage(...a),
}))

vi.mock('./shipment.service.js', () => ({
  createShipment: (...a: unknown[]) => mockCreateShipment(...a),
  getShipment: (...a: unknown[]) => mockGetShipment(...a),
  listShipments: (...a: unknown[]) => mockListShipments(...a),
  shipmentStats: (...a: unknown[]) => mockShipmentStats(...a),
  updateShipment: (...a: unknown[]) => mockUpdateShipment(...a),
  transitionShipment: (...a: unknown[]) => mockTransitionShipment(...a),
  getShipmentPublic: (...a: unknown[]) => mockGetShipmentPublic(...a),
  notifyShipmentUpdate: (...a: unknown[]) => mockNotifyShipmentUpdate(...a),
  getShipmentForQuoteRequest: vi.fn(),
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

describe('Sourcing routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRecordActivity.mockResolvedValue(undefined)
  })

  it('refuse un accès sans authentification', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/sourcing/stats' })
    expect(res.statusCode).toBe(401)
  })

  it('refuse un utilisateur non ADMIN', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
    })
    expect(res.statusCode).toBe(403)
    expect(mockAdminListSearches).not.toHaveBeenCalled()
  })

  it('liste les recherches avec pagination', async () => {
    mockAdminListSearches.mockResolvedValueOnce({ items: [], total: 0, page: 2, pageSize: 25 })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches?page=2&status=DONE',
      headers: mockAuth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.page).toBe(2)
    expect(mockAdminListSearches).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, status: 'DONE' }),
    )
  })

  it('répond 201 à l\'ouverture d\'un dossier manuel (rien à attendre)', async () => {
    mockCreateSearch.mockResolvedValueOnce({ id: 's1', partName: 'Plaquettes', origin: 'MANUAL' })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches',
      headers: mockAuth(),
      payload: { quoteRequestId: 'q1' },
    })
    expect(res.statusCode).toBe(201)
    expect(mockCreateSearch).toHaveBeenCalledWith(
      expect.objectContaining({ quoteRequestId: 'q1', origin: 'MANUAL' }),
      'prisma-admin-1',
    )
  })

  it('répond 202 quand une recherche automatique est mise en file', async () => {
    mockCreateSearch.mockResolvedValueOnce({ id: 's1', partName: 'Plaquettes', origin: 'AGENT' })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches',
      headers: mockAuth(),
      payload: { quoteRequestId: 'q1', origin: 'AGENT' },
    })
    expect(res.statusCode).toBe(202)
  })

  it('crée une offre saisie à la main', async () => {
    mockCreateOffer.mockResolvedValueOnce({ id: 'o1', supplierName: 'Al Nahda' })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches/s1/offers',
      headers: mockAuth(),
      payload: { supplierName: 'Al Nahda', priceAmount: 100, priceCurrency: 'EUR' },
    })
    expect(res.statusCode).toBe(201)
    expect(mockCreateOffer).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ supplierName: 'Al Nahda' }),
    )
  })

  it('rejette une offre manuelle sans fournisseur', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches/s1/offers',
      headers: mockAuth(),
      payload: { priceAmount: 100 },
    })
    expect(res.statusCode).toBe(422)
    expect(mockCreateOffer).not.toHaveBeenCalled()
  })

  it('rejette un lien qui n\'est pas une URL', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/searches/s1/offers',
      headers: mockAuth(),
      payload: { supplierName: 'X', url: 'pas-une-url' },
    })
    expect(res.statusCode).toBe(422)
    expect(mockCreateOffer).not.toHaveBeenCalled()
  })

  it('supprime une offre', async () => {
    mockDeleteOffer.mockResolvedValueOnce({ id: 'o1' })
    const app = buildApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/admin/sourcing/offers/o1',
      headers: mockAuth(),
    })
    expect(res.statusCode).toBe(200)
    expect(mockDeleteOffer).toHaveBeenCalledWith('o1')
  })

  it('rejette un statut d\'offre inconnu', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/admin/sourcing/offers/o1',
      headers: mockAuth(),
      payload: { status: 'PEUT_ETRE' },
    })
    expect(res.statusCode).toBe(422)
    expect(mockUpdateOffer).not.toHaveBeenCalled()
  })

  it('renvoie la matrice d\'arbitrage', async () => {
    mockBuildOfferMatrix.mockResolvedValueOnce({ searchId: 's1', rows: [], pricesUnconfirmed: false })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/sourcing/searches/s1/matrix',
      headers: mockAuth(),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.searchId).toBe('s1')
  })

  it('répond 201 à la création d\'un bon de commande depuis une offre', async () => {
    mockCreatePoFromOffer.mockResolvedValueOnce({ id: 'po1', numero: 'BC-20260803-AAAA' })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/sourcing/offers/o1/purchase-order',
      headers: mockAuth(),
      payload: {},
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.numero).toBe('BC-20260803-AAAA')
  })
})

describe('Shipment routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockRecordActivity.mockResolvedValue(undefined)
  })

  it('refuse un accès sans authentification', async () => {
    const app = buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/v1/admin/shipments/' })
    expect(res.statusCode).toBe(401)
  })

  it('refuse un utilisateur non ADMIN', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/shipments/',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
      payload: { carrier: 'DHL' },
    })
    expect(res.statusCode).toBe(403)
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('rejette un transporteur inconnu', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/shipments/',
      headers: mockAuth(),
      payload: { carrier: 'PIGEON_VOYAGEUR' },
    })
    expect(res.statusCode).toBe(422)
    expect(mockCreateShipment).not.toHaveBeenCalled()
  })

  it('crée une expédition', async () => {
    mockCreateShipment.mockResolvedValueOnce({
      id: 'sh1',
      reference: 'EXP-20260803-AAAA',
      carrier: 'DHL',
      publicToken: 'a'.repeat(64),
    })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/shipments/',
      headers: mockAuth(),
      payload: { carrier: 'DHL', trackingNumber: '123' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().data.reference).toBe('EXP-20260803-AAAA')
  })

  it('fait avancer une expédition', async () => {
    mockTransitionShipment.mockResolvedValueOnce({ id: 'sh1', status: 'CUSTOMS' })
    const app = buildApp()
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/shipments/sh1/transition',
      headers: mockAuth(),
      payload: { status: 'CUSTOMS', location: 'Abidjan' },
    })
    expect(res.statusCode).toBe(200)
    expect(mockTransitionShipment).toHaveBeenCalledWith(
      'sh1',
      { status: 'CUSTOMS', location: 'Abidjan' },
      'prisma-admin-1',
    )
  })

  it('le suivi public est ouvert mais exige le jeton', async () => {
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/logistics/shipments/EXP-20260803-AAAA',
    })
    expect(res.statusCode).toBe(422)
    expect(mockGetShipmentPublic).not.toHaveBeenCalled()
  })

  it('le suivi public renvoie la projection client avec un jeton', async () => {
    mockGetShipmentPublic.mockResolvedValueOnce({
      reference: 'EXP-20260803-AAAA',
      statusLabel: 'En transit',
      carrierLabel: 'Notre partenaire logistique',
    })
    const app = buildApp()
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/logistics/shipments/EXP-20260803-AAAA?t=${'a'.repeat(64)}`,
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().data.carrierLabel).toBe('Notre partenaire logistique')
  })
})
