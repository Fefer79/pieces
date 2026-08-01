import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockUserFindMany = vi.fn()
const mockOrderGroupBy = vi.fn()
const mockOrderItemGroupBy = vi.fn()
const mockVendorFindMany = vi.fn()
const mockDisputeFindMany = vi.fn()

vi.mock('./prisma.js', () => ({
  prisma: {
    user: { findMany: (...args: unknown[]) => mockUserFindMany(...args) },
    order: { groupBy: (...args: unknown[]) => mockOrderGroupBy(...args) },
    orderItem: { groupBy: (...args: unknown[]) => mockOrderItemGroupBy(...args) },
    vendor: { findMany: (...args: unknown[]) => mockVendorFindMany(...args) },
    dispute: { findMany: (...args: unknown[]) => mockDisputeFindMany(...args) },
  },
}))

const { resolveClientSegmentIds, countClientSegments, resolveVendorSegmentIds } =
  await import('./crmSegments.js')

const DAY_MS = 24 * 60 * 60 * 1000
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS)

// Pipeline client représentatif : nouveau sans commande, actif, fidèle,
// à risque, inactif sans commande, inactif avec vieille commande.
function seedClientSignals() {
  mockUserFindMany.mockResolvedValue([
    { id: 'u-new', createdAt: daysAgo(10) },
    { id: 'u-active', createdAt: daysAgo(200) },
    { id: 'u-fidele', createdAt: daysAgo(400) },
    { id: 'u-risque', createdAt: daysAgo(400) },
    { id: 'u-inactif-sans', createdAt: daysAgo(200) },
    { id: 'u-inactif-vieux', createdAt: daysAgo(500) },
  ])
  mockOrderGroupBy.mockResolvedValue([
    { initiatorId: 'u-active', _max: { createdAt: daysAgo(10) }, _count: { id: 1 } },
    { initiatorId: 'u-fidele', _max: { createdAt: daysAgo(20) }, _count: { id: 4 } },
    { initiatorId: 'u-risque', _max: { createdAt: daysAgo(90) }, _count: { id: 1 } },
    { initiatorId: 'u-inactif-vieux', _max: { createdAt: daysAgo(150) }, _count: { id: 2 } },
  ])
}

describe('crmSegments — clients', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    seedClientSignals()
  })

  it('resolves actif (dernière commande ≤ 60 j)', async () => {
    const ids = await resolveClientSegmentIds('actif')
    expect(ids.sort()).toEqual(['u-active', 'u-fidele'])
  })

  it('resolves inactif (> 120 j sans commande, ou compte ancien sans commande)', async () => {
    const ids = await resolveClientSegmentIds('inactif')
    expect(ids.sort()).toEqual(['u-inactif-sans', 'u-inactif-vieux'])
  })

  it('counts every segment independently (overlap fidèle ⊂ actif)', async () => {
    const counts = await countClientSegments()
    expect(counts).toEqual({
      nouveau: 1,
      actif: 2,
      fidele: 1,
      a_risque: 1,
      inactif: 2,
    })
  })

  it('rejects an unknown segment with CRM_INVALID_SEGMENT', async () => {
    await expect(resolveClientSegmentIds('vip')).rejects.toMatchObject({
      code: 'CRM_INVALID_SEGMENT',
      statusCode: 422,
    })
  })
})

describe('crmSegments — vendeurs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves actif (status ACTIVE)', async () => {
    mockVendorFindMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }])
    const ids = await resolveVendorSegmentIds('actif')
    expect(mockVendorFindMany).toHaveBeenCalledWith({
      where: { status: 'ACTIVE' },
      select: { id: true },
    })
    expect(ids).toEqual(['v1', 'v2'])
  })

  it('resolves sans_commande_30j (jamais commandé inclus)', async () => {
    mockVendorFindMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }, { id: 'v3' }])
    mockOrderItemGroupBy.mockResolvedValue([
      { vendorId: 'v1', _max: { createdAt: daysAgo(10) } },
      { vendorId: 'v2', _max: { createdAt: daysAgo(40) } },
    ])
    const ids = await resolveVendorSegmentIds('sans_commande_30j')
    expect(ids.sort()).toEqual(['v2', 'v3'])
  })

  it('resolves fiche_incomplete via vendorMissingFields, hors vendeurs externes', async () => {
    mockVendorFindMany.mockResolvedValue([
      { id: 'v1', commune: null, lat: null, kyc: null },
      { id: 'v2', commune: 'Cocody', lat: 5.3, kyc: { id: 'k1' } },
      { id: 'v3', commune: null, lat: 5.4, kyc: { id: 'k2' } },
    ])
    const ids = await resolveVendorSegmentIds('fiche_incomplete')
    expect(mockVendorFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isExternal: false } }),
    )
    expect(ids.sort()).toEqual(['v1', 'v3'])
  })

  it('resolves litiges_ouverts (OPEN / UNDER_REVIEW) via les lignes de commande', async () => {
    mockDisputeFindMany.mockResolvedValue([
      { order: { items: [{ vendorId: 'v1' }, { vendorId: 'v2' }] } },
      { order: { items: [{ vendorId: 'v1' }] } },
    ])
    const ids = await resolveVendorSegmentIds('litiges_ouverts')
    expect(mockDisputeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    )
    expect(ids.sort()).toEqual(['v1', 'v2'])
  })

  it('rejects an unknown segment with CRM_INVALID_SEGMENT', async () => {
    await expect(resolveVendorSegmentIds('vip')).rejects.toMatchObject({
      code: 'CRM_INVALID_SEGMENT',
      statusCode: 422,
    })
  })
})
