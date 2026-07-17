import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockContactFindMany = vi.fn()
const mockContactCreateMany = vi.fn()
const mockCompetitorFindMany = vi.fn()
const mockVendorFindMany = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendorContact: {
      findMany: (...args: unknown[]) => mockContactFindMany(...args),
      createMany: (...args: unknown[]) => mockContactCreateMany(...args),
    },
    competitorVendor: {
      findMany: (...args: unknown[]) => mockCompetitorFindMany(...args),
    },
    vendor: {
      findMany: (...args: unknown[]) => mockVendorFindMany(...args),
    },
  },
}))

const { runRadarImport, normalizeIvorianPhone } = await import('./radar.service.js')

const osmShop = {
  id: 'comp-1',
  name: 'Pièces Auto Adjamé',
  phone: '+225 07 07 12 34 56',
  whatsapp: null,
  address: 'Boulevard Nangui Abrogoua',
  zone: 'Adjamé Roxy/Forum',
  commune: 'Adjamé',
  lat: 5.36,
  lng: -4.08,
  osmId: 'node/123',
  specialties: ['pieces_detachees'],
}

const externalVendor = {
  id: 'v-ext-1',
  shopName: 'Garage Momo',
  contactName: 'Momo',
  phone: '0505123456',
  commune: null,
  address: null,
  lat: null,
  lng: null,
  externalSource: 'COINAFRIQUE_CI',
  _count: { catalogItems: 12 },
}

describe('radar.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContactFindMany.mockResolvedValue([])
    mockCompetitorFindMany.mockResolvedValue([])
    mockVendorFindMany.mockResolvedValue([])
    mockContactCreateMany.mockResolvedValue({ count: 0 })
  })

  describe('normalizeIvorianPhone', () => {
    it('normalizes formats with spaces, prefixes and separators', () => {
      expect(normalizeIvorianPhone('+225 07 07 12 34 56')).toBe('+2250707123456')
      expect(normalizeIvorianPhone('00225 05 05 12 34 56')).toBe('+2250505123456')
      expect(normalizeIvorianPhone('07-07-12-34-56')).toBe('+2250707123456')
      expect(normalizeIvorianPhone('2250707123456')).toBe('+2250707123456')
    })

    it('rejects non-ivorian or malformed numbers', () => {
      expect(normalizeIvorianPhone(null)).toBeNull()
      expect(normalizeIvorianPhone('')).toBeNull()
      expect(normalizeIvorianPhone('12345')).toBeNull()
      expect(normalizeIvorianPhone('+33 6 12 34 56 78')).toBeNull()
    })
  })

  it('imports an OSM shop as a prospect with normalized phone', async () => {
    mockCompetitorFindMany.mockResolvedValue([osmShop])

    const result = await runRadarImport()

    expect(mockContactCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: 'Pièces Auto Adjamé',
          phone: '+2250707123456',
          commune: 'Adjamé',
          source: 'OSM',
          sourceRef: 'node/123',
          piecesLibre: 'Pièces détachées',
        }),
      ],
      skipDuplicates: true,
    })
    expect(result.totalImported).toBe(1)
    expect(result.sources).toContainEqual({
      source: 'OSM',
      scanned: 1,
      imported: 1,
      dejaConnus: 0,
      sansTelephone: 0,
    })
  })

  it('imports a marketplace seller with listing count in remarks', async () => {
    mockVendorFindMany.mockResolvedValue([externalVendor])

    const result = await runRadarImport()

    expect(mockContactCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: 'Momo',
          shopName: 'Garage Momo',
          phone: '+2250505123456',
          source: 'COINAFRIQUE_CI',
          sourceRef: 'v-ext-1',
          remarques: 'Vendeur COINAFRIQUE_CI — 12 annonce(s) importée(s)',
        }),
      ],
      skipDuplicates: true,
    })
    expect(result.totalImported).toBe(1)
  })

  it('skips leads already imported via (source, sourceRef)', async () => {
    mockContactFindMany.mockResolvedValue([
      { phone: '+2250999999999', source: 'OSM', sourceRef: 'node/123', vendorId: null },
    ])
    mockCompetitorFindMany.mockResolvedValue([osmShop])

    const result = await runRadarImport()

    expect(mockContactCreateMany).not.toHaveBeenCalled()
    expect(result.sources[0]).toMatchObject({ imported: 0, dejaConnus: 1 })
  })

  it('skips leads whose phone already exists as a contact', async () => {
    mockContactFindMany.mockResolvedValue([
      { phone: '+2250707123456', source: 'MANUEL', sourceRef: null, vendorId: null },
    ])
    mockCompetitorFindMany.mockResolvedValue([osmShop])

    const result = await runRadarImport()

    expect(mockContactCreateMany).not.toHaveBeenCalled()
    expect(result.sources[0]).toMatchObject({ imported: 0, dejaConnus: 1 })
  })

  it('skips marketplace vendors already linked to a contact via vendorId', async () => {
    mockContactFindMany.mockResolvedValue([
      { phone: '+2250888888888', source: 'MANUEL', sourceRef: null, vendorId: 'v-ext-1' },
    ])
    mockVendorFindMany.mockResolvedValue([externalVendor])

    const result = await runRadarImport()

    expect(mockContactCreateMany).not.toHaveBeenCalled()
    expect(result.sources[0]).toMatchObject({ imported: 0, dejaConnus: 1 })
  })

  it('counts leads without a usable phone', async () => {
    mockCompetitorFindMany.mockResolvedValue([{ ...osmShop, phone: null, whatsapp: null }])

    const result = await runRadarImport()

    expect(mockContactCreateMany).not.toHaveBeenCalled()
    expect(result.sources[0]).toMatchObject({ imported: 0, sansTelephone: 1 })
  })

  it('dedupes within the same run when two sources share a phone', async () => {
    mockCompetitorFindMany.mockResolvedValue([osmShop])
    mockVendorFindMany.mockResolvedValue([{ ...externalVendor, phone: '+225 07 07 12 34 56' }])

    const result = await runRadarImport()

    expect(result.totalImported).toBe(1)
    const marketplace = result.sources.find((s) => s.source === 'COINAFRIQUE_CI')
    expect(marketplace).toMatchObject({ imported: 0, dejaConnus: 1 })
  })

  it('does not write in dry-run mode but reports the same stats', async () => {
    mockCompetitorFindMany.mockResolvedValue([osmShop])

    const result = await runRadarImport({ dryRun: true })

    expect(mockContactCreateMany).not.toHaveBeenCalled()
    expect(result.dryRun).toBe(true)
    expect(result.totalImported).toBe(1)
  })
})
