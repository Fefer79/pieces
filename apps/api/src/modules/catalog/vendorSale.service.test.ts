import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubEnv('DATABASE_URL', 'postgresql://localhost:5432/pieces')
vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')
vi.stubEnv('PINO_LOG_LEVEL', 'error')
vi.stubEnv('PORT', '3001')

const vendorFindUnique = vi.fn()
const catalogItemFindFirst = vi.fn()
const catalogItemUpdate = vi.fn()
const vendorSaleCreate = vi.fn()
const vendorSaleFindMany = vi.fn()
const vendorSaleCount = vi.fn()
const stockLevelFindFirst = vi.fn()
const stockLevelUpdate = vi.fn()
const stockMovementCreate = vi.fn()
const mockNotifyLowStock = vi.fn()

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    vendor: { findUnique: (...a: unknown[]) => vendorFindUnique(...a) },
    catalogItem: {
      findFirst: (...a: unknown[]) => catalogItemFindFirst(...a),
      update: (...a: unknown[]) => catalogItemUpdate(...a),
    },
    vendorSale: {
      create: (...a: unknown[]) => vendorSaleCreate(...a),
      findMany: (...a: unknown[]) => vendorSaleFindMany(...a),
      count: (...a: unknown[]) => vendorSaleCount(...a),
    },
    stockLevel: {
      findFirst: (...a: unknown[]) => stockLevelFindFirst(...a),
      update: (...a: unknown[]) => stockLevelUpdate(...a),
    },
    stockMovement: {
      create: (...a: unknown[]) => stockMovementCreate(...a),
    },
  },
}))

vi.mock('../notification/notification.service.js', () => ({
  notifyVendorLowStock: (...a: unknown[]) => mockNotifyLowStock(...a),
}))

const { createVendorSale, getVendorSales } = await import('./vendorSale.service.js')

const VENDOR = { id: 'vendor-1', phone: '+2250700000000' }

