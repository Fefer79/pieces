import { describe, it, expect, vi } from 'vitest'
import { loadCoinAfriqueItems } from './coinafrique.ts'
import type { CoinAfriqueNormalized } from '../normalizers/coinafrique.ts'

function makeItem(overrides: Partial<CoinAfriqueNormalized> = {}): CoinAfriqueNormalized {
  return {
    externalSource: 'COINAFRIQUE_CI',
    externalSourceId: '5919743',
    externalSourceUrl: 'https://ci.coinafrique.com/annonce/accessoires-et-pieces-detachees/baseus-5919743',
    name: 'Baseus car charger 30w neuf',
    category: 'Accessoires & pièces détachées',
    partBrand: null,
    oemReference: null,
    price: 16900,
    inStock: true,
    condition: 'NEW',
    partSource: 'AFTERMARKET',
    imageOriginalUrl: 'https://images.coinafrique.com/thumb.jpg',
    fitments: [],
    sellerId: null,
    sellerName: null,
    sellerPhone: null,
    ...overrides,
  }
}

function makeDb() {
  // Renvoie un id de vendeur dérivé de la clé composite → permet d'asserter la dédup.
  const vendor = {
    upsert: vi.fn(async (args: { where: { uq_vendors_external_seller: { externalSellerId: string } } }) => ({
      id: `vendor-${args.where.uq_vendors_external_seller.externalSellerId}`,
    })),
  }
  let n = 0
  const catalogItem = { upsert: vi.fn(async () => ({ id: `item-${n++}` })) }
  const catalogItemFitment = { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 0 })) }
  return { db: { vendor, catalogItem, catalogItemFitment } as never, vendor, catalogItem, catalogItemFitment }
}

describe('loadCoinAfriqueItems', () => {
  it('rattache les annonces sans vendeur au fantôme __shadow__ (une seule fois)', async () => {
    const { db, vendor, catalogItem } = makeDb()
    const items = [makeItem(), makeItem({ externalSourceId: '5920093', name: 'Moteurs hyundai kia', price: null, condition: 'USED' })]

    const result = await loadCoinAfriqueItems(items, db)

    // Dédup : les deux annonces sans sellerId partagent le vendeur fantôme → 1 upsert.
    expect(vendor.upsert).toHaveBeenCalledTimes(1)
    const vendorArgs = vendor.upsert.mock.calls[0][0] as {
      where: { uq_vendors_external_seller: { externalSource: string; externalSellerId: string } }
      create: { isExternal: boolean; vendorType: string; shopName: string }
    }
    expect(vendorArgs.where.uq_vendors_external_seller.externalSource).toBe('COINAFRIQUE_CI')
    expect(vendorArgs.where.uq_vendors_external_seller.externalSellerId).toBe('__shadow__')
    expect(vendorArgs.create.vendorType).toBe('INFORMAL')
    expect(vendorArgs.create.shopName).toBe('CoinAfrique CI')

    expect(catalogItem.upsert).toHaveBeenCalledTimes(2)
    const second = catalogItem.upsert.mock.calls[1][0] as { create: { price: number | null; condition: string } }
    expect(second.create.price).toBeNull()
    expect(second.create.condition).toBe('USED')

    expect(result).toEqual({ vendorIds: ['vendor-__shadow__'], itemsUpserted: 2, fitmentsCreated: 0 })
  })

  it('crée un vendeur par vendeur réel (dédup sur sellerId) avec nom + téléphone', async () => {
    const { db, vendor, catalogItem } = makeDb()
    const items = [
      makeItem({ externalSourceId: 'a1', sellerId: 'uuid-A', sellerName: 'MiTec', sellerPhone: '+2250788151575' }),
      makeItem({ externalSourceId: 'a2', sellerId: 'uuid-A', sellerName: 'MiTec', sellerPhone: '+2250788151575' }),
      makeItem({ externalSourceId: 'b1', sellerId: 'uuid-B', sellerName: 'AutoPlus', sellerPhone: null }),
    ]

    const result = await loadCoinAfriqueItems(items, db)

    // 2 vendeurs distincts (A dédupliqué via le cache), 3 items.
    expect(vendor.upsert).toHaveBeenCalledTimes(2)
    const first = vendor.upsert.mock.calls[0][0] as {
      create: { shopName: string; phone: string; externalSellerId: string }
    }
    expect(first.create.externalSellerId).toBe('uuid-A')
    expect(first.create.shopName).toBe('MiTec')
    expect(first.create.phone).toBe('+2250788151575')
    // Vendeur sans téléphone : phone vide (à compléter par l'admin).
    const second = vendor.upsert.mock.calls[1][0] as { create: { shopName: string; phone: string } }
    expect(second.create.shopName).toBe('AutoPlus')
    expect(second.create.phone).toBe('')

    expect(catalogItem.upsert).toHaveBeenCalledTimes(3)
    // Item A1 rattaché au vendeur A.
    const itemA = catalogItem.upsert.mock.calls[0][0] as { create: { vendorId: string } }
    expect(itemA.create.vendorId).toBe('vendor-uuid-A')
    expect(result.vendorIds.sort()).toEqual(['vendor-uuid-A', 'vendor-uuid-B'])
    expect(result.itemsUpserted).toBe(3)
  })

  it('writes the item fitments (replace-wholesale) and counts them', async () => {
    const { db, catalogItem, catalogItemFitment } = makeDb()
    const items = [
      makeItem({ name: 'Phare BMW', fitments: [{ brand: 'BMW', model: null, yearFrom: null, yearTo: null }] }),
      makeItem({
        externalSourceId: '5920093',
        name: 'Moteur Hyundai Kia',
        fitments: [
          { brand: 'HYUNDAI', model: null, yearFrom: null, yearTo: null },
          { brand: 'KIA', model: null, yearFrom: null, yearTo: null },
        ],
      }),
    ]

    const result = await loadCoinAfriqueItems(items, db)

    // Chaque pièce voit ses fitments purgés puis recréés.
    expect(catalogItemFitment.deleteMany).toHaveBeenCalledTimes(2)
    const firstCreate = catalogItemFitment.createMany.mock.calls[0][0] as {
      data: Array<{ catalogItemId: string; brand: string }>
    }
    expect(firstCreate.data).toEqual([{ catalogItemId: 'item-0', brand: 'BMW', model: null, yearFrom: null, yearTo: null }])
    expect(catalogItem.upsert).toHaveBeenCalledTimes(2)
    expect(result.fitmentsCreated).toBe(3)
  })
})
