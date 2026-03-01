import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockDeliveryCreate = vi.fn()
const mockDeliveryFindUnique = vi.fn()
const mockDeliveryFindMany = vi.fn()
const mockDeliveryUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: { auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() } },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    delivery: {
      create: (...args: unknown[]) => mockDeliveryCreate(...args),
      findUnique: (...args: unknown[]) => mockDeliveryFindUnique(...args),
      findMany: (...args: unknown[]) => mockDeliveryFindMany(...args),
      update: (...args: unknown[]) => mockDeliveryUpdate(...args),
    },
  },
}))

const { createDelivery, assignRider, startPickup, startTransit, confirmDelivery, markClientAbsent } = await import('./delivery.service.js')

describe('delivery.service', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('createDelivery', () => {
    it('creates a delivery', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce(null)
      mockDeliveryCreate.mockResolvedValueOnce({ id: 'd1', orderId: 'o1', status: 'PENDING_ASSIGNMENT' })

      const result = await createDelivery('o1', {})
      expect(result.status).toBe('PENDING_ASSIGNMENT')
    })

    it('throws if delivery already exists', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1' })
      await expect(createDelivery('o1', {})).rejects.toThrow()
    })
  })

  describe('assignRider', () => {
    it('assigns rider to pending delivery', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', status: 'PENDING_ASSIGNMENT' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', riderId: 'r1', status: 'ASSIGNED' })

      const result = await assignRider('d1', 'r1')
      expect(result.status).toBe('ASSIGNED')
    })
  })

  describe('startPickup', () => {
    it('transitions ASSIGNED → PICKUP_IN_PROGRESS', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'r1', status: 'ASSIGNED' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', status: 'PICKUP_IN_PROGRESS' })

      const result = await startPickup('d1', 'r1')
      expect(result.status).toBe('PICKUP_IN_PROGRESS')
    })
  })

  describe('startTransit', () => {
    it('transitions PICKUP_IN_PROGRESS → IN_TRANSIT', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'r1', status: 'PICKUP_IN_PROGRESS' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', status: 'IN_TRANSIT' })

      const result = await startTransit('d1', 'r1')
      expect(result.status).toBe('IN_TRANSIT')
    })
  })

  describe('confirmDelivery', () => {
    it('transitions IN_TRANSIT → DELIVERED', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'r1', status: 'IN_TRANSIT' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', status: 'DELIVERED' })

      const result = await confirmDelivery('d1', 'r1')
      expect(result.status).toBe('DELIVERED')
    })
  })

  describe('markClientAbsent', () => {
    it('marks client as absent', async () => {
      mockDeliveryFindUnique.mockResolvedValueOnce({ id: 'd1', riderId: 'r1', status: 'IN_TRANSIT' })
      mockDeliveryUpdate.mockResolvedValueOnce({ id: 'd1', clientAbsent: true })

      const result = await markClientAbsent('d1', 'r1')
      expect(result.clientAbsent).toBe(true)
    })
  })
})
