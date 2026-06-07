import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const bufferFindMany = vi.fn()
const bufferFindFirst = vi.fn()
const bufferCreate = vi.fn()
const bufferUpdate = vi.fn()
const bufferUpdateMany = vi.fn()
const bufferDelete = vi.fn()
const catalogFindUnique = vi.fn()
const enterpriseMemberFindUnique = vi.fn()
const enterpriseFindMany = vi.fn()
const orderCreate = vi.fn()
const notifyBufferReplenish = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    enterpriseBufferStock: {
      findMany: (...a: unknown[]) => bufferFindMany(...a),
      findFirst: (...a: unknown[]) => bufferFindFirst(...a),
      create: (...a: unknown[]) => bufferCreate(...a),
      update: (...a: unknown[]) => bufferUpdate(...a),
      updateMany: (...a: unknown[]) => bufferUpdateMany(...a),
      delete: (...a: unknown[]) => bufferDelete(...a),
    },
    catalogItem: { findUnique: (...a: unknown[]) => catalogFindUnique(...a) },
    enterpriseMember: { findUnique: (...a: unknown[]) => enterpriseMemberFindUnique(...a) },
    enterprise: { findMany: (...a: unknown[]) => enterpriseFindMany(...a) },
    order: { create: (...a: unknown[]) => orderCreate(...a) },
  },
}))

vi.mock('../notification/notification.service.js', () => ({
  notifyBufferReplenish: (...a: unknown[]) => notifyBufferReplenish(...a),
}))

const {
  computeStockStatus,
  listBufferStock,
  createBufferStock,
  adjustBufferStock,
  scanAndReplenish,
} = await import('./bufferStock.service.js')

function asMember(role = 'OWNER') {
  enterpriseMemberFindUnique.mockResolvedValue({ role })
}

describe('computeStockStatus', () => {
  it('OUT when currentQty is 0 or below', () => {
    expect(computeStockStatus(0, 10)).toBe('OUT')
    expect(computeStockStatus(-3, 10)).toBe('OUT')
  })
  it('LOW when current < target * 0.5', () => {
    expect(computeStockStatus(4, 10)).toBe('LOW')
  })
  it('BELOW_TARGET when below target but above half', () => {
    expect(computeStockStatus(7, 10)).toBe('BELOW_TARGET')
  })
  it('OK when current >= target', () => {
    expect(computeStockStatus(10, 10)).toBe('OK')
    expect(computeStockStatus(15, 10)).toBe('OK')
  })
})

describe('listBufferStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember('MECHANIC')
  })

  it('augments each row with computed status', async () => {
    bufferFindMany.mockResolvedValueOnce([
      { id: 'b1', currentQty: 0, targetQty: 10 },
      { id: 'b2', currentQty: 3, targetQty: 10 },
      { id: 'b3', currentQty: 10, targetQty: 10 },
    ])
    const result = await listBufferStock('e1', 'u1')
    expect(result[0]?.status).toBe('OUT')
    expect(result[1]?.status).toBe('LOW')
    expect(result[2]?.status).toBe('OK')
  })
})

describe('createBufferStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember('OWNER')
  })

  it('rejects when catalog item does not exist', async () => {
    catalogFindUnique.mockResolvedValueOnce(null)
    await expect(
      createBufferStock('e1', 'u1', { catalogItemId: 'c1', targetQty: 10 }),
    ).rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND' })
  })

  it('rejects when duplicate (already tracked)', async () => {
    catalogFindUnique.mockResolvedValueOnce({ id: 'c1' })
    bufferFindFirst.mockResolvedValueOnce({ id: 'existing' })
    await expect(
      createBufferStock('e1', 'u1', { catalogItemId: 'c1', targetQty: 10 }),
    ).rejects.toMatchObject({ code: 'BUFFER_STOCK_ALREADY_EXISTS' })
  })

  it('creates a row with defaults', async () => {
    catalogFindUnique.mockResolvedValueOnce({ id: 'c1' })
    bufferFindFirst.mockResolvedValueOnce(null)
    bufferCreate.mockResolvedValueOnce({ id: 'b1' })

    await createBufferStock('e1', 'u1', { catalogItemId: 'c1', targetQty: 10 })
    expect(bufferCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enterpriseId: 'e1', catalogItemId: 'c1', targetQty: 10,
          currentQty: 0, autoReplenish: false,
        }),
      }),
    )
  })
})

