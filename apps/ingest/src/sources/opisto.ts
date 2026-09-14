import * as cheerio from 'cheerio'
import { fetchText } from '../lib/http.ts'

/**
 * Opisto.fr — réseau de casses agréées françaises (VHU), pièces d'occasion.
 *
 * ⚠ CONFORMITÉ. `robots.txt` autorise les pages de listing canoniques
 * (`/fr/auto/pieces-occasion/{categorie}/{marque}/page-N`) mais interdit
 * explicitement les URL à facettes : `?q=`, `?p=`, `*sortBy`, `*refinementList`,
 * `*&results*`, `*&view*`. On ne construit donc JAMAIS d'URL avec paramètres de
 * requête — la pagination passe par le segment `/page-N`, et l'arborescence par
 * les sitemaps. Ne pas « optimiser » en tapant la recherche interne.
 *
 * Le prix fiable est le DERNIER argument de `loadModalAddToCart(...)` : un
 * décimal déjà normalisé ("28.00"), là où le texte affiché porte une virgule,
 * une espace insécable, un « € » et un astérisque de renvoi. Les blocs de prix
 * sont en outre dupliqués (variante mobile + desktop) dans chaque carte.
 */
export const EXTERNAL_SOURCE = 'OPISTO_FR'

const ORIGIN = 'https://www.opisto.fr'

export type OpistoPartRaw = {
  /** `data-product-id` — identifiant stable de l'annonce. */
  productId: string
  /** Libellé de la pièce, ex. « Alternateur ». */
  partName: string
  /** Marque telle qu'Opisto la nomme, ex. « PEUGEOT ». */
  brand: string
  /** Véhicule en toutes lettres, ex. « PEUGEOT 208 1 PHASE 2 1.5 BLUE HDI - 16V TURBO Diesel ». */
  vehicleLabel: string
  /** Prix en euros, déjà normalisé par la source. */
  priceEur: number
  /** URL absolue de la fiche produit. */
  url: string
  imageUrl: string | null
  /** Identifiant de la casse vendeuse — clé de dédup INTERNE, jamais affichée. */
  casseId: string | null
  /**
   * Code pays de la casse (`FR`, `ES`…). Toutes les casses d'Opisto ne sont pas
   * françaises : le pays commande le fret et le régime douanier, on ne le
   * suppose donc jamais.
   */
  casseCountry: string | null
  /** Durée de garantie annoncée, en mois. */
  warrantyMonths: number | null
  /** Référence OEM, quand l'URL de la photo la porte. */
  oemReference: string | null
}

const clean = (s: string): string => s.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()

/** Pays affichés par Opisto en suffixe du nom de casse (« … - ESPAGNE »). */
const COUNTRY_BY_LABEL: Record<string, string> = {
  FRANCE: 'FR',
  ESPAGNE: 'ES',
  ALLEMAGNE: 'DE',
  ITALIE: 'IT',
  BELGIQUE: 'BE',
  PORTUGAL: 'PT',
  'PAYS-BAS': 'NL',
}

/** Code ISO du pays depuis le libellé vendeur « DESGUACES GP - ESPAGNE ». */
export function extractCasseCountry(sellerLabel: string | null | undefined): string | null {
  if (!sellerLabel) return null
  const suffix = sellerLabel.split('-').pop()?.trim().toUpperCase() ?? ''
  return COUNTRY_BY_LABEL[suffix] ?? null
}

/**
 * Référence OEM encodée dans le nom du fichier photo, entre le libellé de la
 * pièce et la marque : `…-Piece-88962594-Alternateur-9820893880-PEUGEOT-208-…`.
 * Absente des cartes dont l'image est en lazy-load — d'où le `null` toléré.
 */
export function extractOemFromImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  const m = /-Piece-\d+-[A-Za-z0-9%.-]*?-([A-Z0-9]{6,})-[A-Z]/.exec(imageUrl)
  return m?.[1] ?? null
}

/** Prix en euros depuis l'appel `loadModalAddToCart(id, marque, piece, vehicule, '28.00')`. */
export function extractPriceEur(onclick: string | undefined): number | null {
  if (!onclick) return null
  // `.*` gourmand volontairement : le libellé véhicule contient des parenthèses
  // (« 206 Hatchback (2A/C) »), donc on ne peut pas borner sur le premier « ) ».
  const m = /loadModalAddToCart\(.*,\s*'([\d.]+)'\s*\)/.exec(onclick)
  if (!m?.[1]) return null
  const v = Number.parseFloat(m[1])
  return Number.isFinite(v) && v > 0 ? v : null
}

