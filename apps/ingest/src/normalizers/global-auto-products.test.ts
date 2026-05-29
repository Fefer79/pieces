import { describe, it, expect } from 'vitest'
import {
  normalizeGlobalAutoProduct,
  compatibilityToFitments,
  EXTERNAL_SOURCE_SLUG,
  type GlobalAutoNormalized,
} from './global-auto-products.ts'
import type { GaProduct, GaVehicleCompatibility } from '../sources/global-auto.ts'

function nz(value: GlobalAutoNormalized | null): GlobalAutoNormalized {
  if (!value) throw new Error('expected normalized product, got null')
  return value
}

const baseProduct: GaProduct = {
  id: 3865,
  sku: '1642333780',
  name: "BALAI D'ESSUI GLACE ",
  slug: 'balai-dessui-glace-8',
  short_description: null,
  description: null,
  regular_price: '14000.00',
  sale_price: null,
  stock_quantity: 5,
  stock_status: 'in_stock',
  is_featured: false,
  published: true,
  visibility: 'visible',
  category_id: 19,
  category_name: 'Autre',
  category_slug: 'autre',
  brand_id: null,
  brand_name: null,
  brand_slug: null,
  images: [],
  vehicle_compatibility: [],
}

describe('normalizeGlobalAutoProduct', () => {
  it('extracts the basic fields', () => {
    const n = nz(normalizeGlobalAutoProduct(baseProduct))
    expect(n.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(n.externalSourceId).toBe('3865')
    expect(n.externalSourceUrl).toBe('https://global-auto.online/products/balai-dessui-glace-8')
    expect(n.name).toBe("BALAI D'ESSUI GLACE")
    expect(n.oemReference).toBe('1642333780')
    expect(n.price).toBe(14000)
    expect(n.inStock).toBe(true)
    expect(n.condition).toBe('NEW')
    expect(n.partSource).toBe('AFTERMARKET')
  })

  it('prefers sale_price over regular_price', () => {
    const n = nz(normalizeGlobalAutoProduct({ ...baseProduct, sale_price: '12000' }))
    expect(n.price).toBe(12000)
  })

  it('returns null when name is empty', () => {
    expect(normalizeGlobalAutoProduct({ ...baseProduct, name: '   ' })).toBeNull()
  })

  it('classifies as OEM when brand is in the OEM list', () => {
    const n = nz(normalizeGlobalAutoProduct({ ...baseProduct, brand_name: 'Bosch' }))
    expect(n.partSource).toBe('OEM')
  })

  it('reads inStock from stock_quantity when stock_status is missing', () => {
    const n = nz(normalizeGlobalAutoProduct({ ...baseProduct, stock_status: null, stock_quantity: 3 }))
    expect(n.inStock).toBe(true)
    const n2 = nz(normalizeGlobalAutoProduct({ ...baseProduct, stock_status: null, stock_quantity: 0 }))
    expect(n2.inStock).toBe(false)
  })

  it('picks the first image url when available', () => {
    const n = nz(normalizeGlobalAutoProduct({
      ...baseProduct,
      images: [{ url: 'https://cdn.example/a.jpg' }, { url: 'b.jpg' }],
    }))
    expect(n.imageOriginalUrl).toBe('https://cdn.example/a.jpg')
  })

  it('rejects negative or zero prices', () => {
    const n = nz(normalizeGlobalAutoProduct({ ...baseProduct, regular_price: '0' }))
    expect(n.price).toBeNull()
  })
})

describe('compatibilityToFitments', () => {
  it('parses year ranges from series labels', () => {
    const compat: GaVehicleCompatibility[] = [{
      make_id: 12, make_name: 'DS', model_id: 73, model_name: 'DS5',
      series_id: 118, series_name: '(05/2015 - 04/2018)',
      trim_id: 952, trim_name: '2.0 Blue HDi S&S 136 cv',
      engine_id: null, engine_name: null,
    }]
    const f = compatibilityToFitments(compat)
    expect(f).toEqual([{ brand: 'DS', model: 'DS5', yearFrom: 2015, yearTo: 2018, engine: '2.0 Blue HDi S&S 136 cv' }])
  })

  it('handles open-ended series labels (...)', () => {
    const compat: GaVehicleCompatibility[] = [{
      make_id: 1, make_name: 'PEUGEOT', model_id: 10, model_name: '208',
      series_id: 100, series_name: 'II (P21) (05/2019 - ...)',
      trim_id: 1000, trim_name: '1.6 THP 165 cv',
      engine_id: null, engine_name: null,
    }]
    const f = compatibilityToFitments(compat)
    expect(f[0].yearFrom).toBe(2019)
    expect(f[0].yearTo).toBeNull()
  })

  it('keeps make-only entries (model/series null)', () => {
    const compat: GaVehicleCompatibility[] = [{
      make_id: 35, make_name: 'PEUGEOT', model_id: null, model_name: null,
      series_id: null, series_name: null, trim_id: null, trim_name: null,
      engine_id: null, engine_name: null,
    }]
    expect(compatibilityToFitments(compat)).toEqual([{
      brand: 'PEUGEOT', model: null, yearFrom: null, yearTo: null, engine: null,
    }])
  })

  it('dedupes identical fitments', () => {
    const c: GaVehicleCompatibility = {
      make_id: 1, make_name: 'PEUGEOT', model_id: 10, model_name: '208',
      series_id: 100, series_name: 'II (P21) (05/2019 - ...)',
      trim_id: 1000, trim_name: '1.6 THP 165 cv',
      engine_id: null, engine_name: null,
    }
    expect(compatibilityToFitments([c, c, c])).toHaveLength(1)
  })

  it('drops entries with no make_name', () => {
    const compat: GaVehicleCompatibility[] = [{
      make_id: null, make_name: null, model_id: null, model_name: null,
      series_id: null, series_name: null, trim_id: null, trim_name: null,
      engine_id: null, engine_name: null,
    }]
    expect(compatibilityToFitments(compat)).toEqual([])
  })
})