describe('vendorSale.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vendorFindUnique.mockResolvedValue(VENDOR)
    vendorSaleCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'sale-1',
      ...data,
    }))
    catalogItemUpdate.mockResolvedValue({})
    stockLevelFindFirst.mockResolvedValue(null)
    mockNotifyLowStock.mockResolvedValue({ success: true })
  })

  describe('createVendorSale', () => {
    it('refuse un utilisateur sans profil vendeur', async () => {
      vendorFindUnique.mockResolvedValueOnce(null)

      await expect(
        createVendorSale('user-1', { quantity: 1, unitPrice: 5000, channel: 'BOUTIQUE', itemName: 'Filtre' }),
      ).rejects.toMatchObject({ code: 'VENDOR_NOT_FOUND', statusCode: 404 })
    })

    it("refuse une vente sans nom d'article et sans pièce catalogue", async () => {
      await expect(
        createVendorSale('user-1', { quantity: 1, unitPrice: 5000, channel: 'BOUTIQUE' }),
      ).rejects.toMatchObject({ code: 'VENDOR_SALE_ITEM_NAME_REQUIRED', statusCode: 400 })
    })

    it('enregistre une vente hors catalogue (itemName libre) sans toucher au stock', async () => {
      const result = await createVendorSale('user-1', {
        itemName: 'Rétroviseur générique',
        quantity: 2,
        unitPrice: 3000,
        channel: 'WHATSAPP',
        buyerPhone: '+2250701020304',
      })

      expect(result.totalAmount).toBe(6000)
      expect(vendorSaleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          vendorId: 'vendor-1',
          catalogItemId: undefined,
          itemName: 'Rétroviseur générique',
          quantity: 2,
          unitPrice: 3000,
          totalAmount: 6000,
          channel: 'WHATSAPP',
          createdById: 'user-1',
        }),
      })
      expect(catalogItemUpdate).not.toHaveBeenCalled()
    })

    it('décrémente le stock suivi de la fiche catalogue vendue', async () => {
      catalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1',
        stockQuantity: 5,
        lowStockThreshold: 1,
        name: 'Plaquettes de frein',
      })

      await createVendorSale('user-1', {
        catalogItemId: 'item-1',
        quantity: 2,
        unitPrice: 4000,
        channel: 'BOUTIQUE',
      })

      expect(catalogItemUpdate).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { stockQuantity: 3, inStock: true },
      })
      expect(mockNotifyLowStock).not.toHaveBeenCalled()
    })

    it('alerte le vendeur au franchissement du seuil de stock bas', async () => {
      catalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1',
        stockQuantity: 2,
        lowStockThreshold: 1,
        name: 'Plaquettes de frein',
      })

      await createVendorSale('user-1', {
        catalogItemId: 'item-1',
        quantity: 1,
        unitPrice: 4000,
        channel: 'BOUTIQUE',
      })

      expect(catalogItemUpdate).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { stockQuantity: 1, inStock: true },
      })
      await vi.waitFor(() =>
        expect(mockNotifyLowStock).toHaveBeenCalledWith('+2250700000000', 'Plaquettes de frein', 1),
      )
    })

    it('ignore une fiche catalogue à quantité non suivie (stockQuantity null)', async () => {
      catalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1',
        stockQuantity: null,
        lowStockThreshold: 1,
        name: 'Plaquettes de frein',
      })

      await createVendorSale('user-1', {
        catalogItemId: 'item-1',
        quantity: 1,
        unitPrice: 4000,
        channel: 'BOUTIQUE',
      })

      expect(catalogItemUpdate).not.toHaveBeenCalled()
    })

    it("refuse une pièce catalogue qui n'appartient pas au vendeur", async () => {
      catalogItemFindFirst.mockResolvedValueOnce(null)

      await expect(
        createVendorSale('user-1', {
          catalogItemId: 'item-999',
          quantity: 1,
          unitPrice: 4000,
          channel: 'BOUTIQUE',
        }),
      ).rejects.toMatchObject({ code: 'CATALOG_ITEM_NOT_FOUND', statusCode: 404 })
    })

    it('trace le mouvement de stock avec refType VendorSale quand un StockLevel existe', async () => {
      catalogItemFindFirst.mockResolvedValueOnce({
        id: 'item-1',
        stockQuantity: 5,
        lowStockThreshold: 1,
        name: 'Plaquettes de frein',
      })
      stockLevelFindFirst.mockResolvedValueOnce({ id: 'level-1', locationId: 'loc-1', qtyOnHand: 10 })

      const result = await createVendorSale('user-1', {
        catalogItemId: 'item-1',
        quantity: 2,
        unitPrice: 4000,
        channel: 'BOUTIQUE',
      })

      expect(stockMovementCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SORTIE_COMMANDE',
          catalogItemId: 'item-1',
          locationId: 'loc-1',
          quantite: 2,
          refType: 'VendorSale',
          refId: result.id,
          actorId: 'user-1',
        }),
      })
    })
  })

  describe('getVendorSales', () => {
    it('refuse un utilisateur sans profil vendeur', async () => {
      vendorFindUnique.mockResolvedValueOnce(null)

      await expect(getVendorSales('user-1')).rejects.toMatchObject({
        code: 'VENDOR_NOT_FOUND',
        statusCode: 404,
      })
    })

    it('liste les ventes du vendeur, paginées', async () => {
      vendorSaleFindMany.mockResolvedValueOnce([{ id: 'sale-1' }])
      vendorSaleCount.mockResolvedValueOnce(1)

      const result = await getVendorSales('user-1', { page: 1, limit: 20 })

      expect(result).toEqual({ sales: [{ id: 'sale-1' }], total: 1, page: 1, limit: 20 })
      expect(vendorSaleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { vendorId: 'vendor-1' }, skip: 0, take: 20 }),
      )
    })
  })
})
