import { describe, it, expect, vi } from 'vitest'
import { loadThreeHItems } from './three-h.ts'
import type { ThreeHNormalized } from '../normalizers/three-h.ts'

function makeItem(overrides: Partial<ThreeHNormalized> = {}): ThreeHNormalized {
  return {
    externalSource: '3hautoparts',
    externalSourceId: 'filtre-a-huile-bosch-0451103316',
    externalSourceUrl: 'https://3hautoparts.ci/produit/filtre-a-huile-bosch-0451103316/',
    name: 'Filtre à huile Bosch 0451103316',
    description: null,
    category: 'Filtration',
    partBrand: 'Bosch',
    oemReference: '0451103316',
    price: 12500,
    currency: 'XOF',
    inStock: true,
    condition: 'NEW',
    partSource: 'OEM',
    imageOriginalUrl: 'https://3hautoparts.ci/wp-content/uploads/img.jpg',
    sku: '0451103316',
    ...overrides,
  }
}

function makeDb() {
  const vendor = {
    upsert: vi.fn(async () => ({ id: 'vendor-shadow-3h' })),
  }
  const catalogItem = {
    upsert: vi.fn(async () => ({})),
  }
  return {
    db: { vendor, catalogItem } as never,
    vendor,
    catalogItem,
  }
}

describe('loadThreeHItems', () => {
  it('upserts the shadow vendor on externalSource and each catalog item on the composite key', async () => {
    const { db, vendor, catalogItem } = makeDb()
    const items = [makeItem(), makeItem({ externalSourceId: 'plaquettes-bosch', name: 'Plaquettes Bosch', oemReference: 'BP1234' })]

    const result = await loadThreeHItems(items, db)

    expect(vendor.upsert).toHaveBeenCalledTimes(1)
    const vendorArgs = vendor.upsert.mock.calls[0][0] as { where: { uq_vendors_external_seller: { externalSource: string; externalSellerId: string } }; create: { isExternal: boolean; externalSource: string; shopName: string } }
    expect(vendorArgs.where.uq_vendors_external_seller.externalSource).toBe('3hautoparts')
    expect(vendorArgs.where.uq_vendors_external_seller.externalSellerId).toBe('__shadow__')
    expect(vendorArgs.create.isExternal).toBe(true)
    expect(vendorArgs.create.shopName).toBe('3H Autoparts')

    expect(catalogItem.upsert).toHaveBeenCalledTimes(2)
    const firstCall = catalogItem.upsert.mock.calls[0][0] as {
      where: { uq_catalog_items_external: { externalSource: string; externalSourceId: string } }
      create: { vendorId: string; name: string; price: number; status: string; partSource: string; externalSourceUrl: string }
    }
    expect(firstCall.where.uq_catalog_items_external).toEqual({
      externalSource: '3hautoparts',
      externalSourceId: 'filtre-a-huile-bosch-0451103316',
    })
    expect(firstCall.create.vendorId).toBe('vendor-shadow-3h')
    expect(firstCall.create.status).toBe('PUBLISHED')
    expect(firstCall.create.partSource).toBe('OEM')
    expect(firstCall.create.price).toBe(12500)

    expect(result).toEqual({ vendorId: 'vendor-shadow-3h', upserted: 2 })
  })

  it('passes nullable fields through (no price, no oem)', async () => {
    const { db, catalogItem } = makeDb()
    await loadThreeHItems([makeItem({ price: null, oemReference: null, imageOriginalUrl: null })], db)
    const args = catalogItem.upsert.mock.calls[0][0] as {
      create: { price: number | null; oemReference: string | null; imageOriginalUrl: string | null }
    }
    expect(args.create.price).toBeNull()
    expect(args.create.oemReference).toBeNull()
    expect(args.create.imageOriginalUrl).toBeNull()
  })
})
