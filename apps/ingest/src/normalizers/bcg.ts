import type { PartCondition, PartSource } from '@prisma/client'
import type { BcgProductRaw } from '../sources/bcg.ts'

export const EXTERNAL_SOURCE_SLUG = 'BCG_PIECEAUTO_CI'

export type BcgFitment = {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  engine: string | null
}

export type BcgNormalized = {
  externalSource: typeof EXTERNAL_SOURCE_SLUG
  externalSourceId: string
  externalSourceUrl: string
  name: string
  category: string | null
  partBrand: string | null
  oemReference: string | null
  price: number | null
  inStock: boolean
  condition: PartCondition
  partSource: PartSource
  imageOriginalUrl: string | null
  fitments: BcgFitment[]
}

/** Modèles connus du catalogue BCG — sert à isoler le modèle parmi catégories/tags. */
const KNOWN_MODELS = [
  'Alto', 'Baleno', 'Celerio', 'Ciaz', 'Dzire', 'Ertiga', 'Super Carry',
  'S-Presso', 'Swift', 'Belta', 'Starlet', 'Kwid',
]

/** Compare en ignorant tirets/espaces/casse : « Spresso » == « S-Presso ». */
function loose(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parsePrice(value: string | null | undefined): number | null {
  if (value == null) return null
  // currency_minor_unit = 0 → la chaîne "35000" est déjà en FCFA entiers.
  const n = Number.parseInt(value.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&#8217;|&#8216;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * "Référence OEM : ... numéro de pièce 41800M62S00." → "41800M62S00".
 * On cherche, après la mention « OEM », un vrai numéro de pièce : token en
 * majuscules contenant au moins un chiffre (rejette « Compatible », « 60000 »,
 * et les mots français en minuscule).
 */
/** Un numéro de pièce valide mêle lettres et chiffres (ex. 41800M62S00). */
function validOem(value: string | null | undefined): string | null {
  const v = value?.trim()
  if (!v || v.length < 5) return null
  return /[0-9]/.test(v) && /[A-Za-z]/.test(v) ? v : null
}

function extractOem(text: string): string | null {
  const oemIdx = text.search(/OEM/i)
  if (oemIdx === -1) return null
  const tail = text.slice(oemIdx, oemIdx + 200)
  for (const m of tail.matchAll(/\b([0-9A-Z][0-9A-Z]*-?[0-9A-Z]{2,})\b/g)) {
    const token = m[1]
    if (token && token.length >= 5 && /[0-9]/.test(token) && /[A-Z]/.test(token)) return token
  }
  return null
}

/** Récupère toutes les années 19xx/20xx d'un texte → borne basse/haute. */
function extractYears(text: string): { from: number | null; to: number | null } {
  const matches = text.match(/\b(19|20)\d{2}\b/g)
  if (!matches) return { from: null, to: null }
  const years = matches.map((y) => Number.parseInt(y, 10)).filter((y) => y >= 1990 && y <= 2035)
  if (years.length === 0) return { from: null, to: null }
  return { from: Math.min(...years), to: Math.max(...years) }
}

function pickModel(raw: BcgProductRaw, haystack: string): string | null {
  const candidates = [
    ...raw.tags.map((t) => t.name),
    ...raw.categories.map((c) => c.name),
  ].map(loose)
  const hay = loose(haystack)
  for (const known of KNOWN_MODELS) {
    const k = loose(known)
    if (candidates.includes(k) || hay.includes(k)) return known
  }
  return null
}

/** La catégorie « pièce » est la plus spécifique (slug suffixé du modèle, ex. carrosserie-vitres-spresso). */
function pickCategory(raw: BcgProductRaw): string | null {
  const modelSlugs = new Set(raw.categories.filter((c) => c.slug.split('-').length <= 2).map((c) => c.slug))
  const partCat = raw.categories.find((c) => !modelSlugs.has(c.slug)) ?? raw.categories[0]
  return partCat?.name ?? null
}

function pickPrimaryImage(images: BcgProductRaw['images']): string | null {
  const first = images?.[0]
  return first?.src ?? first?.thumbnail ?? null
}

export function normalizeBcgProduct(raw: BcgProductRaw): BcgNormalized | null {
  const name = raw.name?.trim()
  if (!name) return null

  const text = `${name} ${stripHtml(raw.short_description)} ${stripHtml(raw.description)}`
  const brand = raw.brands[0]?.name ?? null
  const model = pickModel(raw, text)
  const years = extractYears(text)

  const fitments: BcgFitment[] = brand
    ? [{ brand, model, yearFrom: years.from, yearTo: years.to, engine: null }]
    : []

  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: String(raw.id),
    externalSourceUrl: raw.permalink,
    name,
    category: pickCategory(raw),
    partBrand: brand,
    // Le SKU est parfois un prix saisi à tort (« 60000 ») — on ne le garde que
    // s'il a la forme d'un numéro de pièce (lettre + chiffre), sinon on l'extrait
    // de la description.
    oemReference: validOem(raw.sku) ?? extractOem(text),
    price: parsePrice(raw.prices?.price) ?? parsePrice(raw.prices?.regular_price),
    inStock: raw.is_in_stock ?? true,
    condition: 'NEW',
    // Pièces de rechange « direct fit » référencées OEM mais vendues sans marque équipementier.
    partSource: 'COMPATIBLE',
    imageOriginalUrl: pickPrimaryImage(raw.images),
    fitments,
  }
}
