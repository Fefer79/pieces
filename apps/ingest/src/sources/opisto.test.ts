import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  parseListingHtml,
  nextPageUrl,
  listingUrl,
  extractPriceEur,
  extractOemFromImageUrl,
  extractCasseCountry,
} from './opisto.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const fixture = readFileSync(resolve(HERE, '__fixtures__/opisto-listing.html'), 'utf8')

describe('parseListingHtml', () => {
  const parts = parseListingHtml(fixture)

  it('parses every card', () => {
    expect(parts).toHaveLength(2)
  })

  it('extracts the full card of a French breaker', () => {
    const p = parts[0]
    expect(p?.productId).toBe('88962594')
    expect(p?.partName).toBe('Alternateur')
    expect(p?.brand).toBe('PEUGEOT')
    expect(p?.priceEur).toBe(28)
    expect(p?.url).toBe(
      'https://www.opisto.fr/fr/auto/fiche-produit/88962594/alternateur-peugeot-208-1-2020',
    )
    expect(p?.casseId).toBe('4759')
    expect(p?.casseCountry).toBe('FR')
    expect(p?.warrantyMonths).toBe(12)
    expect(p?.oemReference).toBe('9820893880')
  })

  it('separates the vehicle label from the part name', () => {
    expect(parts[0]?.vehicleLabel).toBe('PEUGEOT 208 1 PHASE 2 1.5 BLUE HDI - 16V TURBO Diesel 1499 cm3')
  })

  // Régression : le libellé véhicule contient des parenthèses (« 206 Hatchback
  // (2A/C) »), qui faisaient échouer l'extraction du prix et perdaient la carte.
  it('parses a price even when the vehicle label contains parentheses', () => {
    const es = parts[1]
    expect(es?.productId).toBe('104926922')
    expect(es?.vehicleLabel).toContain('(2A/C)')
    expect(es?.priceEur).toBe(15.33)
  })

  // Toutes les casses d'Opisto ne sont pas françaises : le pays commande le fret
  // et le régime douanier, il ne doit jamais être supposé.
  it('detects a non-French breaker country', () => {
    expect(parts[1]?.casseCountry).toBe('ES')
  })
})

describe('nextPageUrl', () => {
  it('follows rel="next"', () => {
    expect(nextPageUrl(fixture)).toBe(
      'https://www.opisto.fr/fr/auto/pieces-occasion/alternateur/peugeot/page-2',
    )
  })

  it('returns null at the end of pagination', () => {
    expect(nextPageUrl('<html><head></head><body></body></html>')).toBeNull()
  })
})

describe('streamListings — garde-fou de pagination', () => {
  // Opisto renvoie TOUJOURS `rel="next"` -> page-2, et une page au-dela du stock
  // repond 200 avec le contenu de la derniere page utile. Suivre la balise faisait
  // boucler sur la page 2 : un premier run y a perdu un tiers du gisement, sans
  // aucune erreur dans les logs puisque chaque reponse etait un 200 valide.
  it('stops instead of looping when the site replays the same page', async () => {
    const fetched: string[] = []
    vi.doMock('../lib/http.ts', () => ({
      fetchText: async (url: string) => {
        fetched.push(url)
        return fixture // toujours la meme page, comme le site au-dela du stock
      },
    }))
    const { streamListings: stream } = await import('./opisto.ts?replay')

    const pages = []
    for await (const page of stream({
      categories: ['alternateur'],
      brands: ['peugeot'],
      maxPagesPerCombo: 5,
    })) {
      pages.push(page)
    }

    // Une seule emission : la page 2 ne contient plus rien d'inedit.
    expect(pages).toHaveLength(1)
    expect(pages[0]?.parts).toHaveLength(2)
    // Et on s'arrete au 2e fetch, sans consommer les 5 pages autorisees.
    expect(fetched).toHaveLength(2)
    // La pagination incremente le chemin, elle ne suit pas rel="next".
    expect(fetched[0]).toMatch(/page-1$/)
    expect(fetched[1]).toMatch(/page-2$/)
    vi.doUnmock('../lib/http.ts')
  })
})

describe('listingUrl', () => {
  // robots.txt interdit les URL à facettes (`?q=`, `?p=`, `sortBy`…) : la
  // pagination doit rester dans le chemin.
  it('builds a canonical URL with no query string', () => {
    const url = listingUrl('alternateur', 'toyota', 3)
    expect(url).toBe('https://www.opisto.fr/fr/auto/pieces-occasion/alternateur/toyota/page-3')
    expect(url).not.toContain('?')
  })

  it('clamps page numbers below 1', () => {
    expect(listingUrl('turbo', 'kia', 0)).toMatch(/page-1$/)
  })
})

describe('extractPriceEur', () => {
  it('reads the normalized decimal, not the displayed text', () => {
    expect(extractPriceEur("loadModalAddToCart(1, 'KIA', 'Turbo', 'KIA CEED 1.6', '128.50');")).toBe(128.5)
  })

  it('returns null without a cart call', () => {
    expect(extractPriceEur(undefined)).toBeNull()
    expect(extractPriceEur('redirectToProductPage(1);')).toBeNull()
  })
})

describe('extractOemFromImageUrl', () => {
  it('reads the OEM reference from the photo file name', () => {
    expect(
      extractOemFromImageUrl('https://cdn.opisto.fr/x/88962594-uuid-Piece-88962594-Alternateur-9820893880-PEUGEOT-208-1_s.JPG'),
    ).toBe('9820893880')
  })

  it('tolerates a photo name without reference', () => {
    expect(extractOemFromImageUrl('https://cdn.opisto.fr/x/104926922-6_ALTERNADOR_s.JPG')).toBeNull()
    expect(extractOemFromImageUrl(null)).toBeNull()
  })
})

describe('extractCasseCountry', () => {
  it('maps the country suffix to an ISO code', () => {
    expect(extractCasseCountry("JAQU'AUTO - FRANCE")).toBe('FR')
    expect(extractCasseCountry('DESGUACES GP - ESPAGNE')).toBe('ES')
  })

  it('returns null on an unknown or absent suffix', () => {
    expect(extractCasseCountry('CASSE SANS PAYS')).toBeNull()
    expect(extractCasseCountry(null)).toBeNull()
  })
})