describe('adjustBufferStock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    asMember('MECHANIC')
  })

  it('clamps currentQty at 0 (never negative)', async () => {
    bufferFindFirst.mockResolvedValueOnce({ id: 'b1', currentQty: 2 })
    bufferUpdate.mockResolvedValueOnce({ id: 'b1' })
    await adjustBufferStock('e1', 'u1', 'b1', -5)
    expect(bufferUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQty: 0 }) }),
    )
  })

  it('adds positive delta normally', async () => {
    bufferFindFirst.mockResolvedValueOnce({ id: 'b1', currentQty: 5 })
    bufferUpdate.mockResolvedValueOnce({ id: 'b1' })
    await adjustBufferStock('e1', 'u1', 'b1', 3)
    expect(bufferUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentQty: 8 }) }),
    )
  })
})

describe('scanAndReplenish', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    orderCreate.mockResolvedValue({ id: 'order-1' })
    bufferUpdateMany.mockResolvedValue({ count: 1 })
    notifyBufferReplenish.mockResolvedValue({ success: true })
  })

  const catalogItem = {
    id: 'c1', name: 'Plaquettes', category: 'Freinage', price: 12_000,
    imageThumbUrl: null, condition: 'NEUF', partSource: 'OEM',
    vendorId: 'v1', vendor: { shopName: 'Bosch Pro' },
  }
  const owner = { role: 'OWNER', userId: 'u-owner', user: { phone: '+2250700000000' } }

  it('creates a DRAFT reorder for below-threshold autoReplenish lines and notifies managers', async () => {
    enterpriseFindMany.mockResolvedValueOnce([
      {
        id: 'e1',
        members: [owner],
        bufferStock: [
          // OUT: 0/10 → deficit 10
          { id: 'b1', targetQty: 10, currentQty: 0, lastReplenishedAt: null, catalogItem },
        ],
      },
    ])

    const res = await scanAndReplenish()

    expect(res.ordersCreated).toBe(1)
    expect(res.linesReplenished).toBe(1)
    // l'item commandé couvre le déficit (target - current = 10)
    const arg = orderCreate.mock.calls[0]![0] as {
      data: { enterpriseId: string; totalAmount: number; items: { create: { quantity: number }[] } }
    }
    expect(arg.data.enterpriseId).toBe('e1')
    expect(arg.data.items.create[0]!.quantity).toBe(10)
    expect(arg.data.totalAmount).toBe(120_000)
    // les lignes sont marquées pour le cooldown
    expect(bufferUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ lastReplenishOrderId: 'order-1' }) }),
    )
    expect(notifyBufferReplenish).toHaveBeenCalledTimes(1)
  })

  it('skips lines recently replenished (cooldown) and lines still above threshold', async () => {
    enterpriseFindMany.mockResolvedValueOnce([
      {
        id: 'e1',
        members: [owner],
        bufferStock: [
          { id: 'b1', targetQty: 10, currentQty: 0, lastReplenishedAt: new Date(), catalogItem }, // cooldown
          { id: 'b2', targetQty: 10, currentQty: 8, lastReplenishedAt: null, catalogItem }, // OK
        ],
      },
    ])

    const res = await scanAndReplenish()
    expect(res.ordersCreated).toBe(0)
    expect(orderCreate).not.toHaveBeenCalled()
  })

  it('skips an enterprise with no manager/owner account to act as initiator', async () => {
    enterpriseFindMany.mockResolvedValueOnce([
      { id: 'e1', members: [], bufferStock: [{ id: 'b1', targetQty: 10, currentQty: 0, lastReplenishedAt: null, catalogItem }] },
    ])
    const res = await scanAndReplenish()
    expect(res.ordersCreated).toBe(0)
  })
})
