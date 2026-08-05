import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockGetUser = vi.fn()
const mockUserUpsert = vi.fn()

const mockGetFinanceOverview = vi.fn()
const mockGetFinanceMonthly = vi.fn()
const mockListFinanceVendors = vi.fn()
const mockExportCommandesCsv = vi.fn()
const mockExportCommissionsCsv = vi.fn()
const mockExportEscrowCsv = vi.fn()

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
    // Contexte staff chargé par requireCapability sur toute route back-office.
    teamMemberProfile: { findUnique: vi.fn().mockResolvedValue(null) },
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

vi.mock('./finance.service.js', () => ({
  getFinanceOverview: (...args: unknown[]) => mockGetFinanceOverview(...args),
  getFinanceMonthly: (...args: unknown[]) => mockGetFinanceMonthly(...args),
  listFinanceVendors: (...args: unknown[]) => mockListFinanceVendors(...args),
  exportCommandesCsv: (...args: unknown[]) => mockExportCommandesCsv(...args),
  exportCommissionsCsv: (...args: unknown[]) => mockExportCommissionsCsv(...args),
  exportEscrowCsv: (...args: unknown[]) => mockExportEscrowCsv(...args),
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

describe('Finance Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth', async () => {
    const app = buildApp()
    const response = await app.inject({ method: 'GET', url: '/api/v1/admin/finance/overview' })
    expect(response.statusCode).toBe(401)
  })

  it('returns 403 for a non-ADMIN user', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/overview',
      headers: mockAuth(['LIAISON'], 'LIAISON'),
    })
    expect(response.statusCode).toBe(403)
    expect(mockGetFinanceOverview).not.toHaveBeenCalled()
  })

  it('returns 200 with the overview payload for an ADMIN', async () => {
    mockGetFinanceOverview.mockResolvedValueOnce({
      periode: '2026-08',
      gmv: 1_250_000,
      commissions: 125_000,
      commandes: 12,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/overview?periode=2026-08',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ periode: '2026-08', gmv: 1_250_000 })
    expect(mockGetFinanceOverview).toHaveBeenCalledWith(
      expect.objectContaining({ periode: '2026-08' }),
    )
  })

  it('returns 422 for a malformed periode on overview', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/overview?periode=2026-13',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockGetFinanceOverview).not.toHaveBeenCalled()
  })

  it('returns 200 with the monthly buckets', async () => {
    mockGetFinanceMonthly.mockResolvedValueOnce({
      buckets: [{ periode: '2026-08', gmv: 900_000, commissions: 90_000, orders: 9 }],
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/monthly?months=6',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data.buckets).toHaveLength(1)
    expect(mockGetFinanceMonthly).toHaveBeenCalledWith(expect.objectContaining({ months: 6 }))
  })

  it('returns 422 for months out of range', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/monthly?months=99',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockGetFinanceMonthly).not.toHaveBeenCalled()
  })

  it('returns 200 with the vendors list', async () => {
    mockListFinanceVendors.mockResolvedValueOnce({
      vendors: [{ vendorId: 'v1', shopName: 'Auto Pièces Yopougon', commissions: 80_000 }],
      total: 1,
      page: 1,
      limit: 20,
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/vendors?periode=2026-08&page=2',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.json().data).toMatchObject({ total: 1, page: 1 })
    expect(mockListFinanceVendors).toHaveBeenCalledWith(
      expect.objectContaining({ periode: '2026-08', page: 2 }),
    )
  })

  it('returns 422 for an invalid page on vendors', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/vendors?page=0',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockListFinanceVendors).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Exports CSV
  // -------------------------------------------------------------------------

  it('exports the commandes CSV with download headers and BOM', async () => {
    mockExportCommandesCsv.mockResolvedValueOnce({
      filename: 'commandes-2026-08.csv',
      csv: '\u{FEFF}Date;N° commande\r\n2026-08-01;abc',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/export/commandes?periode=2026-08',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('commandes-2026-08.csv')
    expect(response.body.startsWith('\u{FEFF}')).toBe(true)
    expect(mockExportCommandesCsv).toHaveBeenCalledWith(
      expect.objectContaining({ periode: '2026-08' }),
    )
  })

  it('exports the commissions CSV', async () => {
    mockExportCommissionsCsv.mockResolvedValueOnce({
      filename: 'commissions-2026-08.csv',
      csv: '\u{FEFF}Vendeur;Téléphone\r\nAuto;+2250700000001',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/export/commissions?periode=2026-08',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('commissions-2026-08.csv')
    expect(response.body.startsWith('\u{FEFF}')).toBe(true)
    expect(mockExportCommissionsCsv).toHaveBeenCalledWith(
      expect.objectContaining({ periode: '2026-08' }),
    )
  })

  it('exports the escrow CSV', async () => {
    mockExportEscrowCsv.mockResolvedValueOnce({
      filename: 'escrow-2026-08.csv',
      csv: '\u{FEFF}Date blocage;Commande\r\n2026-08-01;abc',
    })

    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/export/escrow?periode=2026-08',
      headers: mockAuth(),
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/csv')
    expect(response.headers['content-disposition']).toContain('escrow-2026-08.csv')
    expect(response.body.startsWith('\u{FEFF}')).toBe(true)
    expect(mockExportEscrowCsv).toHaveBeenCalledWith(expect.objectContaining({ periode: '2026-08' }))
  })

  it('returns 422 on exports without a periode', async () => {
    const app = buildApp()
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/finance/export/commandes',
      headers: mockAuth(),
    })
    expect(response.statusCode).toBe(422)
    expect(mockExportCommandesCsv).not.toHaveBeenCalled()
  })
})
