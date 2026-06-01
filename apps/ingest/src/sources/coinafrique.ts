import * as cheerio from 'cheerio'
import { fetchText } from '../lib/http.ts'

/**
 * CoinAfrique CI — petites annonces. robots.txt autorise les pages catégorie
 * (bloque /?*, /search?*, /profil/*, …). On reste sous un rate-limit doux.
 *
 * ⚠ Le prix fiable est le TEXTE de `.ad__card-price` ("16 900 CFA" ou
 * "Prix sur demande"). L'attribut `data-ad-price` est trompeur (vaut p.ex. "25"
 * sur les annonces sans prix) → on ne s'en sert pas.
 */
export const EXTERNAL_SOURCE = 'COINAFRIQUE_CI'

const ORIGIN = 'https://ci.coinafrique.com'
const CATEGORY_PATH = 'categorie/accessoires-et-pieces-detachees'
const UA = 'pieces-ci-ingest/0.1 (+https://pieces.ci; contact: techops@pieces.ci)'

export type CoinAfriqueProductRaw = {
  postId: string
  name: string
  url: string
  category: string | null
  /** Texte brut du prix, ex. "16 900 CFA" ou "Prix sur demande". */
  priceText: string | null
  imageUrl: string | null
}

/** Parse une page catégorie en liste d'annonces. Pur (testable hors réseau). */
export function parseCategoryHtml(html: string): CoinAfriqueProductRaw[] {
  const $ = cheerio.load(html)
  const out: CoinAfriqueProductRaw[] = []
  $('.ad__card').each((_, el) => {
    const card = $(el)
    const href = (
      card.find('a.ad__card-image').first().attr('href') ??
      card.find('a[href*="/annonce/"]').first().attr('href') ??
      ''
    ).trim()
    if (!href) return
    const fav = card.find('[data-post-id]').first()
    const postId = (fav.attr('data-post-id') ?? href.match(/-(\d+)(?:[/?#]|$)/)?.[1] ?? '').trim()
    if (!postId) return
    const name = (fav.attr('data-ad-title') || card.find('.ad__card-description').first().text() || '').trim()
    if (!name) return
    const priceText =
      (card.find('.ad__card-price').first().text() || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim() || null
    out.push({
      postId,
      name,
      url: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      category: fav.attr('data-ad-category')?.trim() || null,
      priceText,
      imageUrl: card.find('img.ad__card-img').first().attr('src') || null,
    })
  })
  return out
}

function categoryUrl(page: number): string {
  return page <= 1 ? `${ORIGIN}/${CATEGORY_PATH}` : `${ORIGIN}/${CATEGORY_PATH}?page=${page}`
}

export async function fetchCategoryPage(page: number): Promise<string> {
  return fetchText(categoryUrl(page), { headers: { 'user-agent': UA } })
}

/**
 * Stream les pages catégorie jusqu'à épuisement. CoinAfrique ne donne pas de
 * compteur fiable de pages (pager fenêtré) et réaffiche la dernière page au-delà
 * de la borne : on déduplique par postId et on s'arrête dès qu'une page n'apporte
 * plus rien de neuf. `maxPages` sert de garde-fou dur.
 */
export async function* streamAllProducts(
  opts: { maxPages?: number } = {},
): AsyncGenerator<{ page: number; products: CoinAfriqueProductRaw[] }> {
  const seen = new Set<string>()
  const hardCap = opts.maxPages ?? 200
  for (let page = 1; page <= hardCap; page += 1) {
    const html = await fetchCategoryPage(page)
    const products = parseCategoryHtml(html)
    const fresh = products.filter((p) => !seen.has(p.postId))
    fresh.forEach((p) => seen.add(p.postId))
    yield { page, products: fresh }
    if (products.length === 0 || fresh.length === 0) break
  }
}