/** Parse une page de listing en annonces. Pur : testable hors réseau. */
export function parseListingHtml(html: string): OpistoPartRaw[] {
  const $ = cheerio.load(html)
  const out: OpistoPartRaw[] = []

  $('[data-product-id]').each((_, el) => {
    const card = $(el)
    const productId = (card.attr('data-product-id') ?? '').trim()
    // `0` est un gabarit inerte présent dans le DOM (carte fantôme de rendu).
    if (!productId || productId === '0') return

    const link = card.find('a[href*="/fiche-produit/"]').first()
    const href = (link.attr('href') ?? '').trim()
    if (!href) return

    const partName = clean(link.find('span').first().text())
    if (!partName) return

    // Le libellé véhicule est le texte de l'ancre moins le nom de la pièce.
    const vehicleLabel = clean(clean(link.text()).replace(partName, ''))

    const priceEur =
      extractPriceEur(card.find('button[onclick*="loadModalAddToCart"]').first().attr('onclick')) ??
      extractPriceEur(card.attr('onclick'))
    if (priceEur == null) return

    const brandFromCart = /loadModalAddToCart\(\s*\d+\s*,\s*'([^']*)'/.exec(
      card.find('button[onclick*="loadModalAddToCart"]').first().attr('onclick') ?? '',
    )?.[1]

    const imageUrl = card.find('img').first().attr('src')?.trim() || null
    const casseLink = card.find('a[href*="/casses-automobile/details/"]').first()
    const casseHref = casseLink.attr('href') ?? ''
    const casseId = /\/casses-automobile\/details\/(\d+)/.exec(casseHref)?.[1] ?? null
    const casseCountry = extractCasseCountry(clean(casseLink.text()))

    const warrantyMonths = (() => {
      const m = /Garantie\s*:\s*(\d+)\s*mois/i.exec(clean(card.text()))
      return m?.[1] ? Number.parseInt(m[1], 10) : null
    })()

    out.push({
      productId,
      partName,
      brand: clean(brandFromCart ?? vehicleLabel.split(' ')[0] ?? ''),
      vehicleLabel,
      priceEur,
      url: href.startsWith('http') ? href : `${ORIGIN}${href}`,
      imageUrl,
      casseId,
      casseCountry,
      warrantyMonths,
      oemReference: extractOemFromImageUrl(imageUrl),
    })
  })

  return out
}

/** URL canonique d'un listing catégorie × marque. Sans paramètre de requête (cf. robots.txt). */
export function listingUrl(categorySlug: string, brandSlug: string, page: number): string {
  return `${ORIGIN}/fr/auto/pieces-occasion/${categorySlug}/${brandSlug}/page-${Math.max(1, page)}`
}

/** Page suivante déclarée par `<link rel="next">`, ou null en fin de pagination. */
export function nextPageUrl(html: string): string | null {
  const $ = cheerio.load(html)
  const href = $('link[rel="next"]').first().attr('href')?.trim()
  return href ? (href.startsWith('http') ? href : `${ORIGIN}${href}`) : null
}

export type OpistoListingPage = {
  categorySlug: string
  brandSlug: string
  page: number
  parts: OpistoPartRaw[]
}

/**
 * Parcourt les listings catégorie × marque, en suivant `rel="next"`.
 * Le rate-limit est porté par `fetchText` (file d'attente globale du process).
 */
export async function* streamListings(opts: {
  categories: readonly string[]
  brands: readonly string[]
  maxPagesPerCombo?: number
}): AsyncGenerator<OpistoListingPage> {
  const maxPages = opts.maxPagesPerCombo ?? 5
  for (const brandSlug of opts.brands) {
    for (const categorySlug of opts.categories) {
      let url = listingUrl(categorySlug, brandSlug, 1)
      for (let page = 1; page <= maxPages; page += 1) {
        let html: string
        try {
          html = await fetchText(url)
        } catch (err) {
          // Un couple catégorie × marque sans stock renvoie 404 : ce n'est pas
          // une anomalie, on passe au suivant sans bruit.
          console.warn(
            `[opisto] ${categorySlug}/${brandSlug} page ${page} ignorée:`,
            err instanceof Error ? err.message : err,
          )
          break
        }
        const parts = parseListingHtml(html)
        if (parts.length > 0) yield { categorySlug, brandSlug, page, parts }
        const next = nextPageUrl(html)
        if (!next) break
        url = next
      }
    }
  }
}
