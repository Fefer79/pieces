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
import { BRAND_NAMES } from './vehicles'

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
  // Match d'une marque canonique connue en tête de chaîne.
  for (const brand of SORTED_BRANDS) {
    const b = brand.toLowerCase()
    if (lower === b || lower.startsWith(`${b} `)) {
      const model = head.slice(brand.length).trim()
      return { brand, model: model || null, yearFrom, yearTo }
    }
  }

  // Fallback : premier mot = marque, reste = modèle.
  const parts = head.split(/\s+/)
  if (parts.length === 0 || !parts[0]) return null
  const brand = parts[0]
  const model = parts.slice(1).join(' ').trim()
  return { brand, model: model || null, yearFrom, yearTo }
}
