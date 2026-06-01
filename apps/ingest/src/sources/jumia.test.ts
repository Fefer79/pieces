import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCategoryHtml, parseMaxPage } from './jumia.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(resolve(HERE, '__fixtures__/jumia-category.html'), 'utf8')

describe('parseCategoryHtml', () => {
  const products = parseCategoryHtml(fixture)

  it('parses every product card', () => {
    expect(products).toHaveLength(2)
  })

  it('extracts id, name, url, brand and price from the first card', () => {
    const p = products[0]
    expect(p.productId).toBe('31777449')
    expect(p.name).toContain('Biellette de direction')
    expect(p.url).toBe(
      'https://www.jumia.ci/generic-biellette-de-direction-avec-rotule-integree-bmw-e46-31777449.html',
    )
    expect(p.brand).toBe('Generic')
    expect(p.priceText).toBe('23,750 FCFA')
    expect(p.sku).toBe('GE070VP1K8ZGXNAFAMZ')
  })

  it('keeps the real (data-src) image and drops the inline svg placeholder', () => {
    expect(products[0].imageUrl).toMatch(/^https:\/\/ci\.jumia\.is\//)
    expect(products[0].imageUrl).not.toMatch(/^data:/)
  })

  it('captures range prices verbatim for the normalizer to resolve', () => {
    expect(products[1].priceText).toBe('2,900 FCFA - 4,820 FCFA')
  })
})

describe('parseMaxPage', () => {
  it('reads the highest page number from pagination links', () => {
    expect(parseMaxPage(fixture)).toBe(26)
  })

  it('defaults to 1 when there is no pagination', () => {
    expect(parseMaxPage('<html><body>no pager</body></html>')).toBe(1)
  })
})
