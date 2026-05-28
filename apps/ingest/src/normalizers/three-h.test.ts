import { describe, expect, it } from 'vitest'
import { normalizeThreeHProduct, EXTERNAL_SOURCE_SLUG } from './three-h.ts'
import type { ThreeHProductRaw } from '../sources/three-h.ts'

function makeRaw(overrides: Partial<ThreeHProductRaw> = {}): ThreeHProductRaw {
  return {
    '@type': 'Product',
    name: 'BOUGIE D’ALLUMAGE BOSCH FGR7DQP+ - 3H Autoparts Côte d\'Ivoire',
    description: 'Bougie haute performance pour moteurs turbocompressés.',
    sku: '0242236562',
    category: 'LIBRE SERVICE > Bougies d\'allumage',
    image: [{ '@type': 'ImageObject', url: 'https://3hautoparts.com/wp-content/uploads/2022/07/0242236562.jpg' }],
    offers: {
      '@type': 'Offer',
      price: '7650',
      priceCurrency: 'XOF',
      availability: 'https://schema.org/InStock',
      itemCondition: 'NewCondition',
    },
    sourceUrl: 'https://3hautoparts.com/produit/bougie-dallumage-bosch-fgr7dqp/',
    ...overrides,
  }
}

describe('normalizeThreeHProduct', () => {
  it('mappe un produit Bosch OEM en stock', () => {
    const result = normalizeThreeHProduct(makeRaw())
    expect(result).not.toBeNull()
    expect(result?.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(result?.externalSourceId).toBe('bougie-dallumage-bosch-fgr7dqp')
    expect(result?.name).toMatch(/^BOUGIE.*BOSCH FGR7DQP\+$/)
    expect(result?.partBrand).toBe('Bosch')
    expect(result?.partSource).toBe('OEM')
    expect(result?.price).toBe(7650)
    expect(result?.currency).toBe('XOF')
    expect(result?.inStock).toBe(true)
    expect(result?.condition).toBe('NEW')
  })

  it('classe Bardahl comme AFTERMARKET et ignore 250ML comme OEM', () => {
    const result = normalizeThreeHProduct(
      makeRaw({
        name: 'ANTI-BRUIT FREINS BARDAHL 250ML - 3H Autoparts',
        sku: undefined,
      })
    )
    expect(result?.partBrand).toBe('Bardahl')
    expect(result?.partSource).toBe('AFTERMARKET')
    expect(result?.oemReference).toBeNull()
  })

  it('préfère le SKU JSON-LD à la regex titre pour oemReference', () => {
    const result = normalizeThreeHProduct(
      makeRaw({
        name: 'ANTI-BRUIT FREINS BARDAHL 250ML',
        sku: '44632',
      })
    )
    expect(result?.oemReference).toBe('44632')
  })

  it('retourne null si nom vide après strip suffixe', () => {
    const result = normalizeThreeHProduct(
      makeRaw({ name: ' - 3H Autoparts Côte d\'Ivoire' })
    )
    expect(result).toBeNull()
  })

  it('parse les prix sans offres comme null', () => {
    const result = normalizeThreeHProduct(makeRaw({ offers: undefined }))
    expect(result?.price).toBeNull()
    expect(result?.inStock).toBe(false)
  })

  it('extrait FGR7DQP comme OEM si pas de SKU', () => {
    const result = normalizeThreeHProduct(makeRaw({ sku: undefined }))
    expect(result?.oemReference).toBe('FGR7DQP')
  })

  it('gère image unique (non-array)', () => {
    const result = normalizeThreeHProduct(
      makeRaw({
        image: { '@type': 'ImageObject', url: 'https://example.com/img.jpg' },
      })
    )
    expect(result?.imageOriginalUrl).toBe('https://example.com/img.jpg')
  })
})
