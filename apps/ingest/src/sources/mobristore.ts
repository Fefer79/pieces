import * as cheerio from 'cheerio'
import { fetchText } from '../lib/http.ts'

/**
 * MobriStore CI — boutique de pièces auto (Laravel custom, pas d'API).
 * On scrape la page catalogue `mobristore-piece-de-voiture` paginée via `?page=N`.
 * Chaque carte `.category-grid-box` expose nom, prix (texte « 110 000 F »),
 * marque (`<p>Marque : SUZUKI</p>`), image et un lien détail finissant par un id
 * numérique stable (…-303).
 */
export const EXTERNAL_SOURCE = 'MOBRISTORE_CI'

const ORIGIN = 'https://mobristore.com'
const CATALOG_PATH = 'mobristore-piece-de-voiture'
const UA = 'pieces-ci-ingest/0.1 (+https://pieces.ci; contact: techops@pieces.ci)'

export type MobristoreProductRaw = {
  postId: string
  name: string
  url: string
  brand: string | null
  city: string | null
  /** Texte brut du prix, ex. « 110 000 F ». */
  priceText: string | null
  imageUrl: string | null
}

/**
 * Parse une page catalogue en liste d'annonces. Pur (testable hors réseau).
 * Chaque produit est rendu deux fois (variante desktop `hidden-xs` + mobile) :
 * on fusionne par postId en complétant les champs manquants (image/marque/prix
 * absents sur l'une des variantes).
 */
export function parseCatalogHtml(html: string): MobristoreProductRaw[] {
  const $ = cheerio.load(html)
  const byId = new Map<string, MobristoreProductRaw>()
  $('.category-grid-box').each((_, el) => {
    const card = $(el)
    const link = card.find('a[href*="/detail-annonce-piece-auto/"]').first()
    const href = (link.attr('href') ?? '').trim()
    if (!href) return
    const postId = href.match(/-(\d+)(?:[/?#]|$)/)?.[1] ?? ''
    if (!postId) return
    const name = (card.find('h3 a').first().attr('title') || card.find('h3 a').first().text() || '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!name) return

    // Lignes « Label : valeur » du bloc .additional-information.
    const info: Record<string, string> = {}
    card.find('.additional-information p').each((_, p) => {
      const txt = $(p).text().replace(/\s+/g, ' ').trim()
      const idx = txt.indexOf(':')
      if (idx === -1) return
      const key = txt.slice(0, idx).trim().toLowerCase()
      const val = txt.slice(idx + 1).trim()
      if (val && val.toLowerCase() !== 'null') info[key] = val
    })

    const priceText =
      (card.find('.price').first().text() || '')
        .replace(/\u00a0/g, " ")
        .replace(/n[ée]gociable/gi, '')
        .replace(/\s+/g, ' ')
        .trim() || null

    const product: MobristoreProductRaw = {
      postId,
      name,
      url: href.startsWith('http') ? href : `${ORIGIN}/${href.replace(/^\//, '')}`,
      brand: info['marque'] ?? null,
      city: info['ville'] ?? null,
      priceText,
      imageUrl: card.find('img.max-hight-image').first().attr('src') || null,
    }
    const prev = byId.get(postId)
    if (!prev) {
      byId.set(postId, product)
    } else {
      // Fusionne : on garde la 1ʳᵉ valeur non vide pour chaque champ.
      prev.brand ??= product.brand
      prev.city ??= product.city
      prev.priceText ??= product.priceText
      prev.imageUrl ??= product.imageUrl
    }
  })
  return [...byId.values()]
}

function catalogUrl(page: number): string {
  return page <= 1 ? `${ORIGIN}/${CATALOG_PATH}` : `${ORIGIN}/${CATALOG_PATH}?page=${page}`
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export async function fetchCatalogPage(page: number, attempts = 3): Promise<string> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetchText(catalogUrl(page), { headers: { 'user-agent': UA } })
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await sleep(1000 * 2 ** i)
    }
  }
  throw lastErr
}

/**
 * Stream les pages catalogue. On déduplique par postId et on s'arrête dès qu'une
 * page n'apporte plus rien de neuf (la pagination réaffiche la dernière page
 * au-delà de la borne). `maxPages` est un garde-fou dur.
 */
export async function* streamAllProducts(
  opts: { maxPages?: number } = {},
): AsyncGenerator<{ page: number; products: MobristoreProductRaw[] }> {
  const seen = new Set<string>()
  const hardCap = opts.maxPages ?? 50
  for (let page = 1; page <= hardCap; page += 1) {
    let html: string
    try {
      html = await fetchCatalogPage(page)
    } catch (err) {
      console.warn(`[mobristore] page ${page} abandonnée:`, err instanceof Error ? err.message : err)
      break
    }
    const products = parseCatalogHtml(html)
    const fresh = products.filter((p) => !seen.has(p.postId))
    fresh.forEach((p) => seen.add(p.postId))
    yield { page, products: fresh }
    if (products.length === 0 || fresh.length === 0) break
  }
}
