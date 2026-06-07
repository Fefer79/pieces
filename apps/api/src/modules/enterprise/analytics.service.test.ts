import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const orderFindMany = vi.fn()
const vehicleFindMany = vi.fn()
const enterpriseMemberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    order: { findMany: (...a: unknown[]) => orderFindMany(...a) },
    vehicle: { findMany: (...a: unknown[]) => vehicleFindMany(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
  },
}))

const { getFleetAnalytics, computeMoneyPits } = await import('./analytics.service.js')

function entry(id: string, costPerKm: number, mileage = 100_000) {
  return {
    vehicle: { id, brand: 'X', model: 'Y', year: 2020, plate: id },
    totalSpend: Math.round(costPerKm * mileage),
    mileage,
    costPerKm,
  }
}

describe('enterprise/analytics.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    enterpriseMemberFindUnique.mockResolvedValue({ role: 'OWNER' })
  })

  it('aggregates spend by category, usage, group, and cost per km', async () => {
    const now = new Date()
    orderFindMany.mockResolvedValueOnce([
      {
        id: 'o1',
        paidAt: now,
        totalAmount: 50_000,
        vehicleId: 'v1',
        items: [
          { category: 'Freinage', priceSnapshot: 10_000, quantity: 2 },
          { category: 'Filtration', priceSnapshot: 5_000, quantity: 1 },
        ],
      },
      {
        id: 'o2',
        paidAt: now,
        totalAmount: 20_000,
        vehicleId: 'v2',
        items: [{ category: 'Freinage', priceSnapshot: 20_000, quantity: 1 }],
      },
    ])
    vehicleFindMany.mockResolvedValueOnce([
      { id: 'v1', brand: 'Toyota', model: 'Hilux', year: 2018, plate: 'AB-1', mileage: 100_000, usageType: 'CHANTIER', groupName: 'Yopougon' },
      { id: 'v2', brand: 'Renault', model: 'Kangoo', year: 2020, plate: 'CD-2', mileage: 40_000, usageType: 'LIVRAISON', groupName: 'Yopougon' },
    ])

    const res = await getFleetAnalytics('e1', 'u1')

    expect(res.totalSpend).toBe(70_000)
    expect(res.ordersCount).toBe(2)
    expect(res.vehiclesCount).toBe(2)
    // categories: Freinage 20000+20000=40000, Filtration 5000
    expect(res.spendByCategory).toEqual([
      { category: 'Freinage', total: 40_000 },
      { category: 'Filtration', total: 5_000 },
    ])
    // usage labels resolved + sorted desc by spend (Chantier 50000 > Livraison 20000)
    expect(res.spendByUsageType).toEqual([
      { usageType: 'Chantier', total: 50_000 },
      { usageType: 'Livraison', total: 20_000 },
    ])
    // both in same group
    expect(res.spendByGroup).toEqual([{ groupName: 'Yopougon', total: 70_000 }])
    // avg cost/km = (50000+20000) / (100000+40000) = 0.5
    expect(res.avgCostPerKm).toBe(0.5)
    // ranking sorted desc by cost/km: v2 = 0.5, v1 = 0.5 -> both present
    expect(res.costPerKmRanking).toHaveLength(2)
    expect(res.costPerKmRanking[0]!.costPerKm).toBeGreaterThanOrEqual(
      res.costPerKmRanking[1]!.costPerKm,
    )
  })

  it('returns zeros and null cost/km for an empty fleet', async () => {
    orderFindMany.mockResolvedValueOnce([])
    vehicleFindMany.mockResolvedValueOnce([])

    const res = await getFleetAnalytics('e1', 'u1')

    expect(res.totalSpend).toBe(0)
    expect(res.spendByCategory).toEqual([])
    expect(res.avgCostPerKm).toBeNull()
    expect(res.costPerKmRanking).toEqual([])
    expect(res.spendByMonth).toHaveLength(12)
  })

  describe('computeMoneyPits', () => {
    it('flags vehicles at >=1.5x the fleet median cost/km', () => {
      // médiane de [10,12,14,40] = 13 → seuil 19.5 → seul le 40 dépasse
      const res = computeMoneyPits([
        entry('a', 10),
        entry('b', 12),
        entry('c', 14),
        entry('d', 40),
      ])
      expect(res.medianCostPerKm).toBe(13)
      expect(res.thresholdCostPerKm).toBe(19.5)
      expect(res.moneyPits).toHaveLength(1)
      expect(res.moneyPits[0]!.vehicle.id).toBe('d')
      expect(res.moneyPits[0]!.multipleOfMedian).toBeCloseTo(3.1, 1)
      // surcoût = (40 - 13) * 100000
      expect(res.moneyPits[0]!.excessSpend).toBe(2_700_000)
    })

    it('returns no money pits for a fleet that is too small to compare', () => {
      const res = computeMoneyPits([entry('a', 10), entry('b', 50)])
      expect(res.moneyPits).toEqual([])
      expect(res.medianCostPerKm).toBeNull()
    })

    it('returns no money pits when costs are homogeneous', () => {
      const res = computeMoneyPits([entry('a', 10), entry('b', 11), entry('c', 12)])
      expect(res.moneyPits).toEqual([])
    })
  })
})
