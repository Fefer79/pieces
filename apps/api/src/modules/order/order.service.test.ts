import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCatalogItemFindMany = vi.fn()
const mockOrderCreate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderFindMany = vi.fn()
const mockOrderUpdate = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  supabaseAdmin: {
    auth: { getUser: vi.fn(), signInWithOtp: vi.fn(), verifyOtp: vi.fn() },
  },
}))

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    catalogItem: {
      findMany: (...args: unknown[]) => mockCatalogItemFindMany(...args),
    },
    order: {
      create: (...args: unknown[]) => mockOrderCreate(...args),
      findUnique: (...args: unknown[]) => mockOrderFindUnique(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
    },
  },
}))

const { createOrder, getOrderById, cancelOrder, selectPaymentMethod, transitionOrder } = await import('./order.service.js')

describe('order.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createOrder', () => {
    it('creates order with price-locked items', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({
        id: 'order-1',
        status: 'DRAFT',
        shareToken: 'abc123',
        totalAmount: 5000,
        items: [{ id: 'oi-1', name: 'Filtre', priceSnapshot: 5000 }],
      })

      const result = await createOrder('user-1', [{ catalogItemId: 'item-1' }])

      expect(result.status).toBe('DRAFT')
      expect(result.totalAmount).toBe(5000)
      expect(mockOrderCreate).toHaveBeenCalled()
    })

    it('throws when no valid items found', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([])

      await expect(createOrder('user-1', [{ catalogItemId: 'bad' }]))
        .rejects.toThrow()
    })
  })

  describe('getOrderById', () => {
    it('returns order with items and events', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1',
        status: 'DRAFT',
        items: [],
        events: [],
      })

      const result = await getOrderById('order-1')
      expect(result.id).toBe('order-1')
    })

    it('throws ORDER_NOT_FOUND', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null)
      await expect(getOrderById('bad')).rejects.toThrow()
    })
  })

  describe('selectPaymentMethod', () => {
    it('sets COD and transitions to PAID for COD orders', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000 })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'PAID', paymentMethod: 'COD', items: [] })

      const result = await selectPaymentMethod('order-1', 'COD', 'buyer')
      expect(result.status).toBe('PAID')
    })

    it('rejects COD over 75000 FCFA', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 100000 })

      await expect(selectPaymentMethod('order-1', 'COD', 'buyer')).rejects.toThrow()
    })

    it('sets PENDING_PAYMENT for mobile money', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000 })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'PENDING_PAYMENT', paymentMethod: 'ORANGE_MONEY', items: [] })

      const result = await selectPaymentMethod('order-1', 'ORANGE_MONEY', 'buyer')
      expect(result.status).toBe('PENDING_PAYMENT')
    })
  })

  describe('transitionOrder', () => {
    it('transitions PAID → VENDOR_CONFIRMED', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'PAID' })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'VENDOR_CONFIRMED', items: [] })

      const result = await transitionOrder('order-1', 'VENDOR_CONFIRMED', 'vendor-1')
      expect(result.status).toBe('VENDOR_CONFIRMED')
    })

    it('rejects invalid transition DRAFT → DELIVERED', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' })

      await expect(transitionOrder('order-1', 'DELIVERED', 'user-1')).rejects.toThrow()
    })
  })

  describe('cancelOrder', () => {
    it('cancels a DRAFT order', async () => {
      mockOrderFindUnique
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' }) // cancelOrder check
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' }) // transitionOrder check
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'CANCELLED', items: [] })

      const result = await cancelOrder('order-1', 'user-1')
      expect(result.status).toBe('CANCELLED')
    })

    it('rejects cancellation of IN_TRANSIT order', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'IN_TRANSIT' })

      await expect(cancelOrder('order-1', 'user-1')).rejects.toThrow()
    })
  })
})
