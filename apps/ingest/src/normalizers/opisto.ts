import { EUR_XOF_PARITY, VEHICLE_BRANDS, getEngines } from 'shared/constants'
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
  /** Motorisation, obligatoire : un fitment sans elle n'est pas émis. */
  engine: string
  yearFrom: number
  yearTo: number
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

  // Le libellé de listing porte souvent la motorisation (« 1.5 BLUE HDI … 1499 cm3 »).
  const engine = model && year ? resolveEngine(getEngines(brand, model, year), raw.vehicleLabel) : null

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
    // Un fitment Opisto n'existe QU'AVEC année et motorisation : sans l'une des
    // deux, le filtre de compatibilité ne peut rien en faire, et une
    // compatibilité approximative sur une pièce d'occasion vend la mauvaise
    // pièce. L'enrichissement par fiche produit (enrich:opisto) rattrape ensuite
    // ce que le listing ne donne pas.
    //
    // Une pièce d'occasion vient d'UN véhicule donneur précis : on n'élargit pas
    // la compatibilité à toute la génération.
    fitments:
      model && year && engine
        ? [{ brand, model, engine, yearFrom: year, yearTo: year }]
        : [],
  }
}

// ---------------------------------------------------------------------------
// Motorisation
// ---------------------------------------------------------------------------

/** Cylindrée en litres, depuis « 1.5 », « 1,5 » ou « 1499 cm3 ». */
export function parseDisplacement(label: string | null | undefined, cc?: number | null): string | null {
  const decimal = label ? /(\d)\s*[.,]\s*(\d)/.exec(label) : null
  if (decimal?.[1] && decimal[2]) return `${decimal[1]}.${decimal[2]}`
  const cubic = cc ?? (label ? Number.parseInt(/(\d{3,4})\s*cm/i.exec(label)?.[1] ?? '', 10) : NaN)
  if (Number.isFinite(cubic) && (cubic as number) >= 500) {
    return (Math.round((cubic as number) / 100) / 10).toFixed(1)
  }
  return null
}

/** Mots techniques distinctifs d'une motorisation (HDI, VTI, DDIS, VVT-i…). */
function engineKeywords(label: string): Set<string> {
  return new Set(
    label
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 2 && !/^\d+$/.test(w) && !['CV', 'CM3', 'V', 'DE'].includes(w)),
  )
}

/**
 * Segment moteur d'un libellé véhicule.
 *
 * « PEUGEOT 208 1 PHASE 2 1.5 BLUE HDI - 16V TURBO Diesel 1499 cm3 » se réduit à
 * « 1.5 BLUE HDI - 16V TURBO ». Sans cette coupe, le repli stockerait la marque,
 * le modèle et la phase dans le champ motorisation — un fitment formellement
 * rempli mais faux.
 */
function engineSegment(label: string | null | undefined, displacement: string | null): string | null {
  if (!label) return null
  const at = /\d\s*[.,]\s*\d/.exec(label)?.index
  const body = at != null ? label.slice(at) : displacement ? `${displacement} ${label}` : null
  if (!body) return null
  return (
    body
      // Cylindrée en cm3 et carburant final n'apportent rien au rapprochement.
      .replace(/\d{3,4}\s*cm\s*3?/i, '')
      .replace(/\b(essence|diesel|hybride|[ée]lectrique)\b/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[\s-]+$/, '')
      .trim() || null
  )
}

/**
 * Rapproche la motorisation Opisto du libellé du référentiel Pièces.
 *
 * Indispensable : le filtre de compatibilité raisonne sur le vocabulaire du
 * référentiel (« 1.6 e-HDi »), pas sur celui d'Opisto (« 1.6 E HDI - 16V TURBO »).
 * Stocker le libellé brut donnerait un fitment présent mais muet pour la recherche.
 *
 * On apparie d'abord sur la cylindrée — c'est le discriminant le plus sûr — puis
 * sur le recouvrement des mots techniques. Sans correspondance, on renvoie le
 * libellé Opisto nettoyé : mieux vaut une motorisation approximative qu'aucune.
 */
export function resolveEngine(
  candidates: readonly string[],
  opistoLabel: string | null | undefined,
  cc?: number | null,
): string | null {
  const displacement = parseDisplacement(opistoLabel, cc)
  const cleaned = engineSegment(opistoLabel, displacement)
  if (candidates.length === 0) return cleaned

  const sameDisplacement = displacement
    ? candidates.filter((c) => parseDisplacement(c) === displacement)
    : []
  const pool = sameDisplacement.length > 0 ? sameDisplacement : []
  if (pool.length === 0) return cleaned

  if (!cleaned) return pool[0] ?? null
  const wanted = engineKeywords(cleaned)
  let best = pool[0] as string
  let bestScore = -1
  for (const candidate of pool) {
    const score = [...engineKeywords(candidate)].filter((w) => wanted.has(w)).length
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}
