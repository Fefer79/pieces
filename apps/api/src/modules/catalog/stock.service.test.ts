import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const orderItemFindMany = vi.fn()
const catalogItemFindUnique = vi.fn()
const catalogItemUpdate = vi.fn()
const mockNotifyLowStock = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    orderItem: { findMany: (...a: unknown[]) => orderItemFindMany(...a) },
    catalogItem: {
      findUnique: (...a: unknown[]) => catalogItemFindUnique(...a),
      update: (...a: unknown[]) => catalogItemUpdate(...a),
    },
  },
}))

vi.mock('../notification/notification.service.js', () => ({
  notifyVendorLowStock: (...a: unknown[]) => mockNotifyLowStock(...a),
}))

const { consumeStockForOrder } = await import('./stock.service.js')

const VENDOR = { phone: '+2250700000000', shopName: 'Garage Adjamé' }

function catalogItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-1',
    name: 'Plaquettes de frein',
    stockQuantity: 5,
    lowStockThreshold: 1,
    vendor: VENDOR,
    ...overrides,
  }
}

describe('consumeStockForOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    catalogItemUpdate.mockResolvedValue({})
    mockNotifyLowStock.mockResolvedValue({ success: true })
  })

  it('décrémente la quantité et garde inStock=true au-dessus de zéro', async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 2 }])
    catalogItemFindUnique.mockResolvedValueOnce(catalogItem({ stockQuantity: 5 }))

    await consumeStockForOrder('order-1')

    expect(catalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stockQuantity: 3, inStock: true },
    })
    expect(mockNotifyLowStock).not.toHaveBeenCalled()
  })

  it('ignore les fiches à quantité non suivie (stockQuantity null)', async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 1 }])
    catalogItemFindUnique.mockResolvedValueOnce(catalogItem({ stockQuantity: null }))

    await consumeStockForOrder('order-1')

    expect(catalogItemUpdate).not.toHaveBeenCalled()
    expect(mockNotifyLowStock).not.toHaveBeenCalled()
  })

  it('passe inStock=false et alerte rupture quand le stock tombe à 0', async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 2 }])
    catalogItemFindUnique.mockResolvedValueOnce(catalogItem({ stockQuantity: 2 }))

    await consumeStockForOrder('order-1')

    expect(catalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stockQuantity: 0, inStock: false },
    })
    expect(mockNotifyLowStock).toHaveBeenCalledWith('+2250700000000', 'Plaquettes de frein', 0)
  })

  it('alerte au franchissement du seuil', async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 1 }])
    catalogItemFindUnique.mockResolvedValueOnce(
      catalogItem({ stockQuantity: 4, lowStockThreshold: 3 }),
    )

    await consumeStockForOrder('order-1')

    expect(catalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stockQuantity: 3, inStock: true },
    })
    expect(mockNotifyLowStock).toHaveBeenCalledWith('+2250700000000', 'Plaquettes de frein', 3)
  })

  it("n'alerte pas de nouveau sous le seuil déjà franchi", async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 1 }])
    catalogItemFindUnique.mockResolvedValueOnce(
      catalogItem({ stockQuantity: 3, lowStockThreshold: 3 }),
    )

    await consumeStockForOrder('order-1')

    // 3 → 2 : déjà sous/au seuil avant la vente, pas de nouvelle alerte
    expect(catalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stockQuantity: 2, inStock: true },
    })
    expect(mockNotifyLowStock).not.toHaveBeenCalled()
  })

  it('ne descend jamais sous zéro', async () => {
    orderItemFindMany.mockResolvedValueOnce([{ catalogItemId: 'item-1', quantity: 10 }])
    catalogItemFindUnique.mockResolvedValueOnce(catalogItem({ stockQuantity: 1 }))

    await consumeStockForOrder('order-1')

    expect(catalogItemUpdate).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: { stockQuantity: 0, inStock: false },
    })
  })

  it('avale les erreurs sans throw (fire-and-forget)', async () => {
    orderItemFindMany.mockRejectedValueOnce(new Error('db down'))
    await expect(consumeStockForOrder('order-1')).resolves.toBeUndefined()
  })
})
