import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const vehicleCount = vi.fn()
const vehicleFindMany = vi.fn()
const memberCount = vi.fn()
const orderCount = vi.fn()
const orderAggregate = vi.fn()
const orderGroupBy = vi.fn()
const orderFindMany = vi.fn()
const memberFindUnique = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vehicle: {
      count: (...a: unknown[]) => vehicleCount(...a),
      findMany: (...a: unknown[]) => vehicleFindMany(...a),
    },
    enterpriseMember: {
      count: (...a: unknown[]) => memberCount(...a),
      findUnique: (...a: unknown[]) => memberFindUnique(...a),
    },
    order: {
      count: (...a: unknown[]) => orderCount(...a),
      aggregate: (...a: unknown[]) => orderAggregate(...a),
      groupBy: (...a: unknown[]) => orderGroupBy(...a),
      findMany: (...a: unknown[]) => orderFindMany(...a),
    },
  },
}))

const { getEnterpriseDashboard, exportEnterpriseOrdersCsv } = await import('./dashboard.service.js')

describe('enterprise/dashboard.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    memberFindUnique.mockResolvedValue({ role: 'OWNER' })
  })

  describe('getEnterpriseDashboard', () => {
    it('aggregates counts + monthly spend + top vehicles', async () => {
      vehicleCount.mockResolvedValueOnce(7)
      memberCount.mockResolvedValueOnce(3)
      orderCount.mockResolvedValueOnce(2)
      orderAggregate.mockResolvedValueOnce({ _sum: { totalAmount: 850_000 } })
      orderGroupBy.mockResolvedValueOnce([
        { vehicleId: 'v1', _sum: { totalAmount: 450_000 } },
        { vehicleId: 'v2', _sum: { totalAmount: 400_000 } },
      ])
      vehicleFindMany.mockResolvedValueOnce([
        { id: 'v1', brand: 'Toyota', model: 'Hilux', year: 2018, plate: 'AB-1234-CI' },
        { id: 'v2', brand: 'Renault', model: 'Master', year: 2020, plate: 'EF-9012-CI' },
      ])

      const result = await getEnterpriseDashboard('e1', 'u1')

      expect(result.vehiclesCount).toBe(7)
      expect(result.membersCount).toBe(3)
      expect(result.activeOrders).toBe(2)
      expect(result.monthlySpend).toBe(850_000)
      expect(result.topVehiclesByCost).toHaveLength(2)
      expect(result.topVehiclesByCost[0]!.vehicle?.plate).toBe('AB-1234-CI')
      expect(result.topVehiclesByCost[0]!.totalSpent).toBe(450_000)
    })

    it('treats null sum as 0 for an enterprise with no paid orders yet', async () => {
      vehicleCount.mockResolvedValueOnce(0)
      memberCount.mockResolvedValueOnce(1)
      orderCount.mockResolvedValueOnce(0)
      orderAggregate.mockResolvedValueOnce({ _sum: { totalAmount: null } })
      orderGroupBy.mockResolvedValueOnce([])

      const result = await getEnterpriseDashboard('e1', 'u1')

      expect(result.monthlySpend).toBe(0)
      expect(result.topVehiclesByCost).toEqual([])
    })

    it('queries monthly spend with a start-of-month threshold', async () => {
      vehicleCount.mockResolvedValueOnce(0)
      memberCount.mockResolvedValueOnce(0)
      orderCount.mockResolvedValueOnce(0)
      orderAggregate.mockResolvedValueOnce({ _sum: { totalAmount: 0 } })
      orderGroupBy.mockResolvedValueOnce([])

      await getEnterpriseDashboard('e1', 'u1')

      const aggArg = orderAggregate.mock.calls[0]![0] as { where: { paidAt: { gte: Date } } }
      const gte = aggArg.where.paidAt.gte
      expect(gte).toBeInstanceOf(Date)
      expect(gte.getDate()).toBe(1)
      expect(gte.getHours()).toBe(0)
      expect(gte.getMinutes()).toBe(0)
    })

    it('throws ENTERPRISE_FORBIDDEN when the user is not a member', async () => {
      memberFindUnique.mockReset()
      memberFindUnique.mockResolvedValueOnce(null)

      await expect(getEnterpriseDashboard('e1', 'stranger')).rejects.toMatchObject({
        statusCode: 403,
      })
    })
  })

  describe('exportEnterpriseOrdersCsv', () => {
    it('returns a CSV with header + escaped quoted cells', async () => {
      orderFindMany.mockResolvedValueOnce([
        {
          id: 'o1',
          status: 'PAID',
          totalAmount: 28000,
          deliveryFee: 2000,
          laborCost: 5000,
          paymentMethod: 'ORANGE_MONEY',
          paidAt: new Date('2026-05-10T10:00:00Z'),
          createdAt: new Date('2026-05-10T09:30:00Z'),
          vehicle: { brand: 'Toyota', model: 'Hilux, double cab', year: 2018, plate: 'AB-1234-CI' },
        },
      ])

      const csv = await exportEnterpriseOrdersCsv('e1', 'u1')

      const [header, row] = csv.split('\n')
      expect(header).toBe(
        'order_id,created_at,paid_at,status,payment_method,vehicle,plate,total_amount,delivery_fee,labor_cost',
      )
      // Comma inside the model name must be quoted to keep CSV parseable
      expect(row).toContain('"Toyota Hilux, double cab 2018"')
      expect(row).toMatch(/28000/)
    })

    it('forbids exports for MECHANIC role', async () => {
      memberFindUnique.mockReset()
      memberFindUnique.mockResolvedValueOnce({ role: 'MECHANIC' })

      await expect(exportEnterpriseOrdersCsv('e1', 'u1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ENTERPRISE_INSUFFICIENT_ROLE',
      })
    })
  })
})
