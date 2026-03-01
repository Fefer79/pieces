import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockOrderFindMany = vi.fn()
const mockOrderCount = vi.fn()
const mockUserCount = vi.fn()
const mockUserFindUnique = vi.fn()
const mockVendorCount = vi.fn()
const mockVendorFindMany = vi.fn()
const mockDisputeCount = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
    vendor: {
      count: (...args: unknown[]) => mockVendorCount(...args),
      findMany: (...args: unknown[]) => mockVendorFindMany(...args),
    },
    order: {
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      count: (...args: unknown[]) => mockOrderCount(...args),
    },
    dispute: {
      count: (...args: unknown[]) => mockDisputeCount(...args),
    },
  },
}))

const { getUserOrderHistory, getAdminDashboardStats, getEnterpriseMembers } = await import('./admin.service.js')

describe('admin.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getUserOrderHistory', () => {
    it('returns paginated order history', async () => {
      mockOrderFindMany.mockResolvedValueOnce([
        { id: 'o1', status: 'COMPLETED', items: [], delivery: null },
      ])
      mockOrderCount.mockResolvedValueOnce(1)

      const result = await getUserOrderHistory('user-1', 1, 20)
      expect(result.orders).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
    })

    it('returns empty for user with no orders', async () => {
      mockOrderFindMany.mockResolvedValueOnce([])
      mockOrderCount.mockResolvedValueOnce(0)

      const result = await getUserOrderHistory('user-2')
      expect(result.orders).toHaveLength(0)
      expect(result.totalPages).toBe(0)
    })
  })

  describe('getAdminDashboardStats', () => {
    it('returns dashboard statistics', async () => {
      mockUserCount.mockResolvedValueOnce(100)
      mockVendorCount.mockResolvedValueOnce(25)
      mockOrderCount.mockResolvedValueOnce(500)
      mockOrderCount.mockResolvedValueOnce(50)
      mockDisputeCount.mockResolvedValueOnce(10)
      mockDisputeCount.mockResolvedValueOnce(3)

      const stats = await getAdminDashboardStats()
      expect(stats.totalUsers).toBe(100)
      expect(stats.totalVendors).toBe(25)
      expect(stats.totalOrders).toBe(500)
      expect(stats.activeOrders).toBe(50)
      expect(stats.openDisputes).toBe(3)
    })
  })

  describe('getEnterpriseMembers', () => {
    it('returns empty for non-enterprise user', async () => {
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['MECHANIC'] })

      const result = await getEnterpriseMembers('user-1')
      expect(result.members).toHaveLength(0)
    })

    it('returns empty placeholder for enterprise user', async () => {
      mockUserFindUnique.mockResolvedValueOnce({ roles: ['ENTERPRISE'] })

      const result = await getEnterpriseMembers('user-1')
      expect(result.members).toHaveLength(0)
    })
  })
})
