import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const LOC1 = '11111111-2222-4333-8444-555555555555'
const ITEM1 = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const SUP1 = '99999999-8888-4777-8666-555555555555'

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

const mockGetStockOverview = vi.fn()
const mockListStockLocations = vi.fn()
const mockCreateStockLocation = vi.fn()
const mockUpdateStockLocation = vi.fn()
const mockListStockLevels = vi.fn()
const mockAdjustStock = vi.fn()
const mockListStockMovements = vi.fn()
const mockListVendorStockAlerts = vi.fn()
const mockListSuppliers = vi.fn()
const mockCreateSupplier = vi.fn()
const mockUpdateSupplier = vi.fn()
const mockGetSupplier = vi.fn()
const mockEstimateLandedCost = vi.fn()
const mockListPurchaseOrders = vi.fn()
const mockGetPurchaseOrder = vi.fn()
const mockCreatePurchaseOrder = vi.fn()
const mockUpdatePurchaseOrder = vi.fn()
const mockReceivePurchaseOrder = vi.fn()

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

vi.mock('./stock.service.js', () => ({
  getStockOverview: (...args: unknown[]) => mockGetStockOverview(...args),
  listStockLocations: (...args: unknown[]) => mockListStockLocations(...args),
  createStockLocation: (...args: unknown[]) => mockCreateStockLocation(...args),
  updateStockLocation: (...args: unknown[]) => mockUpdateStockLocation(...args),
  listStockLevels: (...args: unknown[]) => mockListStockLevels(...args),
  adjustStock: (...args: unknown[]) => mockAdjustStock(...args),
  listStockMovements: (...args: unknown[]) => mockListStockMovements(...args),
  listVendorStockAlerts: (...args: unknown[]) => mockListVendorStockAlerts(...args),
  listSuppliers: (...args: unknown[]) => mockListSuppliers(...args),
  createSupplier: (...args: unknown[]) => mockCreateSupplier(...args),
  updateSupplier: (...args: unknown[]) => mockUpdateSupplier(...args),
  getSupplier: (...args: unknown[]) => mockGetSupplier(...args),
  estimateLandedCost: (...args: unknown[]) => mockEstimateLandedCost(...args),
  listPurchaseOrders: (...args: unknown[]) => mockListPurchaseOrders(...args),
  getPurchaseOrder: (...args: unknown[]) => mockGetPurchaseOrder(...args),
  createPurchaseOrder: (...args: unknown[]) => mockCreatePurchaseOrder(...args),
  updatePurchaseOrder: (...args: unknown[]) => mockUpdatePurchaseOrder(...args),
  receivePurchaseOrder: (...args: unknown[]) => mockReceivePurchaseOrder(...args),
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

describe('Stock Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/stock/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stock/overview',
      headers: mockAuth(['BUYER'], 'BUYER'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockGetStockOverview).not.toHaveBeenCalled()
  })

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetStockOverview.mockResolvedValueOnce({
      emplacementsActifs: 2,
      referencesSuivies: 12,
      ruptures: 3,
      stockBas: 4,
      valeurStockFcfa: 1_200_000,
      mouvements30j: 40,
      fournisseursActifs: 5,
      bcEnCours: 2,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stock/overview',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ ruptures: 3, bcEnCours: 2 })
  })

  it('returns 422 for an invalid location body', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/locations',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ nom: 'X' }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockCreateStockLocation).not.toHaveBeenCalled()
  })

  it('returns 422 for an invalid adjustment body', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/adjustments',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      // delta non entier : rejeté par le JSON schema (le delta nul, lui, est
      // un refine Zod couvert par le test du service)
      payload: JSON.stringify({ catalogItemId: ITEM1, locationId: LOC1, delta: 1.5 }),
    })
    expect(response.statusCode).toBe(422)
    expect(mockAdjustStock).not.toHaveBeenCalled()
  })

  it('returns 201 when a location is created', async () => {
    mockCreateStockLocation.mockResolvedValueOnce({
      id: LOC1,
      nom: 'Entrepôt Treichville',
      type: 'ENTREPOT',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/locations',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ nom: 'Entrepôt Treichville', type: 'ENTREPOT' }),
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ id: LOC1, nom: 'Entrepôt Treichville' })
  })

  it('returns 200 for a landed cost estimate', async () => {
    mockEstimateLandedCost.mockResolvedValueOnce({
      fret: 85_000,
      douane: 37_000,
      lastMile: 2_000,
      total: 224_000,
      delaiJours: 5,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/purchase-orders/estimate',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({ mode: 'AIR_STANDARD', poidsTotalKg: 10, montantFcfa: 100_000 }),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ fret: 85_000, delaiJours: 5 })
  })

  it('returns 201 when a purchase order is created', async () => {
    mockCreatePurchaseOrder.mockResolvedValueOnce({
      id: 'po-1',
      numero: 'BC-20260731-8F3K',
      supplierId: SUP1,
      montantEstimeFcfa: 131_000,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/purchase-orders',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        supplierId: SUP1,
        mode: 'AIR_ECONOMY',
        devise: 'AED',
        tauxChange: 200,
        lines: [{ designation: 'Plaquettes de frein', quantite: 10, prixUnitaire: 25.5 }],
      }),
    })

    expect(response.statusCode).toBe(201)
    expect(response.json().data).toMatchObject({ numero: 'BC-20260731-8F3K' })
  })

  it('returns 200 when a purchase order is received', async () => {
    mockReceivePurchaseOrder.mockResolvedValueOnce({
      id: 'po-1',
      statut: 'RECEPTIONNEE',
      montantReelFcfa: 6_000,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/admin/stock/purchase-orders/123e4567-e89b-42d3-a456-426614174000/receive',
      headers: { ...mockAuth(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        lines: [{ lineId: 'abcdef01-2345-4678-89ab-cdef01234567', quantiteRecue: 5 }],
      }),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ statut: 'RECEPTIONNEE' })
  })
})
