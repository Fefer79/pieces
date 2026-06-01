import { describe, it, expect } from 'vitest'
import { normalizeJumiaProduct, EXTERNAL_SOURCE_SLUG, type JumiaNormalized } from './jumia.ts'
import type { JumiaProductRaw } from '../sources/jumia.ts'

function nz(value: JumiaNormalized | null): JumiaNormalized {
  if (!value) throw new Error('expected normalized product, got null')
  return value
}

const baseRaw: JumiaProductRaw = {
  sku: 'GE070VP1K8ZGXNAFAMZ',
  productId: '31777449',
  name: 'Biellette de direction avec rotule intégrée BMW E46',
  url: 'https://www.jumia.ci/generic-biellette-de-direction-avec-rotule-integree-bmw-e46-31777449.html',
  brand: 'Generic',
  category: 'Connecting Rods',
  priceText: '23,750 FCFA',
  imageUrl: 'https://ci.jumia.is/unsafe/fit-in/300x300/product/94/477713/1.jpg',
}

describe('normalizeJumiaProduct', () => {
  it('extracts the basic fields', () => {
    const n = nz(normalizeJumiaProduct(baseRaw))
    expect(n.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(n.externalSourceId).toBe('31777449')
    expect(n.externalSourceUrl).toBe(baseRaw.url)
    expect(n.name).toBe('Biellette de direction avec rotule intégrée BMW E46')
    expect(n.price).toBe(23750)
    expect(n.condition).toBe('NEW')
    expect(n.inStock).toBe(true)
    expect(n.partSource).toBe('AFTERMARKET')
    expect(n.oemReference).toBeNull()
  })

  it('takes the lower bound of a price range', () => {
    const n = nz(normalizeJumiaProduct({ ...baseRaw, priceText: '2,900 FCFA - 4,820 FCFA' }))
    expect(n.price).toBe(2900)
  })

  it('strips thousands separators and the currency symbol', () => {
    expect(nz(normalizeJumiaProduct({ ...baseRaw, priceText: '1 250 FCFA' })).price).toBe(1250)
    expect(nz(normalizeJumiaProduct({ ...baseRaw, priceText: '41,800 FCFA' })).price).toBe(41800)
  })

  it('returns null price when no price text', () => {
    expect(nz(normalizeJumiaProduct({ ...baseRaw, priceText: null })).price).toBeNull()
  })

  it('classifies known OEM brands as OEM', () => {
    expect(nz(normalizeJumiaProduct({ ...baseRaw, brand: 'Bosch' })).partSource).toBe('OEM')
    expect(nz(normalizeJumiaProduct({ ...baseRaw, brand: 'Motorcraft' })).partSource).toBe('OEM')
  })

  it('returns null when the name is empty', () => {
    expect(normalizeJumiaProduct({ ...baseRaw, name: '   ' })).toBeNull()
  })
})
