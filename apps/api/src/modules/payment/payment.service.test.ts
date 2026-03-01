import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockEscrowCreate = vi.fn()
const mockEscrowFindUnique = vi.fn()
const mockEscrowUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    escrowTransaction: {
      create: (...args: unknown[]) => mockEscrowCreate(...args),
      findUnique: (...args: unknown[]) => mockEscrowFindUnique(...args),
      update: (...args: unknown[]) => mockEscrowUpdate(...args),
    },
  },
}))

const { createEscrow, releaseEscrow, refundEscrow } = await import('./payment.service.js')

describe('payment.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createEscrow', () => {
    it('creates an escrow transaction', async () => {
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', amount: 5000, status: 'HELD' })

      const result = await createEscrow('order-1', 5000)
      expect(result.status).toBe('HELD')
      expect(result.amount).toBe(5000)
    })
  })

  describe('releaseEscrow', () => {
    it('releases held escrow', async () => {
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', status: 'HELD' })
      mockEscrowUpdate.mockResolvedValueOnce({ id: 'esc-1', status: 'RELEASED', releasedAt: new Date() })

      const result = await releaseEscrow('order-1')
      expect(result.status).toBe('RELEASED')
    })

    it('throws when escrow already processed', async () => {
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', status: 'RELEASED' })

      await expect(releaseEscrow('order-1')).rejects.toThrow()
    })

    it('throws when escrow not found', async () => {
      mockEscrowFindUnique.mockResolvedValueOnce(null)

      await expect(releaseEscrow('bad')).rejects.toThrow()
    })
  })

  describe('refundEscrow', () => {
    it('refunds held escrow', async () => {
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', status: 'HELD' })
      mockEscrowUpdate.mockResolvedValueOnce({ id: 'esc-1', status: 'REFUNDED', refundedAt: new Date() })

      const result = await refundEscrow('order-1')
      expect(result.status).toBe('REFUNDED')
    })
  })
})
