import { describe, it, expect, vi } from 'vitest'
import { loadGlobalAutoItems } from './global-auto-products.ts'
import { EXTERNAL_SOURCE_SLUG, type GlobalAutoNormalized } from '../normalizers/global-auto-products.ts'

function makeMockDb(opts: { existingVendor?: boolean } = {}) {
  const vendorUpsert = vi.fn(() => ({ id: opts.existingVendor ? 'existing-vendor' : 'new-vendor' }))
  const itemUpsert = vi.fn(({ create }) => ({ id: `item-${create.externalSourceId}` }))
  const fitmentDelete = vi.fn(() => ({ count: 0 }))
  const fitmentCreate = vi.fn(({ data }: { data: unknown[] }) => ({ count: data.length }))
  return {
    db: {
      vendor: { upsert: vendorUpsert },
      catalogItem: { upsert: itemUpsert },
      catalogItemFitment: { deleteMany: fitmentDelete, createMany: fitmentCreate },
    },
    vendorUpsert, itemUpsert, fitmentDelete, fitmentCreate,
  }
}

const sampleItem: GlobalAutoNormalized = {
  externalSource: EXTERNAL_SOURCE_SLUG,
  externalSourceId: '3865',
  externalSourceUrl: 'https://global-auto.online/products/balai',
  name: 'Balai essuie-glace',
  description: null,
  category: 'Autre',
  partBrand: null,
  oemReference: '1642333780',
  price: 14000,
  inStock: true,
  condition: 'NEW',
  partSource: 'AFTERMARKET',
  imageOriginalUrl: null,
  fitments: [
    { brand: 'PEUGEOT', model: '208', yearFrom: 2019, yearTo: null, engine: '1.6 THP' },
    { brand: 'DS', model: 'DS5', yearFrom: 2015, yearTo: 2018, engine: '2.0 BlueHDi' },
  ],
}

describe('loadGlobalAutoItems', () => {
  it('upserts the shadow vendor with isExternal=true and EXTERNAL_SOURCE_SLUG', async () => {
    const { db, vendorUpsert } = makeMockDb()
    await loadGlobalAutoItems([sampleItem],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any)
    expect(vendorUpsert).toHaveBeenCalledTimes(1)
    const call = vendorUpsert.mock.calls[0][0] as { where: { uq_vendors_external_seller: { externalSource: string; externalSellerId: string } }; create: { isExternal: boolean; externalSource: string } }
    expect(call.where).toEqual({ uq_vendors_external_seller: { externalSource: EXTERNAL_SOURCE_SLUG, externalSellerId: '__shadow__' } })
    expect(call.create.isExternal).toBe(true)
    expect(call.create.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
  })

  it('upserts each catalog item keyed on (externalSource, externalSourceId)', async () => {
    const { db, itemUpsert } = makeMockDb()
    const result = await loadGlobalAutoItems([sampleItem],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any)
    expect(itemUpsert).toHaveBeenCalledTimes(1)
    expect(result.itemsUpserted).toBe(1)
    const where = itemUpsert.mock.calls[0][0].where
    expect(where).toEqual({
      uq_catalog_items_external: {
        externalSource: EXTERNAL_SOURCE_SLUG,
        externalSourceId: '3865',
      },
    })
    expect(itemUpsert.mock.calls[0][0].create.status).toBe('PUBLISHED')
  })

  it('replaces fitments wholesale for each item (deleteMany + createMany)', async () => {
    const { db, fitmentDelete, fitmentCreate } = makeMockDb()
    const result = await loadGlobalAutoItems([sampleItem],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any)
    expect(fitmentDelete).toHaveBeenCalledWith({ where: { catalogItemId: 'item-3865' } })
    expect(fitmentCreate).toHaveBeenCalledTimes(1)
    expect((fitmentCreate.mock.calls[0][0] as { data: unknown[] }).data).toHaveLength(2)
    expect(result.fitmentsCreated).toBe(2)
  })

  it('skips createMany when an item has zero fitments', async () => {
    const { db, fitmentDelete, fitmentCreate } = makeMockDb()
    await loadGlobalAutoItems([{ ...sampleItem, fitments: [] }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any)
    expect(fitmentDelete).toHaveBeenCalledTimes(1)
    expect(fitmentCreate).not.toHaveBeenCalled()
  })
})
