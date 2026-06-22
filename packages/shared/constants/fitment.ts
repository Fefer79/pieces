/**
 * Parsing du texte de compatibilité véhicule legacy (`CatalogItem.vehicleCompatibility`)
 * vers des fitments structurés (`CatalogItemFitment`).
 *
 * Format typique rencontré : "Toyota Corolla 2010-2020", "Peugeot 308 2014-2021",
 * "Mercedes Sprinter 2014-2020", éventuellement une année simple ou un "présent".
 *
 * Réutilisé par : le backfill (apps/ingest), le seed (packages/shared/prisma) et
 * potentiellement l'API. Volontairement tolérant — retourne null si rien d'exploitable.
 */
import { BRAND_NAMES, VEHICLE_BRANDS } from './vehicles'

export interface ParsedFitment {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
}

const YEAR_RANGE = /\b(\d{4})\s*[-–—]\s*(\d{4})\b/
const YEAR_OPEN = /\b(\d{4})\s*[-–—]\s*(?:présent|present|aujourd'?hui|\.\.\.|auj\.?)\b/i
const YEAR_SINGLE = /\b(\d{4})\b/

// Marques connues, triées par longueur décroissante pour matcher « Land Rover »
// avant « Land », « Mercedes-Benz » avant « Mercedes », etc.
const SORTED_BRANDS = [...BRAND_NAMES].sort((a, b) => b.length - a.length)

function toYear(value: string | undefined): number | null {
  if (!value) return null
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) ? n : null
}

function extractYears(text: string): { yearFrom: number | null; yearTo: number | null; rest: string } {
  const range = text.match(YEAR_RANGE)
  if (range) {
    return {
      yearFrom: toYear(range[1]),
      yearTo: toYear(range[2]),
      rest: text.slice(0, range.index).trim(),
    }
  }
  const open = text.match(YEAR_OPEN)
  if (open) {
    return { yearFrom: toYear(open[1]), yearTo: null, rest: text.slice(0, open.index).trim() }
  }
  const single = text.match(YEAR_SINGLE)
  if (single) {
    return { yearFrom: toYear(single[1]), yearTo: null, rest: text.slice(0, single.index).trim() }
  }
  return { yearFrom: null, yearTo: null, rest: text.trim() }
}

/**
 * Parse une chaîne de compatibilité en un fitment structuré.
 * Retourne null si la chaîne est vide ou ne contient aucune marque/modèle exploitable.
 */
export function parseCompatibilityText(text: string | null | undefined): ParsedFitment | null {
  if (!text) return null
  const cleaned = text.trim()
  if (!cleaned) return null

  const { yearFrom, yearTo, rest } = extractYears(cleaned)
  const head = rest.replace(/[,;].*$/, '').trim() // garde le premier véhicule si liste
  if (!head) return null

  const lower = head.toLowerCase()
  // Match d'une marque connue en tête de chaîne. La liste ne sert qu'à détecter
  // la frontière marque/modèle ; on conserve la marque telle qu'écrite dans le
  // texte (et non la clé de la liste, en MAJUSCULES) pour ne pas réécrire la casse.
  for (const brand of SORTED_BRANDS) {
    const b = brand.toLowerCase()
    if (lower === b || lower.startsWith(`${b} `)) {
      const matchedBrand = head.slice(0, brand.length)
      const model = head.slice(brand.length).trim()
      return { brand: matchedBrand, model: model || null, yearFrom, yearTo }
    }
  }

  // Fallback : premier mot = marque, reste = modèle.
  const parts = head.split(/\s+/)
  if (parts.length === 0 || !parts[0]) return null
  const brand = parts[0]
  const model = parts.slice(1).join(' ').trim()
  return { brand, model: model || null, yearFrom, yearTo }
}

/* -------------------------------------------------------------------------- */
/* Extraction de fitments depuis un TITRE de pièce (marque noyée dans le nom)  */
/* -------------------------------------------------------------------------- */

