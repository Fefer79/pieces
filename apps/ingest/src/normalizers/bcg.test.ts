import { describe, it, expect } from 'vitest'
import { normalizeBcgProduct, EXTERNAL_SOURCE_SLUG, type BcgNormalized } from './bcg.ts'
import type { BcgProductRaw } from '../sources/bcg.ts'

function nz(value: BcgNormalized | null): BcgNormalized {
  if (!value) throw new Error('expected normalized product, got null')
  return value
}

const baseRaw: BcgProductRaw = {
  id: 6454,
  name: 'AMORTISSEUR ARRIERE S-PRESSO',
  slug: 'amortisseur-arriere-s-presso',
  permalink: 'https://bcg-pieceauto.com/product/amortisseur-arriere-s-presso/',
  sku: '',
  short_description:
    '<strong>Compatibilité :</strong> Suzuki S-Presso 1.0L (Années 2019, 2020, 2024). ' +
    '<strong>Référence OEM :</strong> Compatible avec le numéro de pièce 41800M62S00.',
  description: '<div>Amortisseurs arrière pour Suzuki S-Presso (2019+)</div>',
  prices: {
    price: '35000',
    regular_price: '60000',
    sale_price: '35000',
    currency_minor_unit: 0,
  },
  images: [{ src: 'https://bcg-pieceauto.com/wp-content/uploads/2026/01/AMORTISSEUR.png' }],
  categories: [
    { id: 232, name: 'Carrosserie / Vitres', slug: 'carrosserie-vitres-spresso' },
    { id: 67, name: 'Spresso', slug: 'spresso' },
  ],
  tags: [{ id: 296, name: 'S-PRESSO', slug: 's-presso' }],
  brands: [{ id: 50, name: 'Suzuki', slug: 'suzuki' }],
  is_in_stock: true,
  stock_availability: { text: '5 en stock', class: 'in-stock' },
}

describe('normalizeBcgProduct', () => {
  it('extracts the basic fields', () => {
    const n = nz(normalizeBcgProduct(baseRaw))
    expect(n.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(n.externalSourceId).toBe('6454')
    expect(n.externalSourceUrl).toBe(baseRaw.permalink)
    expect(n.name).toBe('AMORTISSEUR ARRIERE S-PRESSO')
    expect(n.price).toBe(35000)
    expect(n.condition).toBe('NEW')
    expect(n.partSource).toBe('COMPATIBLE')
    expect(n.partBrand).toBe('Suzuki')
    expect(n.inStock).toBe(true)
    expect(n.imageOriginalUrl).toContain('AMORTISSEUR.png')
  })

  it('extracts the OEM part number from the description', () => {
    expect(nz(normalizeBcgProduct(baseRaw)).oemReference).toBe('41800M62S00')
  })

  it('prefers a valid SKU but rejects a price-like SKU', () => {
    expect(nz(normalizeBcgProduct({ ...baseRaw, sku: '31400-M62S00' })).oemReference).toBe('31400-M62S00')
    // « 60000 » est un prix saisi à tort → on retombe sur l'extraction description.
    expect(nz(normalizeBcgProduct({ ...baseRaw, sku: '60000' })).oemReference).toBe('41800M62S00')
  })

  it('canonicalises Spresso to S-Presso in the fitment', () => {
    const n = nz(normalizeBcgProduct(baseRaw))
    expect(n.fitments).toHaveLength(1)
    expect(n.fitments[0]?.brand).toBe('Suzuki')
    expect(n.fitments[0]?.model).toBe('S-Presso')
    expect(n.fitments[0]?.yearFrom).toBe(2019)
    expect(n.fitments[0]?.yearTo).toBe(2024)
  })

  it('falls back to regular_price when sale price is missing', () => {
    const raw = { ...baseRaw, prices: { ...baseRaw.prices, price: '0', regular_price: '60000' } }
    expect(nz(normalizeBcgProduct(raw)).price).toBe(60000)
  })

  it('returns null when the name is empty', () => {
    expect(normalizeBcgProduct({ ...baseRaw, name: '   ' })).toBeNull()
  })
})
