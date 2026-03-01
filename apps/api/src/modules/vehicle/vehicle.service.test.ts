import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockUserVehicleFindMany = vi.fn()
const mockUserVehicleCount = vi.fn()
const mockUserVehicleCreate = vi.fn()
const mockUserVehicleFindFirst = vi.fn()
const mockUserVehicleDelete = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    userVehicle: {
      findMany: (...args: unknown[]) => mockUserVehicleFindMany(...args),
      count: (...args: unknown[]) => mockUserVehicleCount(...args),
      create: (...args: unknown[]) => mockUserVehicleCreate(...args),
      findFirst: (...args: unknown[]) => mockUserVehicleFindFirst(...args),
      delete: (...args: unknown[]) => mockUserVehicleDelete(...args),
    },
  },
}))

const { getUserVehicles, addUserVehicle, deleteUserVehicle } = await import('./vehicle.service.js')

describe('vehicle.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUserVehicles', () => {
    it('returns user vehicles', async () => {
      const vehicles = [
        { id: 'v1', brand: 'Toyota', model: 'Corolla', year: 2015, vin: null, createdAt: new Date() },
      ]
      mockUserVehicleFindMany.mockResolvedValueOnce(vehicles)

      const result = await getUserVehicles('user-1')

      expect(result).toEqual(vehicles)
      expect(mockUserVehicleFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 'user-1' },
      }))
    })
  })

  describe('addUserVehicle', () => {
    it('creates a new vehicle', async () => {
      const vehicle = { id: 'v1', brand: 'Toyota', model: 'Corolla', year: 2015, vin: null, createdAt: new Date() }
      mockUserVehicleCount.mockResolvedValueOnce(0)
      mockUserVehicleCreate.mockResolvedValueOnce(vehicle)

      const result = await addUserVehicle('user-1', { brand: 'Toyota', model: 'Corolla', year: 2015 })

      expect(result).toEqual(vehicle)
    })

    it('throws VEHICLE_LIMIT_REACHED when user has 5 vehicles', async () => {
      mockUserVehicleCount.mockResolvedValueOnce(5)

      await expect(addUserVehicle('user-1', { brand: 'Toyota', model: 'Corolla', year: 2015 }))
        .rejects.toThrow()
    })
  })

  describe('deleteUserVehicle', () => {
    it('deletes a vehicle owned by the user', async () => {
      mockUserVehicleFindFirst.mockResolvedValueOnce({ id: 'v1', userId: 'user-1' })
      mockUserVehicleDelete.mockResolvedValueOnce({})

      await deleteUserVehicle('user-1', 'v1')

      expect(mockUserVehicleDelete).toHaveBeenCalledWith({ where: { id: 'v1' } })
    })

    it('throws VEHICLE_NOT_FOUND when vehicle does not belong to user', async () => {
      mockUserVehicleFindFirst.mockResolvedValueOnce(null)

      await expect(deleteUserVehicle('user-1', 'v-bad')).rejects.toThrow()
    })
  })
})
