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
const mockOrderEventDeleteMany = vi.fn()
const mockVehicleFindUnique = vi.fn()
const mockEnterpriseMemberFindUnique = vi.fn()
const mockVendorFindFirst = vi.fn()
const mockCurrentTier = vi.fn()

vi.mock('../enterprise/subscription.service.js', () => ({
  currentTier: (...args: unknown[]) => mockCurrentTier(...args),
}))

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
    orderEvent: {
      deleteMany: (...args: unknown[]) => mockOrderEventDeleteMany(...args),
    },
    vehicle: {
      findUnique: (...args: unknown[]) => mockVehicleFindUnique(...args),
    },
    enterpriseMember: {
      findUnique: (...args: unknown[]) => mockEnterpriseMemberFindUnique(...args),
    },
    vendor: {
      findFirst: (...args: unknown[]) => mockVendorFindFirst(...args),
    },
  },
}))

const { createOrder, getOrderById, cancelOrder, selectPaymentMethod, transitionOrder, vendorConfirmOrder, getOpenDraft, upsertDraft, getOrderByShareToken, setOrderDelivery } = await import('./order.service.js')

describe('order.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentTier.mockResolvedValue('FREE')
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

    it('persiste le choix « qui paie » du checkout (SELF par défaut, OWNER_LINK si poussée)', async () => {
      const item = { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, vendorId: 'v1', commissionAmount: null, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } }
      mockCatalogItemFindMany.mockResolvedValueOnce([item])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })
      await createOrder('user-1', [{ catalogItemId: 'item-1' }])

      mockCatalogItemFindMany.mockResolvedValueOnce([item])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o2', items: [] })
      await createOrder('user-1', [{ catalogItemId: 'item-1' }], { payerMode: 'OWNER_LINK' })

      const dataOf = (i: number) => (mockOrderCreate.mock.calls[i]![0] as { data: { payerMode: string } }).data
      expect(dataOf(0).payerMode).toBe('SELF')
      expect(dataOf(1).payerMode).toBe('OWNER_LINK')
    })

    it('throws when no valid items found', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([])

      await expect(createOrder('user-1', [{ catalogItemId: 'bad' }]))
        .rejects.toThrow()
    })

    it('propagates quantity to OrderItem and multiplies total by quantity', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        { id: 'item-1', name: 'Filtre', category: 'Filtration', price: 5000, imageThumbUrl: null, condition: 'NEW', partSource: 'AFTERMARKET', vendorId: 'v1', commissionAmount: 250, vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' } },
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1', quantity: 3 }])

      const createArg = mockOrderCreate.mock.calls[0]![0] as {
        data: { totalAmount: number; items: { create: { quantity: number; commissionAmount: number | null; condition: string | null; partSource: string | null }[] } }
      }
      expect(createArg.data.totalAmount).toBe(15000)
      expect(createArg.data.items.create[0]!.quantity).toBe(3)
      // commission reste le snapshot unitaire (non multiplié)
      expect(createArg.data.items.create[0]!.commissionAmount).toBe(250)
      // condition/partSource snapshotés à la commande
      expect(createArg.data.items.create[0]!.condition).toBe('NEW')
      expect(createArg.data.items.create[0]!.partSource).toBe('AFTERMARKET')
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
    it('returns order with items and events for the initiator', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1',
        initiatorId: 'user-1',
        enterpriseId: null,
        status: 'DRAFT',
        items: [],
        events: [],
      })

      const result = await getOrderById('order-1', { id: 'user-1', roles: [] })
      expect(result.id).toBe('order-1')
    })

    it('throws ORDER_NOT_FOUND', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(null)
      await expect(getOrderById('bad', { id: 'user-1', roles: [] })).rejects.toThrow()
    })

    it('denies access (IDOR) to a non-owner, non-vendor, non-admin user', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1',
        initiatorId: 'someone-else',
        enterpriseId: null,
        status: 'DRAFT',
        items: [{ vendorId: 'v1' }],
        events: [],
      })
      // pas vendeur de v1
      mockVendorFindFirst.mockResolvedValueOnce(null)

      await expect(getOrderById('order-1', { id: 'intruder', roles: [] })).rejects.toThrow(
        /ORDER_FORBIDDEN/,
      )
    })

    it('allows an ADMIN to read any order', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({
        id: 'order-1',
        initiatorId: 'someone-else',
        enterpriseId: null,
        status: 'DRAFT',
        items: [],
        events: [],
      })
      const result = await getOrderById('order-1', { id: 'admin-1', roles: ['ADMIN'] })
      expect(result.id).toBe('order-1')
    })
  })

  describe('selectPaymentMethod', () => {
    const TOK = 'a'.repeat(32)

    it('sets COD and transitions to PAID for COD orders', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000, shareToken: TOK })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'PAID', paymentMethod: 'COD', items: [] })

      const result = await selectPaymentMethod('order-1', 'COD', 'buyer', TOK)
      expect(result.status).toBe('PAID')
    })

    it('rejects COD over 75000 FCFA', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 100000, shareToken: TOK })

      await expect(selectPaymentMethod('order-1', 'COD', 'buyer', TOK)).rejects.toThrow()
    })

    it('sets PENDING_PAYMENT for mobile money', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000, shareToken: TOK })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'PENDING_PAYMENT', paymentMethod: 'ORANGE_MONEY', items: [] })

      const result = await selectPaymentMethod('order-1', 'ORANGE_MONEY', 'buyer', TOK)
      expect(result.status).toBe('PENDING_PAYMENT')
    })

    it('rejects a wrong shareToken (possession proof)', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', totalAmount: 20000, shareToken: TOK })

      await expect(selectPaymentMethod('order-1', 'COD', 'buyer', 'b'.repeat(32))).rejects.toThrow()
      expect(mockOrderUpdate).not.toHaveBeenCalled()
    })
  })

  describe('vendorConfirmOrder', () => {
    it('lets a vendor on the order confirm it', async () => {
      mockOrderFindUnique
        .mockResolvedValueOnce({ id: 'order-1', items: [{ vendorId: 'v1' }] }) // vendorConfirm lookup
        .mockResolvedValueOnce({ id: 'order-1', status: 'PAID' }) // transitionOrder lookup
      mockVendorFindFirst.mockResolvedValueOnce({ id: 'v1' })
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'VENDOR_CONFIRMED', items: [] })

      const result = await vendorConfirmOrder('order-1', { id: 'vendor-user', roles: [] })
      expect(result.status).toBe('VENDOR_CONFIRMED')
    })

    it('forbids a non-vendor, non-admin user from confirming', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', items: [{ vendorId: 'v1' }] })
      mockVendorFindFirst.mockResolvedValueOnce(null)

      await expect(vendorConfirmOrder('order-1', { id: 'intruder', roles: [] })).rejects.toThrow()
      expect(mockOrderUpdate).not.toHaveBeenCalled()
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

    it('deletes the draft (items + events) when the cart is emptied', async () => {
      mockOrderFindFirst.mockResolvedValueOnce({ id: 'd-existing' })
      mockOrderItemDeleteMany.mockResolvedValueOnce({ count: 2 })
      mockOrderEventDeleteMany.mockResolvedValueOnce({ count: 1 })
      mockOrderDelete.mockResolvedValueOnce({ id: 'd-existing' })

      const result = await upsertDraft('user-1', [])

      expect(result).toBeNull()
      expect(mockOrderItemDeleteMany).toHaveBeenCalledWith({ where: { orderId: 'd-existing' } })
      // OrderEvent doit être supprimé avant l'Order (pas de cascade FK)
      expect(mockOrderEventDeleteMany).toHaveBeenCalledWith({ where: { orderId: 'd-existing' } })
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
    const TOK = 'c'.repeat(32)

    it('cancels a DRAFT order', async () => {
      mockOrderFindUnique
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', shareToken: TOK }) // cancelOrder check
        .mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT' }) // transitionOrder check
      mockOrderUpdate.mockResolvedValueOnce({ id: 'order-1', status: 'CANCELLED', items: [] })

      const result = await cancelOrder('order-1', 'user-1', undefined, TOK)
      expect(result.status).toBe('CANCELLED')
    })

    it('rejects cancellation of IN_TRANSIT order', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'IN_TRANSIT', shareToken: TOK })

      await expect(cancelOrder('order-1', 'user-1', undefined, TOK)).rejects.toThrow()
    })

    it('rejects a wrong shareToken (possession proof)', async () => {
      mockOrderFindUnique.mockResolvedValueOnce({ id: 'order-1', status: 'DRAFT', shareToken: TOK })

      await expect(cancelOrder('order-1', 'user-1', undefined, 'd'.repeat(32))).rejects.toThrow()
      expect(mockOrderUpdate).not.toHaveBeenCalled()
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

  describe('createOrder delivery pricing', () => {
    type FeeArg = { data: { deliveryFee: number; deliveryMode: string } }
    const item = (over: Record<string, unknown> = {}) => ({
      id: 'item-1',
      name: 'Filtre',
      category: 'Filtration',
      price: 60_000,
      imageThumbUrl: null,
      vendorId: 'v1',
      commissionAmount: null,
      vendor: { id: 'v1', shopName: 'Shop', status: 'ACTIVE' },
      ...over,
    })

    it('standard FREE : 3 % du sous-total vendeur, arrondi à la centaine', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([item()])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], { deliveryCommune: 'Cocody' })

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(1800) // 3 % de 60 000
      expect(arg.data.deliveryMode).toBe('STANDARD')
    })

    it('standard FREE : plancher zone quand le pourcentage est en dessous', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([item({ price: 10_000 })])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], { deliveryCommune: 'Bingerville' })

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(2500) // 300 < plancher périphérie 2 500
    })

    it('express FREE : 6 % avec plancher 5 000 F', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([item({ price: 20_000 })])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], {
        deliveryCommune: 'Cocody',
        deliveryMode: 'EXPRESS',
      })

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(5000) // 1 200 < plancher express 5 000
      expect(arg.data.deliveryMode).toBe('EXPRESS')
    })

    it('plafonne la somme multi-vendeurs au plafond du palier', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([
        item({ id: 'i1', price: 200_000, vendorId: 'v1', vendor: { id: 'v1', shopName: 'A', status: 'ACTIVE' } }),
        item({ id: 'i2', price: 200_000, vendorId: 'v2', vendor: { id: 'v2', shopName: 'B', status: 'ACTIVE' } }),
        item({ id: 'i3', price: 200_000, vendorId: 'v3', vendor: { id: 'v3', shopName: 'C', status: 'ACTIVE' } }),
      ])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder(
        'user-1',
        [{ catalogItemId: 'i1' }, { catalogItemId: 'i2' }, { catalogItemId: 'i3' }],
        { deliveryCommune: 'Cocody' },
      )

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(9000) // 3 × 6 000 = 18 000 → plafond FREE 9 000
    })

    it('PRO_FLOTTE : 2 % avec plancher réduit', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce({ id: 'veh-1', userId: null, enterpriseId: 'e-1' })
      mockEnterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'm1' })
      mockCurrentTier.mockResolvedValueOnce('PRO_FLOTTE')
      mockCatalogItemFindMany.mockResolvedValueOnce([item()])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], {
        vehicleId: 'veh-1',
        deliveryCommune: 'Cocody',
      })

      expect(mockCurrentTier).toHaveBeenCalledWith('e-1')
      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(1200) // 2 % de 60 000, > plancher 1 000
    })

    it('PRO_FLOTTE_PLUS : livraison offerte, même en express', async () => {
      mockVehicleFindUnique.mockResolvedValueOnce({ id: 'veh-1', userId: null, enterpriseId: 'e-1' })
      mockEnterpriseMemberFindUnique.mockResolvedValueOnce({ id: 'm1' })
      mockCurrentTier.mockResolvedValueOnce('PRO_FLOTTE_PLUS')
      mockCatalogItemFindMany.mockResolvedValueOnce([item()])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }], {
        vehicleId: 'veh-1',
        deliveryCommune: 'Cocody',
        deliveryMode: 'EXPRESS',
      })

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(0)
    })

    it('sans commune : frais à 0, pas de lookup de palier hors entreprise', async () => {
      mockCatalogItemFindMany.mockResolvedValueOnce([item()])
      mockOrderCreate.mockResolvedValueOnce({ id: 'o1', items: [] })

      await createOrder('user-1', [{ catalogItemId: 'item-1' }])

      const arg = mockOrderCreate.mock.calls[0]![0] as FeeArg
      expect(arg.data.deliveryFee).toBe(0)
      expect(mockCurrentTier).not.toHaveBeenCalled()
    })
  })
  // Le choix du délai revient à celui qui paie, depuis le lien partagé.
  describe('mode de livraison choisi par le payeur', () => {
    const orderRow = (over: Record<string, unknown> = {}) => ({
      id: 'o1',
      shareToken: 'a'.repeat(32),
      status: 'DRAFT',
      enterpriseId: null,
      deliveryCommune: 'Cocody',
      deliveryMode: 'STANDARD',
      deliveryFee: 1800,
      items: [
        {
          vendorId: 'v1',
          priceSnapshot: 60_000,
          quantity: 1,
          category: 'Filtration',
        },
      ],
      initiator: { id: 'user-1', phone: '+2250700000000' },
      ...over,
    })

    it('getOrderByShareToken tarife les trois délais de la commande', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow())

      const order = await getOrderByShareToken('a'.repeat(32))

      expect(order.deliveryOptions.map((o) => [o.mode, o.fee])).toEqual([
        ['ECO', 1500], // 2 % de 60 000 = 1 200 → plancher centre éco 1 500
        ['STANDARD', 1800], // 3 %
        ['EXPRESS', 5000], // 3 600 → plancher express 5 000
      ])
    })

    it('le plus rapide est toujours le plus cher', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow())

      const { deliveryOptions } = await getOrderByShareToken('a'.repeat(32))
      const fee = (mode: string) => deliveryOptions.find((o) => o.mode === mode)!.fee!

      expect(fee('ECO')).toBeLessThanOrEqual(fee('STANDARD'))
      expect(fee('STANDARD')).toBeLessThanOrEqual(fee('EXPRESS'))
    })

    type DeliveryPatch = {
      data: { deliveryMode: string; deliveryCommune: string | null; deliveryFee: number }
    }

    it('setOrderDelivery retarife serveur-side et persiste le délai', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow())
      mockOrderUpdate.mockResolvedValueOnce({})
      mockOrderFindUnique.mockResolvedValueOnce(orderRow({ deliveryMode: 'EXPRESS', deliveryFee: 5000 }))

      await setOrderDelivery('a'.repeat(32), { mode: 'EXPRESS' })

      const arg = mockOrderUpdate.mock.calls[0]![0] as DeliveryPatch
      expect(arg.data).toEqual({
        deliveryMode: 'EXPRESS',
        deliveryCommune: 'Cocody',
        deliveryFee: 5000,
      })
    })

    // Le lieu compte autant que le délai : la zone porte le plancher tarifaire.
    it('changer de commune retarife au plancher de la nouvelle zone', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow({ items: [
        { vendorId: 'v1', priceSnapshot: 10_000, quantity: 1, category: 'Filtration' },
      ] }))
      mockOrderUpdate.mockResolvedValueOnce({})
      mockOrderFindUnique.mockResolvedValueOnce(orderRow())

      await setOrderDelivery('a'.repeat(32), { commune: 'Bingerville' })

      const arg = mockOrderUpdate.mock.calls[0]![0] as DeliveryPatch
      // 3 % de 10 000 = 300 < plancher périphérie 2 500, délai inchangé.
      expect(arg.data).toEqual({
        deliveryMode: 'STANDARD',
        deliveryCommune: 'Bingerville',
        deliveryFee: 2500,
      })
    })

    it('première commune sur une commande qui n’en avait pas : le tarif cesse d’être 0', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(
        orderRow({ deliveryCommune: null, deliveryFee: 0 }),
      )
      mockOrderUpdate.mockResolvedValueOnce({})
      mockOrderFindUnique.mockResolvedValueOnce(orderRow())

      await setOrderDelivery('a'.repeat(32), { commune: 'Cocody' })

      const arg = mockOrderUpdate.mock.calls[0]![0] as DeliveryPatch
      expect(arg.data.deliveryFee).toBe(1800)
    })

    it('refuse une requête qui ne change rien', async () => {
      await expect(setOrderDelivery('a'.repeat(32), {})).rejects.toMatchObject({
        code: 'DELIVERY_CHOICE_EMPTY',
        statusCode: 400,
      })
      expect(mockOrderFindUnique).not.toHaveBeenCalled()
    })

    it('refuse le changement après le paiement', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow({ status: 'PAID' }))

      await expect(setOrderDelivery('a'.repeat(32), { mode: 'ECO' })).rejects.toMatchObject({
        code: 'ORDER_DELIVERY_LOCKED',
        statusCode: 409,
      })
      expect(mockOrderUpdate).not.toHaveBeenCalled()
    })

    it('commune inconnue : pas de tarif proposé, aucun choix offert', async () => {
      mockOrderFindUnique.mockResolvedValueOnce(orderRow({ deliveryCommune: null }))

      const { deliveryOptions } = await getOrderByShareToken('a'.repeat(32))

      expect(deliveryOptions.every((o) => o.fee === null)).toBe(true)
    })
  })
})