/**
 * Certaines sources (CoinAfrique) n'ont pas de champ de compatibilité : le
 * véhicule est noyé dans le titre, ex. « Phare BMW », « Filtre à huile Renault »,
 * « Moteur BMW E46 », « Moteur Hyundai Kia ». `parseCompatibilityText` ne suffit
 * pas car il suppose une chaîne qui COMMENCE par la marque. Ici on scanne tout le
 * titre à la recherche de marques connues (avec quelques alias/typos courants),
 * et on en déduit un fitment marque (+ modèle si on le reconnaît au catalogue).
 *
 * Volontairement conservateur : pas d'extraction d'année (les titres regorgent de
 * nombres parasites — « 12v-150ah », « 16 pouces », « R15 »), et un modèle n'est
 * retenu que s'il correspond à un modèle connu de la marque. Un fitment sans
 * modèle/année reste inclusif (matche tous les modèles/années de la marque), ce
 * qui est le bon défaut pour le filtrage strict du parcours acheteur.
 */
export interface NameFitment {
  brand: string
  model: string | null
  yearFrom: null
  yearTo: null
}

/** Alias / fautes de frappe fréquents → clé de marque canonique du catalogue. */
const BRAND_ALIASES: Record<string, string> = {
  MERCEDES: 'MERCEDES-BENZ',
  BENZ: 'MERCEDES-BENZ',
  'RANGE ROVER': 'LAND ROVER',
  VW: 'VOLKSWAGEN',
  HUYNDAI: 'HYUNDAI',
  HUNDAI: 'HYUNDAI',
  CHEVY: 'CHEVROLET',
}

/** Retire les accents et met en MAJUSCULES (« Hyundaï » → « HYUNDAI »). */
function foldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

// Candidats de marque à scanner : marques du catalogue + alias, tirets → espaces,
// triés par longueur décroissante (matcher « MERCEDES BENZ » avant « MERCEDES »).
// On écarte « DS » (2 lettres, trop ambigu dans un titre libre).
const BRAND_CANDIDATES: Array<{ needle: string; canonical: string }> = [
  ...BRAND_NAMES.filter((b) => b.length >= 3).map((b) => ({ needle: foldText(b).replace(/-/g, ' '), canonical: b })),
  ...Object.entries(BRAND_ALIASES).map(([alias, canonical]) => ({ needle: foldText(alias), canonical })),
].sort((a, b) => b.needle.length - a.needle.length)

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Modèles connus d'une marque, repliés (sans accents, MAJ) → clé canonique. */
function foldedModels(canonicalBrand: string): Array<{ folded: string; key: string }> {
  const models = VEHICLE_BRANDS[canonicalBrand]?.models ?? {}
  return Object.keys(models).map((key) => ({ folded: foldText(key), key }))
}

export function extractFitmentsFromName(name: string | null | undefined): NameFitment[] {
  if (!name) return []
  const foldedFull = foldText(name).replace(/-/g, ' ')
  if (!foldedFull.trim()) return []

  const out: NameFitment[] = []
  const seenBrands = new Set<string>()

  for (const { needle, canonical } of BRAND_CANDIDATES) {
    if (seenBrands.has(canonical)) continue
    const re = new RegExp(`(?:^|[^A-Z0-9])${escapeRegExp(needle)}(?:$|[^A-Z0-9])`)
    const m = re.exec(foldedFull)
    if (!m) continue
    seenBrands.add(canonical)

    // Texte qui suit la marque → tentative de modèle (2 mots puis 1 mot).
    const after = foldedFull
      .slice((m.index ?? 0) + m[0].length)
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    let model: string | null = null
    const candidates = foldedModels(canonical)
    for (const span of [2, 1]) {
      if (after.length < span) continue
      const probe = after.slice(0, span).join(' ')
      const hit = candidates.find((c) => c.folded === probe)
      if (hit) {
        model = hit.key
        break
      }
    }

    out.push({ brand: canonical, model, yearFrom: null, yearTo: null })
  }

  return out
}
