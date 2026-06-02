import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const mockCatalogItemFindMany = vi.fn()
const mockOrderCreate = vi.fn()
const mockOrderFindUnique = vi.fn()
const mockOrderFindFirst = vi.fn()
const mockOrderFindMany = vi.fn()
const mockOrderUpdate = vi.fn()
const mockOrderDelete = vi.fn()
const mockOrderItemDeleteMany = vi.fn()
const mockVehicleFindUnique = vi.fn()
const mockEnterpriseMemberFindUnique = vi.fn()

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
      findFirst: (...args: unknown[]) => mockOrderFindFirst(...args),
      findMany: (...args: unknown[]) => mockOrderFindMany(...args),
      update: (...args: unknown[]) => mockOrderUpdate(...args),
      delete: (...args: unknown[]) => mockOrderDelete(...args),
    },
    orderItem: {
      deleteMany: (...args: unknown[]) => mockOrderItemDeleteMany(...args),
    },
    vehicle: {
      findUnique: (...args: unknown[]) => mockVehicleFindUnique(...args),
    },
    enterpriseMember: {
      findUnique: (...args: unknown[]) => mockEnterpriseMemberFindUnique(...args),
    },
  },
}))

const { createOrder, getOrderById, cancelOrder, selectPaymentMethod, transitionOrder, getOpenDraft, upsertDraft } = await import('./order.service.js')

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

    it('propagates quantity to OrderItem and multiplies total by quantity', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: 250, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1', quantity: 3 }])

      const createArg = mockOrderCreate.mock.calls[0]![0] as {
        data: { totalAmount: number; items: { create: { quantity: number; commissionAmount: number | null }[] } }
      }
      expect(createArg.data.totalAmount).toBe(15000)
      expect(createArg.data.items.create[0]!.quantity).toBe(3)
      // commission reste le snapshot unitaire (non multiplié)
      expect(createArg.data.items.create[0]!.commissionAmount).toBe(250)
    })

    it('sums quantities when the same catalogItemId appears twice', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: null, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [
        { catalogItemId: 'item-1', quantity: 2 },
        { catalogItemId: 'item-1', quantity: 3 },
      ])

      const createArg = mockOrderCreate.mock.calls[0]![0] as {
        data: { totalAmount: number; items: { create: { quantity: number }[] } }
      }
      expect(createArg.data.items.create[0]!.quantity).toBe(5)
      expect(createArg.data.totalAmount).toBe(25000)
    })

    it('defaults quantity to 1 when omitted', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: null, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }])

      const createArg = mockOrderCreate.mock.calls[0]![0] as {
        data: { totalAmount: number; items: { create: { quantity: number }[] } }
      }
      expect(createArg.data.items.create[0]!.quantity).toBe(1)
      expect(createArg.data.totalAmount).toBe(5000)
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

  describe('getOpenDraft', () => {
    it('returns the latest open DRAFT order for the user', async () => {
      mockOrderFindFirst.mockResolvedValueOnce({ id: 'd1', status: 'DRAFT', items: [] })
      const result = await getOpenDraft('user-1')
      expect(result?.id).toBe('d1')
      const arg = mockOrderFindFirst.mock.calls[0]![0] as { where: { initiatorId: string; status: string } }
      expect(arg.where).toMatchObject({ initiatorId: 'user-1', status: 'DRAFT' })
    })
  })

  describe('upsertDraft', () => {
    it('creates a new draft when none exists', async () => {
      mockOrderFindFirst.mockResolvedValueOnce(null) // no existing draft
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: null, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'd-new', items: [] })

      await upsertDraft('user-1', [{ catalogItemId: 'item-1', quantity: 2 }])

      const createArg = mockOrderCreate.mock.calls[0]![0] as {
        data: { totalAmount: number; items: { create: { quantity: number }[] } }
      }
      expect(createArg.data.totalAmount).toBe(10000)
      expect(createArg.data.items.create[0]!.quantity).toBe(2)
    })

    it('replaces items on an existing draft (deletes then recreates)', async () => {
      mockOrderFindFirst.mockResolvedValueOnce({ id: 'd-existing' })
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: null, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderItemDeleteMany.mockResolvedValueOnce({ count: 3 })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'd-existing', items: [] })

      await upsertDraft('user-1', [{ catalogItemId: 'item-1', quantity: 1 }])

      expect(mockOrderItemDeleteMany).toHaveBeenCalledWith({ where: { orderId: 'd-existing' } })
      const updateArg = mockOrderUpdate.mock.calls[0]![0] as { where: { id: string }; data: { totalAmount: number } }
      expect(updateArg.where.id).toBe('d-existing')
      expect(updateArg.data.totalAmount).toBe(5000)
      expect(mockOrderCreate).not.toHaveBeenCalled()
    })

    it('deletes the draft when the cart is emptied', async () => {
      mockOrderFindFirst.mockResolvedValueOnce({ id: 'd-existing' })
      mockOrderItemDeleteMany.mockResolvedValueOnce({ count: 2 })
      mockOrderDelete.mockResolvedValueOnce({ id: 'd-existing' })

      const result = await upsertDraft('user-1', [])

      expect(result).toBeNull()
      expect(mockOrderItemDeleteMany).toHaveBeenCalledWith({ where: { orderId: 'd-existing' } })
      expect(mockOrderDelete).toHaveBeenCalledWith({ where: { id: 'd-existing' } })
      expect(mockCatalogItemFindMany).not.toHaveBeenCalled()
    })

    it('is a no-op when emptying with no existing draft', async () => {
      mockOrderFindFirst.mockResolvedValueOnce(null)
      const result = await upsertDraft('user-1', [])
      expect(result).toBeNull()
      expect(mockOrderDelete).not.toHaveBeenCalled()
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

  describe('createOrder vehicle wiring', () => {
    function mockCatalogOk() {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })
    }

    it('links order to an enterprise-owned vehicle and derives enterpriseId', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce({
        id: 'veh-1', userId: null, enterpriseId: 'e-1',
      })
      mockEnterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'mem-1' })
      mockCatalogOk()

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], { vehicleId: 'veh-1' })

      const createArg = mockOrderCreate.mock.calls[0]![0] as { data: { vehicleId: string; enterpriseId: string } }
      expect(createArg.data.vehicleId).toBe('veh-1')
      expect(createArg.data.enterpriseId).toBe('e-1')
    })

    it('links a personally-owned vehicle (no enterpriseId set)', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce({
        id: 'veh-2', userId: 'user-1', enterpriseId: null,
      })
      mockCatalogOk()

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], { vehicleId: 'veh-2' })

      const createArg = mockOrderCreate.mock.calls[0]![0] as { data: { vehicleId: string; enterpriseId: string | undefined } }
      expect(createArg.data.vehicleId).toBe('veh-2')
      expect(createArg.data.enterpriseId).toBeUndefined()
      // No membership lookup should be needed when the vehicle has no enterprise
      expect(mockEnterpriseMemberFindUnique).not.toHaveBeenCalled()
    })

    it('rejects when vehicle does not exist', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce(null)

      await expect(
        createOrder('user-1', [{ catalogItemId: 'item-1' }], { vehicleId: 'ghost' }),
      ).rejects.toMatchObject({ statusCode: 404, code: 'VEHICLE_NOT_FOUND' })
      expect(mockOrderCreate).not.toHaveBeenCalled()
    })

    it('rejects when the user is not the owner and not a member of the vehicle enterprise', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce({
        id: 'veh-3', userId: 'someone-else', enterpriseId: 'e-1',
      })
      mockEnterpriseMemberFindUnique.mockResolvedValueOnce(null)

      await expect(
        createOrder('user-1', [{ catalogItemId: 'item-1' }], { vehicleId: 'veh-3' }),
      ).rejects.toMatchObject({ statusCode: 403, code: 'VEHICLE_FORBIDDEN' })
      expect(mockOrderCreate).not.toHaveBeenCalled()
    })

    it('falls through unchanged when no vehicleId is provided', async () => {
      mockCatalogOk()

      await createOrder('user-1', [{ catalogItemId: 'item-1' }])

      expect(mockVehicleFindUnique).not.toHaveBeenCalled()
      const createArg = mockOrderCreate.mock.calls[0]![0] as { data: { vehicleId: string | undefined; enterpriseId: string | undefined } }
      expect(createArg.data.vehicleId).toBeUndefined()
      expect(createArg.data.enterpriseId).toBeUndefined()
    })
  })
})
