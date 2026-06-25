import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryHtml, parseAdDetail, normalizeIvoirianPhone } from './coinafrique.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(resolve(HERE, '__fixtures__/coinafrique-category.html'), 'utf8')

describe('parseCategoryHtml', () => {
  const products = parseCategoryHtml(fixture)

  it('parses every ad card', () => {
    expect(products.length).toBeGreaterThanOrEqual(3)
  })

  it('extracts id, name, url and price from the first card', () => {
    const p = products[0]
    expect(p.postId).toBe('5919743')
    expect(p.name).toBe('Baseus car charger 30w neuf')
    expect(p.url).toBe(
      'https://ci.coinafrique.com/annonce/accessoires-et-pieces-detachees/baseus-car-charger-30w-neuf-5919743',
    )
    expect(p.priceText).toContain('16 900')
    expect(p.imageUrl).toMatch(/^https:\/\/images\.coinafrique\.com\//)
  })

  it('keeps the "Prix sur demande" text verbatim (no fake price)', () => {
    const onDemand = products.find((p) => /sur demande/i.test(p.priceText ?? ''))
    expect(onDemand).toBeDefined()
    expect(onDemand?.priceText).toMatch(/Prix sur demande/i)
  })

  it('decodes the category entity', () => {
    expect(products[0].category).toBe('Accessoires & pièces détachées')
  })
})

// Markup repris de la vraie page détail (HTML statique, aucun AJAX).
const AD_DETAIL_HTML = `
  <div class="profile-card__content">
    <p class="username"><a href="/profil/e4f5282c-6b6b-4284-b7a8-92f5c3fc8c94">MiTec</a></p>
    <p class="physical-address"><span class="physical-address__name">Côte d'Ivoire</span></p>
  </div>
  <div data-user-id="e4f5282c-6b6b-4284-b7a8-92f5c3fc8c94" data-user-address="Côte d'Ivoire"></div>
  <a class="btn see-number btn-contact" href="javascript:;" data-post-id="5919743"
     data-contact-ad-owner-ad-detail data-phone-number="+2250788151575">Afficher le numéro</a>
  <a class="btn btn-contact see-number" href="tel:+2250788151575" data-post-id="5919743">Appeler</a>
`

// Cas téléphone masqué : bouton see-number sans data-phone-number ni tel:.
const AD_DETAIL_NO_PHONE = `
  <div class="profile-card__content">
    <p class="username"><a href="/profil/abc123-uuid">AutoPlus Abidjan</a></p>
  </div>
  <div data-user-id="abc123-uuid"></div>
  <a class="btn see-number btn-contact" href="javascript:;" data-post-id="42"
     data-contact-ad-owner-ad-detail>Afficher le numéro</a>
`

describe('parseAdDetail', () => {
  it('extracts seller id (UUID), name and phone from the detail page', () => {
    const d = parseAdDetail(AD_DETAIL_HTML)
    expect(d.sellerId).toBe('e4f5282c-6b6b-4284-b7a8-92f5c3fc8c94')
    expect(d.sellerName).toBe('MiTec')
    expect(d.phone).toBe('+2250788151575')
  })

  it('returns null phone when the number is hidden, but still gets seller id + name', () => {
    const d = parseAdDetail(AD_DETAIL_NO_PHONE)
    expect(d.sellerId).toBe('abc123-uuid')
    expect(d.sellerName).toBe('AutoPlus Abidjan')
    expect(d.phone).toBeNull()
  })

  it('returns all-null on markup without a seller block', () => {
    const d = parseAdDetail('<div>annonce sans vendeur</div>')
    expect(d).toEqual({ sellerId: null, sellerName: null, phone: null })
  })
})

describe('normalizeIvoirianPhone', () => {
  it('keeps a well-formed +225 number', () => {
    expect(normalizeIvoirianPhone('+2250788151575')).toBe('+2250788151575')
  })

  it('coerces spaced, 00225 and bare 10-digit forms', () => {
    expect(normalizeIvoirianPhone('07 88 15 15 75')).toBe('+2250788151575')
    expect(normalizeIvoirianPhone('002250788151575')).toBe('+2250788151575')
    expect(normalizeIvoirianPhone('0788151575')).toBe('+2250788151575')
  })

  it('rejects junk / wrong length', () => {
    expect(normalizeIvoirianPhone(null)).toBeNull()
    expect(normalizeIvoirianPhone('25')).toBeNull()
    expect(normalizeIvoirianPhone('+33123456789')).toBeNull()
  })
})
