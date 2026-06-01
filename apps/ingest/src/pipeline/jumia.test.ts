import { describe, it, expect, vi } from 'vitest'
import { loadJumiaItems } from './jumia.ts'
import type { JumiaNormalized } from '../normalizers/jumia.ts'

function makeItem(overrides: Partial<JumiaNormalized> = {}): JumiaNormalized {
  return {
    externalSource: 'JUMIA_CI',
    externalSourceId: '31777449',
    externalSourceUrl: 'https://www.jumia.ci/generic-biellette-31777449.html',
    name: 'Biellette de direction BMW E46',
    category: 'Connecting Rods',
    partBrand: 'Generic',
    oemReference: null,
    price: 23750,
    inStock: true,
    condition: 'NEW',
    partSource: 'AFTERMARKET',
    imageOriginalUrl: 'https://ci.jumia.is/img/1.jpg',
    ...overrides,
  }
}

function makeDb() {
  const vendor = { upsert: vi.fn(async () => ({ id: 'vendor-shadow-jumia' })) }
  const catalogItem = { upsert: vi.fn(async () => ({})) }
  return { db: { vendor, catalogItem } as never, vendor, catalogItem }
}

describe('loadJumiaItems', () => {
  it('upserts the shadow vendor on externalSource and each item on the composite key', async () => {
    const { db, vendor, catalogItem } = makeDb()
    const items = [makeItem(), makeItem({ externalSourceId: '32061947', name: 'Ceinture de sécurité', price: 2900 })]

    const result = await loadJumiaItems(items, db)

    expect(vendor.upsert).toHaveBeenCalledTimes(1)
    const vendorArgs = vendor.upsert.mock.calls[0][0] as {
      where: { externalSource: string }
      create: { isExternal: boolean; externalSource: string; shopName: string }
    }
    expect(vendorArgs.where.externalSource).toBe('JUMIA_CI')
    expect(vendorArgs.create.isExternal).toBe(true)
    expect(vendorArgs.create.shopName).toBe('Jumia CI')

    expect(catalogItem.upsert).toHaveBeenCalledTimes(2)
    const firstCall = catalogItem.upsert.mock.calls[0][0] as {
      where: { uq_catalog_items_external: { externalSource: string; externalSourceId: string } }
      create: { vendorId: string; status: string; price: number }
    }
    expect(firstCall.where.uq_catalog_items_external).toEqual({
      externalSource: 'JUMIA_CI',
      externalSourceId: '31777449',
    })
    expect(firstCall.create.vendorId).toBe('vendor-shadow-jumia')
    expect(firstCall.create.status).toBe('PUBLISHED')
    expect(firstCall.create.price).toBe(23750)

    expect(result).toEqual({ vendorId: 'vendor-shadow-jumia', itemsUpserted: 2 })
  })

  it('passes a null price through', async () => {
    const { db, catalogItem } = makeDb()
    await loadJumiaItems([makeItem({ price: null })], db)
    const args = catalogItem.upsert.mock.calls[0][0] as { create: { price: number | null } }
    expect(args.create.price).toBeNull()
  })
})
