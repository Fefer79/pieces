import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockEscrowCreate = vi.fn()
const mockEscrowFindUnique = vi.fn()
const mockEscrowUpdate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockEscrowFindMany = vi.fn()

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
      findMany: (...args: unknown[]) => mockEscrowFindMany(...args),
    },
    order: {
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
    },
  },
}))

const { createEscrow, releaseEscrow, refundEscrow, confirmOrderPayment, refundAllHeldEscrows } = await import('./payment.service.js')

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

  describe('confirmOrderPayment', () => {
    it('creates escrow when the verified amount covers the order total', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', totalAmount: 5000 })
      mockEscrowFindUnique.mockResolvedValueOnce(null)
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', amount: 5000, status: 'HELD' })

      const result = await confirmOrderPayment('order-1', 5000)
      expect(result.status).toBe('HELD')
    })

    it('is idempotent — does not duplicate an existing escrow', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', totalAmount: 5000 })
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-1', orderId: 'order-1', status: 'HELD' })

      const result = await confirmOrderPayment('order-1', 5000)
      expect(result.id).toBe('esc-1')
      expect(mockEscrowCreate).not.toHaveBeenCalled()
    })

    it('rejects when the verified amount is below the order total', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', totalAmount: 5000 })
      mockEscrowFindUnique.mockResolvedValueOnce(null)

      await expect(confirmOrderPayment('order-1', 1000)).rejects.toThrow()
      expect(mockEscrowCreate).not.toHaveBeenCalled()
    })

    it('rejects when the order does not exist', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null)
      await expect(confirmOrderPayment('bad', 5000)).rejects.toThrow()
    })
  })

  // -------------------------------------------------------------------------
  // Précommande d'import : deux écritures pour une même commande
  // -------------------------------------------------------------------------

  describe("séquestre d'une précommande d'import", () => {
    const preorder = {
      id: 'order-imp',
      orderType: 'IMPORT_PREORDER',
      status: 'PENDING_PAYMENT',
      totalAmount: 96_000,
      depositAmount: 94_800,
      balanceAmount: 50_900,
    }

    it("déduit l'échéance de la commande : acompte avant l'arrivée", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(preorder)
      mockEscrowFindUnique.mockResolvedValueOnce(null)
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-d', kind: 'DEPOSIT', amount: 94_800, status: 'HELD' })

      const escrow = await confirmOrderPayment('order-imp', 94_800)
      expect(escrow.kind).toBe('DEPOSIT')
      expect((mockEscrowCreate.mock.calls[0]![0] as { data: { kind: string } }).data.kind).toBe('DEPOSIT')
    })

    it('appelle le solde une fois la pièce dédouanée', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ ...preorder, status: 'AWAITING_BALANCE' })
      mockEscrowFindUnique.mockResolvedValueOnce(null)
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-b', kind: 'BALANCE', amount: 50_900, status: 'HELD' })

      const escrow = await confirmOrderPayment('order-imp', 50_900)
      expect(escrow.kind).toBe('BALANCE')
    })

    it("refuse un acompte inférieur au montant appelé", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(preorder)
      mockEscrowFindUnique.mockResolvedValueOnce(null)

      await expect(confirmOrderPayment('order-imp', 50_000)).rejects.toMatchObject({
        code: 'PAYMENT_AMOUNT_MISMATCH',
      })
      expect(mockEscrowCreate).not.toHaveBeenCalled()
    })

    it("accepte un acompte inférieur au total de la commande (c'est le principe)", async () => {
      mockOrderFindUnique.mockResolvedValueOnce(preorder)
      mockEscrowFindUnique.mockResolvedValueOnce(null)
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-d', kind: 'DEPOSIT', amount: 94_800, status: 'HELD' })

      await expect(confirmOrderPayment('order-imp', 94_800)).resolves.toBeTruthy()
    })

    it('reste idempotent par échéance : un 2e webhook ne duplique pas', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(preorder)
      mockEscrowFindUnique.mockResolvedValueOnce({ id: 'esc-d', kind: 'DEPOSIT', amount: 94_800, status: 'HELD' })

      const escrow = await confirmOrderPayment('order-imp', 94_800)
      expect(escrow.id).toBe('esc-d')
      expect(mockEscrowCreate).not.toHaveBeenCalled()
    })

    it("garde le paiement unique (FULL) pour une commande locale", async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1',
        orderType: 'STANDARD',
        status: 'PENDING_PAYMENT',
        totalAmount: 5_000,
        depositAmount: 0,
        balanceAmount: 0,
      })
      mockEscrowFindUnique.mockResolvedValueOnce(null)
      mockEscrowCreate.mockResolvedValueOnce({ id: 'esc-1', kind: 'FULL', amount: 5_000, status: 'HELD' })

      await confirmOrderPayment('order-1', 5_000)
      expect((mockEscrowCreate.mock.calls[0]![0] as { data: { kind: string } }).data.kind).toBe('FULL')
    })

    it('rembourse intégralement les écritures encore sous séquestre', async () => {
      mockEscrowFindMany.mockResolvedValueOnce([{ kind: 'DEPOSIT' }, { kind: 'BALANCE' }])
      mockEscrowFindUnique
        .mockResolvedValueOnce({ id: 'esc-d', kind: 'DEPOSIT', status: 'HELD' })
        .mockResolvedValueOnce({ id: 'esc-b', kind: 'BALANCE', status: 'HELD' })
      mockEscrowUpdate
        .mockResolvedValueOnce({ id: 'esc-d', status: 'REFUNDED' })
        .mockResolvedValueOnce({ id: 'esc-b', status: 'REFUNDED' })

      const refunded = await refundAllHeldEscrows('order-imp')
      expect(refunded).toHaveLength(2)
      expect(refunded.every((e) => e.status === 'REFUNDED')).toBe(true)
    })

    it('ne rembourse rien quand plus rien n’est sous séquestre', async () => {
      mockEscrowFindMany.mockResolvedValueOnce([])
      const refunded = await refundAllHeldEscrows('order-imp')
      expect(refunded).toHaveLength(0)
      expect(mockEscrowUpdate).not.toHaveBeenCalled()
    })
  })

})
