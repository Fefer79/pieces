import { fetchJson } from '../lib/http.ts'

export const EXTERNAL_SOURCE = 'BCG_PIECEAUTO_CI'

const STORE_API = 'https://bcg-pieceauto.com/wp-json/wc/store/v1/products'
const PER_PAGE = 100

/** Sous-ensemble des champs WooCommerce Store API que l'on consomme. */
export type BcgProductRaw = {
  id: number
  name: string
  slug: string
  permalink: string
  sku: string
  short_description: string
  description: string
  prices: {
    price: string
    regular_price: string
    sale_price: string
    currency_minor_unit: number
  }
  images: Array<{ src?: string; thumbnail?: string }>
  categories: Array<{ id: number; name: string; slug: string }>
  tags: Array<{ id: number; name: string; slug: string }>
  brands: Array<{ id: number; name: string; slug: string }>
  is_in_stock: boolean
  stock_availability: { text: string; class: string }
}

function buildUrl(page: number): string {
  return `${STORE_API}?per_page=${PER_PAGE}&page=${page}&orderby=id&order=asc`
}

/**
 * Pagine l'API Store WooCommerce jusqu'à épuisement.
 * On s'arrête dès qu'une page renvoie moins de PER_PAGE éléments (dernière page).
 */
export async function* streamAllProducts(
  opts: { maxPages?: number } = {},
): AsyncGenerator<{ page: number; products: BcgProductRaw[] }> {
  for (let page = 1; ; page += 1) {
    if (opts.maxPages && page > opts.maxPages) break
    const products = await fetchJson<BcgProductRaw[]>(buildUrl(page))
    yield { page, products }
    if (products.length < PER_PAGE) break
  }
}
