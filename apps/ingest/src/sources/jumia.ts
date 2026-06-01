import * as cheerio from 'cheerio'
import { fetchText } from '../lib/http.ts'

/**
 * Jumia CI — marketplace pièces auto. Le scraping est explicitement autorisé par
 * leur robots.txt sous conditions : UA de bot identifié (URL/contact) et < 200 RPM.
 * Notre lib http tourne à 1 req / INGEST_RATE_LIMIT_MS (2s par défaut = 30 RPM).
 */
export const EXTERNAL_SOURCE = 'JUMIA_CI'

const ORIGIN = 'https://www.jumia.ci'
const CATEGORY_PATH = 'voiture-pieces-rechange'
const UA = 'pieces-ci-ingest/0.1 (+https://pieces.ci; contact: techops@pieces.ci)'

export type JumiaProductRaw = {
  /** SKU interne Jumia (data-ga4-item_id), ex. "GE070VP1K8ZGXNAFAMZ". */
  sku: string | null
  /** Identifiant numérique stable extrait de l'URL `…-<id>.html`. */
  productId: string
  name: string
  url: string
  brand: string | null
  category: string | null
  /** Prix brut affiché, ex. "23,750 FCFA" ou "2,900 FCFA - 4,820 FCFA". */
  priceText: string | null
  imageUrl: string | null
}

/** Catégorie GA4 la plus profonde renseignée sur la carte (item_category6 → 2). */
function deepestGa4Category(wishlist: cheerio.Cheerio<never>): string | null {
  for (let level = 6; level >= 2; level -= 1) {
    const v = wishlist.attr(`data-ga4-item_category${level}`)?.trim()
    if (v) return v
  }
  return null
}

/**
 * Parse une page catégorie Jumia en liste de produits. Pur (testable hors réseau).
 * Chaque produit est une carte `<article class="prd …">` : l'ancre wishlist porte
 * les data-* (sku, marque, catégorie, image), l'ancre `.core` porte l'URL produit.
 */
export function parseCategoryHtml(html: string): JumiaProductRaw[] {
  const $ = cheerio.load(html)
  const out: JumiaProductRaw[] = []
  $('article.prd').each((_, el) => {
    const art = $(el)
    const wishlist = art.find('a[data-ga4-item_id]').first() as cheerio.Cheerio<never>
    const core = art.find('a.core').first()
    const href = (core.attr('href') ?? wishlist.attr('href') ?? '').trim()
    if (!href) return
    const productId = href.match(/-(\d+)\.html/)?.[1] ?? ''
    if (!productId) return
    const name = (art.find('h3.name').first().text() || wishlist.attr('data-ga4-item_name') || '').trim()
    if (!name) return
    const priceText = (art.find('.prc').first().text() || '').replace(/\u00a0/g, ' ').trim() || null
    const imageUrl =
      art.find('img.img').first().attr('data-src') ||
      art.find('img.img').first().attr('src') ||
      wishlist.attr('data-moengage-product_image') ||
      null
    out.push({
      sku: wishlist.attr('data-ga4-item_id') || wishlist.attr('data-sku') || null,
      productId,
      name,
      url: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      brand: wishlist.attr('data-ga4-item_brand')?.trim() || null,
      category: wishlist.attr('data-moengage-category_name')?.trim() || deepestGa4Category(wishlist),
      priceText,
      imageUrl: imageUrl && imageUrl.startsWith('data:') ? null : imageUrl,
    })
  })
  return out
}

/** Plus grand numéro de page référencé dans la pagination (1 si absente). */
export function parseMaxPage(html: string): number {
  const $ = cheerio.load(html)
  let max = 1
  $('a[href*="page="]').each((_, el) => {
    const m = ($(el).attr('href') ?? '').match(/[?&]page=(\d+)/)
    if (m?.[1]) max = Math.max(max, Number.parseInt(m[1], 10))
  })
  return max
}

function categoryUrl(page: number): string {
  return page <= 1 ? `${ORIGIN}/${CATEGORY_PATH}/` : `${ORIGIN}/${CATEGORY_PATH}/?page=${page}`
}

export async function fetchCategoryPage(page: number): Promise<string> {
  return fetchText(categoryUrl(page), { headers: { 'user-agent': UA } })
}

/**
 * Stream toutes les pages catégorie. Détecte le nombre total de pages sur la 1ʳᵉ,
 * puis itère ; s'arrête si une page ne renvoie aucun produit (garde-fou).
 */
export async function* streamAllProducts(
  opts: { maxPages?: number } = {},
): AsyncGenerator<{ page: number; totalPages: number; products: JumiaProductRaw[] }> {
  const firstHtml = await fetchCategoryPage(1)
  let totalPages = parseMaxPage(firstHtml)
  if (opts.maxPages) totalPages = Math.min(totalPages, opts.maxPages)
  yield { page: 1, totalPages, products: parseCategoryHtml(firstHtml) }
  for (let page = 2; page <= totalPages; page += 1) {
    const html = await fetchCategoryPage(page)
    const products = parseCategoryHtml(html)
    yield { page, totalPages, products }
    if (products.length === 0) break
  }
}
