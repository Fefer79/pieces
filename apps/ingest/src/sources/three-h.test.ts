import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'

const HERE = dirname(fileURLToPath(import.meta.url))
const FIXTURE_HTML = await readFile(resolve(HERE, '__fixtures__/3h-product.html'), 'utf8')

vi.mock('../lib/http.ts', () => ({
  fetchText: vi.fn(async (url: string) => {
    if (url.includes('produit')) return FIXTURE_HTML
    if (url.includes('sitemap_index')) {
      return `<?xml version="1.0"?>
<sitemapindex>
  <sitemap><loc>https://3hautoparts.com/product-sitemap1.xml</loc></sitemap>
  <sitemap><loc>https://3hautoparts.com/page-sitemap.xml</loc></sitemap>
</sitemapindex>`
    }
    if (url.includes('product-sitemap')) {
      return `<?xml version="1.0"?>
<urlset>
  <url><loc>https://3hautoparts.com/produits/</loc></url>
  <url><loc>https://3hautoparts.com/produit/bougie-dallumage-bosch-fgr7dqp/</loc></url>
  <url><loc>https://3hautoparts.com/produit/anti-bruit-freins-bardahl-500ml/</loc></url>
</urlset>`
    }
    return ''
  }),
}))

const { fetchProductUrls, fetchProduct } = await import('./three-h.ts')

describe('three-h source', () => {
  it('extrait uniquement les URLs de fiches produit (filtre /produits/)', async () => {
    const urls = await fetchProductUrls()
    expect(urls).toHaveLength(2)
    expect(urls.every((u) => /\/produit\/[^/]+\/?$/.test(u))).toBe(true)
  })

  it('parse le JSON-LD Product depuis une fiche', async () => {
    const product = await fetchProduct('https://3hautoparts.com/produit/bougie-dallumage-bosch-fgr7dqp/')
    expect(product).not.toBeNull()
    expect(product?.['@type']).toBe('Product')
    expect(product?.offers?.price).toBe('7650')
    expect(product?.offers?.priceCurrency).toBe('XOF')
    expect(product?.sourceUrl).toContain('bougie-dallumage-bosch')
  })

  it('décode les entités HTML dans name (apostrophe)', async () => {
    const product = await fetchProduct('https://3hautoparts.com/produit/bougie-dallumage-bosch-fgr7dqp/')
    expect(product?.name).not.toContain('&#039;')
    expect(product?.name).toContain("'")
  })
})
