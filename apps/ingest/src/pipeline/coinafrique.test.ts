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
    ...overrides,
  }
}

function makeDb() {
  const vendor = { upsert: vi.fn(async () => ({ id: 'vendor-shadow-coin' })) }
  let n = 0
  const catalogItem = { upsert: vi.fn(async () => ({ id: `item-${n++}` })) }
  const catalogItemFitment = { deleteMany: vi.fn(async () => ({ count: 0 })), createMany: vi.fn(async () => ({ count: 0 })) }
  return { db: { vendor, catalogItem, catalogItemFitment } as never, vendor, catalogItem, catalogItemFitment }
}

describe('loadCoinAfriqueItems', () => {
  it('upserts an INFORMAL shadow vendor and each item on the composite key', async () => {
    const { db, vendor, catalogItem } = makeDb()
    const items = [makeItem(), makeItem({ externalSourceId: '5920093', name: 'Moteurs hyundai kia', price: null, condition: 'USED' })]

    const result = await loadCoinAfriqueItems(items, db)

    const vendorArgs = vendor.upsert.mock.calls[0][0] as {
      where: { externalSource: string }
      create: { isExternal: boolean; vendorType: string; shopName: string }
    }
    expect(vendorArgs.where.externalSource).toBe('COINAFRIQUE_CI')
    expect(vendorArgs.create.vendorType).toBe('INFORMAL')
    expect(vendorArgs.create.shopName).toBe('CoinAfrique CI')

    expect(catalogItem.upsert).toHaveBeenCalledTimes(2)
    const second = catalogItem.upsert.mock.calls[1][0] as { create: { price: number | null; condition: string } }
    expect(second.create.price).toBeNull()
    expect(second.create.condition).toBe('USED')

    expect(result).toEqual({ vendorId: 'vendor-shadow-coin', itemsUpserted: 2, fitmentsCreated: 0 })
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
