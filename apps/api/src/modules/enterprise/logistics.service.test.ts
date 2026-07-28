import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const partRequestFindFirst = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    partRequest: { findFirst: (...a: unknown[]) => partRequestFindFirst(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
  },
}))

const { computePartRequestMatrix } = await import('./logistics.service.js')

function mockRequest(vehicle: Record<string, unknown>, partName = 'Amortisseur avant') {
  partRequestFindFirst.mockResolvedValue({
    id: 'r1',
    partName,
    category: 'Suspension',
    description: null,
    vehicle: { id: 'v1', brand: 'Bestune', model: 'B70', year: 2024, plate: 'AB-123', energyType: 'ICE', ...vehicle },
  })
}

describe('enterprise/logistics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enterpriseMemberFindUnique.mockResolvedValue({ role: 'MANAGER' })
  })

  it('derives the downtime cost from the vehicle category', async () => {
    mockRequest({})
    const ice = await computePartRequestMatrix('e1', 'u1', 'r1', { localPrice: 45_000 })
    expect(ice.vehicle.category).toBe('PREMIUM_ICE')
    expect(ice.downtimeCostPerDay).toBe(30_000)

    mockRequest({ model: 'NAT', energyType: 'EV' })
    const ev = await computePartRequestMatrix('e1', 'u1', 'r1', { localPrice: 45_000 })
    expect(ev.vehicle.category).toBe('PREMIUM_EV')
    expect(ev.downtimeCostPerDay).toBe(38_000)
    expect(ev.annualPartsSpend).toBe(720_000)
  })

  it('matches the logistics family from the part name', async () => {
    mockRequest({})
    const result = await computePartRequestMatrix('e1', 'u1', 'r1', {})
    expect(result.familyId).toBe('SHOCK_ABSORBER')
  })

  it('ranks the cheapest part by sea as the worst total cost', async () => {
    mockRequest({})
    const result = await computePartRequestMatrix('e1', 'u1', 'r1', {
      localPrice: 45_000,
      importPrice: 32_000,
    })
    const last = result.options[result.options.length - 1]
    expect(last.mode).toBe('SEA_LCL')
    expect(last.downtimeCost).toBe(45 * 30_000)
  })

  it('marks the local option unavailable when no local price is given', async () => {
    mockRequest({})
    const result = await computePartRequestMatrix('e1', 'u1', 'r1', { importPrice: 32_000 })
    const local = result.options.find((o) => o.mode === 'LOCAL')
    expect(local?.available).toBe(false)
    expect(result.options.find((o) => o.recommended)?.mode).not.toBe('LOCAL')
  })

  it('honours a downtime cost override', async () => {
    mockRequest({})
    const result = await computePartRequestMatrix('e1', 'u1', 'r1', {
      localPrice: 45_000,
      downtimeCostPerDay: 50_000,
    })
    expect(result.downtimeCostPerDay).toBe(50_000)
    expect(result.downtimeCostOverridden).toBe(true)
  })

  it('refuses a non-member', async () => {
    enterpriseMemberFindUnique.mockResolvedValue(null)
    await expect(computePartRequestMatrix('e1', 'u1', 'r1', {})).rejects.toMatchObject({
      code: 'ENTERPRISE_FORBIDDEN',
    })
  })

  it('404s on an unknown request', async () => {
    partRequestFindFirst.mockResolvedValue(null)
    await expect(computePartRequestMatrix('e1', 'u1', 'r1', {})).rejects.toMatchObject({
      code: 'PART_REQUEST_NOT_FOUND',
    })
  })
})
