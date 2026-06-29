import { describe, it, expect } from 'vitest'
import {
  normalizeMobristoreProduct,
  EXTERNAL_SOURCE_SLUG,
  type MobristoreNormalized,
} from './mobristore.ts'
import { parseCatalogHtml } from '../sources/mobristore.ts'
import type { MobristoreProductRaw } from '../sources/mobristore.ts'

function nz(value: MobristoreNormalized | null): MobristoreNormalized {
  if (!value) throw new Error('expected normalized product, got null')
  return value
}

const baseRaw: MobristoreProductRaw = {
  postId: '303',
  name: 'Phare alto',
  url: 'https://mobristore.com/detail-annonce-piece-auto/mobristore-phare-alto-303',
  brand: 'SUZUKI',
  city: 'Abidjan',
  priceText: '110 000 F',
  imageUrl: 'https://mobristore.com/webSite/images/piece/abc.jpg',
}

describe('normalizeMobristoreProduct', () => {
  it('extracts the basic fields', () => {
    const n = nz(normalizeMobristoreProduct(baseRaw))
    expect(n.externalSource).toBe(EXTERNAL_SOURCE_SLUG)
    expect(n.externalSourceId).toBe('303')
    expect(n.externalSourceUrl).toBe(baseRaw.url)
    expect(n.name).toBe('Phare alto')
    expect(n.price).toBe(110000)
    expect(n.partBrand).toBe('SUZUKI')
    expect(n.condition).toBe('NEW')
    expect(n.partSource).toBe('COMPATIBLE')
    expect(n.inStock).toBe(true)
  })

  it('parses prices with assorted separators and currency text', () => {
    expect(nz(normalizeMobristoreProduct({ ...baseRaw, priceText: '27 500 FCFA' })).price).toBe(27500)
    expect(nz(normalizeMobristoreProduct({ ...baseRaw, priceText: '560 F' })).price).toBe(560)
  })

  it('returns null price when there is no price text', () => {
    expect(nz(normalizeMobristoreProduct({ ...baseRaw, priceText: null })).price).toBeNull()
  })

  it('returns null when the name is empty', () => {
    expect(normalizeMobristoreProduct({ ...baseRaw, name: '  ' })).toBeNull()
  })
})

describe('parseCatalogHtml', () => {
  // Deux variantes (desktop/mobile) du même produit : l'une porte l'image, l'autre la marque.
  const html = `
    <div class="category-grid-box">
      <div class="category-grid-img">
        <img class="img-responsive max-hight-image" src="https://mobristore.com/img/303.jpg">
        <a href="https://mobristore.com/detail-annonce-piece-auto/mobristore-phare-alto-303" class="view-details">Voir</a>
        <div class="additional-information"><p>Pays : null</p><p>Ville : Abidjan</p><p>Marque : SUZUKI</p></div>
      </div>
      <div class="short-description"><div class="row"><div><h3><a title="Phare alto" href="https://mobristore.com/detail-annonce-piece-auto/mobristore-phare-alto-303">Phare alto</a></h3></div>
      <div><div class="price">110 000 F</div></div></div></div>
    </div>
    <div class="category-grid-box">
      <div class="category-grid-img">
        <a href="https://mobristore.com/detail-annonce-piece-auto/mobristore-phare-alto-303" class="view-details">Voir</a>
        <div class="additional-information"><p>Marque : SUZUKI</p></div>
      </div>
      <div class="short-description"><h3><a title="Phare alto" href="https://mobristore.com/detail-annonce-piece-auto/mobristore-phare-alto-303">Phare alto</a></h3>
      <div class="price">110 000 F</div></div>
    </div>`

  it('merges the desktop and mobile variants of a product into one row', () => {
    const rows = parseCatalogHtml(html)
    expect(rows).toHaveLength(1)
    const r = rows[0]
    if (!r) throw new Error('expected exactly one parsed row')
    expect(r.postId).toBe('303')
    expect(r.name).toBe('Phare alto')
    expect(r.brand).toBe('SUZUKI')
    expect(r.imageUrl).toBe('https://mobristore.com/img/303.jpg')
    expect(r.priceText).toBe('110 000 F')
  })
})
