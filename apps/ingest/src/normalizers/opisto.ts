import { EUR_XOF_PARITY, VEHICLE_BRANDS } from 'shared/constants'
import type { OpistoPartRaw } from '../sources/opisto.ts'
import { brandForSlug, categoryLabelForSlug } from '../data/opisto-targets.ts'

export const EXTERNAL_SOURCE_SLUG = 'OPISTO_FR'

/**
 * Marge appliquée au coût d'achat pour obtenir le prix public.
 * Défaut du schéma (`CatalogItem.importMarginPct`), repris ici pour que le
 * `price` écrit à l'ingestion soit cohérent avec ce que recalcule l'API.
 * ⚠ Le fret et la douane NE SONT PAS dedans : ils sont chiffrés à la commande
 * par `computeImportQuote()` et affichés en lignes distinctes (DESIGN.md).
 */
export const IMPORT_MARGIN_PCT = 100

/** Pays par défaut quand Opisto n'affiche pas le pays de la casse. */
const DEFAULT_ORIGIN_COUNTRY = 'FR'

export type OpistoFitment = {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
}

export type OpistoNormalized = {
  externalSource: string
  externalSourceId: string
  externalSourceUrl: string
  /** Identité de la casse — clé de dédup vendeur, jamais affichée au client. */
  casseId: string | null
  name: string
  category: string
  oemReference: string | null
  vehicleCompatibility: string
  sourceCostAmount: number
  sourceCostCurrency: string
  sourceCostFcfa: number
  importMarginPct: number
  price: number
  originCountry: string
  warrantyValue: number | null
  warrantyUnit: 'MONTH' | null
  imageOriginalUrl: string | null
  fitments: OpistoFitment[]
}

/**
 * Repli d'affichage quand le référentiel ne connaît pas le modèle : on remet une
 * capitale par mot, sinon le nom de l'annonce sort en « Alternateur TOYOTA mr2 ».
 */
const deslugify = (slug: string): string =>
  slug
    .split('-')
    .filter(Boolean)
    // Un token mêlant lettres et chiffres est un code de modèle (« mr2 », « c4 »,
    // « a3 ») : il se met en capitales. Un mot ordinaire garde sa seule initiale.
    .map((w) => (/\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
    .trim()

/** Clé de comparaison laxiste : « Classe C » ≈ « classe-c » ≈ « CLASSEC ». */
const modelKey = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

/**
 * Modèle canonique du référentiel Pièces à partir du slug Opisto.
 *
 * Opisto suffixe la génération (`208-1` = 208 phase 1, `308-2`), là où le
 * référentiel ne connaît que « 208 » et « 308 ». On tente donc le slug tel quel,
 * puis sans son suffixe de génération — mais UNIQUEMENT si le référentiel
 * confirme : sinon « serie-3 » deviendrait « serie ». Sans correspondance, on
 * renvoie le libellé dé-sluggifié, qui vaut mieux que rien pour la recherche.
 */
export function resolveModel(brand: string, modelSlug: string): string | null {
  if (!modelSlug) return null
  const models = VEHICLE_BRANDS[brand.toUpperCase()]?.models
  const candidates = [modelSlug, modelSlug.replace(/-\d$/, '')].filter(Boolean)
  if (models) {
    const names = Object.keys(models)
    for (const candidate of candidates) {
      const hit = names.find((n) => modelKey(n) === modelKey(candidate))
      if (hit) return hit
    }
  }
  return deslugify(candidates[0] ?? modelSlug)
}

/**
 * Modèle et année du véhicule donneur, lus dans le slug de la fiche produit —
 * `…/fiche-produit/88962594/alternateur-peugeot-208-1-2020`. Ce slug est propre
 * (minuscules, sans motorisation), là où le libellé affiché mêle phase,
 * cylindrée et carburant.
 */
export function parseDetailSlug(
  url: string,
  brandSlug: string,
): { modelSlug: string; year: number | null } {
  const slug = url.split('/').pop() ?? ''
  const marker = `-${brandSlug}-`
  const at = slug.indexOf(marker)
  let rest = at >= 0 ? slug.slice(at + marker.length) : ''
  const yearMatch = /-(\d{4})$/.exec(rest) ?? /^(\d{4})$/.exec(rest)
  let year: number | null = null
  if (yearMatch?.[1]) {
    const parsed = Number.parseInt(yearMatch[1], 10)
    // Garde-fou : un modèle peut finir par 4 chiffres (« 2008 », « 3008 »).
    // On ne retient l'année que si elle est plausible ET qu'il reste un modèle.
    const stripped = rest.slice(0, rest.length - yearMatch[0].length)
    if (parsed >= 1950 && parsed <= new Date().getFullYear() + 1 && stripped.length > 0) {
      year = parsed
      rest = stripped
    }
  }
  return { modelSlug: rest, year }
}

const roundTo100 = (n: number): number => Math.round(n / 100) * 100

/**
 * Annonce Opisto → ligne de catalogue « Occasion à importer ».
 *
 * Renvoie `null` si la pièce n'est pas exploitable (prix absent, marque hors
 * cible). Le coût d'achat réel est conservé en clair dans `sourceCost*` : c'est
 * la valeur en douane, elle ne sort jamais vers le client.
 */
export function normalizeOpistoPart(
  raw: OpistoPartRaw,
  ctx: { brandSlug: string; categorySlug: string },
): OpistoNormalized | null {
  if (!(raw.priceEur > 0)) return null
  const target = brandForSlug(ctx.brandSlug)
  const brand = target?.brand ?? raw.brand.toUpperCase()
  if (!brand) return null

  const { modelSlug, year } = parseDetailSlug(raw.url, ctx.brandSlug)
  const model = resolveModel(brand, modelSlug)

  const sourceCostFcfa = Math.round(raw.priceEur * EUR_XOF_PARITY)
  const price = roundTo100(sourceCostFcfa * (1 + IMPORT_MARGIN_PCT / 100))
  const category = categoryLabelForSlug(ctx.categorySlug)

  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: raw.productId,
    externalSourceUrl: raw.url,
    casseId: raw.casseId,
    name: [category, brand, model].filter(Boolean).join(' '),
    category,
    oemReference: raw.oemReference,
    vehicleCompatibility: raw.vehicleLabel,
    sourceCostAmount: raw.priceEur,
    sourceCostCurrency: 'EUR',
    sourceCostFcfa,
    importMarginPct: IMPORT_MARGIN_PCT,
    price,
    originCountry: raw.casseCountry ?? DEFAULT_ORIGIN_COUNTRY,
    warrantyValue: raw.warrantyMonths,
    warrantyUnit: raw.warrantyMonths ? 'MONTH' : null,
    imageOriginalUrl: raw.imageUrl,
    // Une pièce d'occasion vient d'UN véhicule donneur précis : on n'élargit pas
    // la compatibilité à toute la génération. Sous-couvrir se corrige par la
    // référence OEM ; sur-couvrir vend la mauvaise pièce, et c'est un litige.
    fitments: model ? [{ brand, model, yearFrom: year, yearTo: year }] : [],
  }
}
