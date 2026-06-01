import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryHtml } from './coinafrique.ts'

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
