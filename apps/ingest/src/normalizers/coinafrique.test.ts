import { describe, it, expect } from 'vitest'
import {
  normalizeCoinAfriqueProduct,
  EXTERNAL_SOURCE_SLUG,
  type CoinAfriqueNormalized,
} from './coinafrique.ts'
import type { CoinAfriqueProductRaw } from '../sources/coinafrique.ts'

function nz(value: CoinAfriqueNormalized | null): CoinAfriqueNormalized {
  if (!value) throw new Error('expected normalized product, got null')
  return value
}

const baseRaw: CoinAfriqueProductRaw = {
  postId: '5919743',
  name: 'Baseus car charger 30w neuf',
  url: 'https://ci.coinafrique.com/annonce/accessoires-et-pieces-detachees/baseus-car-charger-30w-neuf-5919743',
  category: 'Accessoires & pièces détachées',
  priceText: '16 900 CFA',
  imageUrl: 'https://images.coinafrique.com/thumb_5919743.jpg',
}

describe('normalizeCoinAfriqueProduct', () => {
  it('extracts the basic fields', () => {
    const n = nz(normalizeCoinAfriqueProduct(baseRaw))
    expect(n.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(n.externalSourceId).toBe('5919743')
    expect(n.externalSourceUrl).toBe(baseRaw.url)
    expect(n.price).toBe(16900)
    expect(n.inStock).toBe(true)
  })

  it('parses prices with thousands separators', () => {
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, priceText: '195 000 CFA' })).price).toBe(195000)
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, priceText: '1 500 000 CFA' })).price).toBe(1500000)
  })

  it('returns a null price for "Prix sur demande"', () => {
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, priceText: 'Prix sur demande' })).price).toBeNull()
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, priceText: null })).price).toBeNull()
  })

  it('detects NEW from the title, defaults to USED', () => {
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Phare Hyundai Santa Fe neuf' })).condition).toBe('NEW')
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Moteur Hyundai Kia' })).condition).toBe('USED')
  })

  it('detects part brand and classifies OEM', () => {
    const n = nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Pièces Bosch pour BMW' }))
    expect(n.partBrand).toBe('Bosch')
    expect(n.partSource).toBe('OEM')
  })

  it('derives vehicle fitments from the title', () => {
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Phare BMW' })).fitments).toEqual([
      { brand: 'BMW', model: null, yearFrom: null, yearTo: null },
    ])
    // Marque du véhicule détectée même quand un équipementier (Bosch) précède.
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Pièces Bosch pour BMW' })).fitments).toEqual([
      { brand: 'BMW', model: null, yearFrom: null, yearTo: null },
    ])
    // Aucune marque véhicule → pas de fitment (reste générique).
    expect(nz(normalizeCoinAfriqueProduct({ ...baseRaw, name: 'Batterie de voiture' })).fitments).toEqual([])
  })

  it('returns null when the name is empty', () => {
    expect(normalizeCoinAfriqueProduct({ ...baseRaw, name: '   ' })).toBeNull()
  })
})
