import type { PartCondition, PartSource } from '@prisma/client'
import { extractFitmentsFromName, type NameFitment } from 'shared/constants'
import type { CoinAfriqueProductRaw } from '../sources/coinafrique.ts'

export const EXTERNAL_SOURCE_SLUG = 'COINAFRIQUE_CI'

export type CoinAfriqueNormalized = {
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
  /** Fitments déduits du titre (la marque du véhicule y est noyée). */
  fitments: NameFitment[]
  /** Vendeur réel, récupéré sur la page détail (null tant que non enrichi). */
  sellerId: string | null
  sellerName: string | null
  sellerPhone: string | null
}

const PART_BRANDS = [
  'Bosch', 'Valeo', 'Mann', 'NGK', 'Denso', 'Mahle', 'Hella', 'SKF', 'KYB',
  'Continental', 'Febi', 'Sachs', 'Luk', 'Gates', 'Brembo', 'TRW', 'Aisin',
] as const
const OEM_BRANDS = new Set(PART_BRANDS.map((b) => b.toUpperCase()))

function detectBrand(name: string): string | null {
  const upper = name.toUpperCase()
  for (const brand of PART_BRANDS) {
    if (upper.includes(brand.toUpperCase())) return brand
  }
  return null
}

function classifyPartSource(brand: string | null): PartSource {
  if (brand && OEM_BRANDS.has(brand.toUpperCase())) return 'OEM'
  return 'AFTERMARKET'
}

/** "Neuf"/"neuve"/"new" dans le titre → NEW, sinon USED (annonces d'occasion par défaut). */
function detectCondition(name: string): PartCondition {
  return /\b(neuf|neuve|neufs|neuves|new)\b/i.test(name) ? 'NEW' : 'USED'
}

/** "16 900 CFA" → 16900 ; "Prix sur demande" → null (aucun chiffre). */
function parsePrice(text: string | null): number | null {
  if (!text) return null
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeCoinAfriqueProduct(raw: CoinAfriqueProductRaw): CoinAfriqueNormalized | null {
  const name = raw.name?.trim()
  if (!name) return null
  const brand = detectBrand(name)
  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: raw.postId,
    externalSourceUrl: raw.url,
    name,
    category: raw.category ?? null,
    partBrand: brand,
    oemReference: null,
    price: parsePrice(raw.priceText),
    inStock: true,
    condition: detectCondition(name),
    partSource: classifyPartSource(brand),
    imageOriginalUrl: raw.imageUrl ?? null,
    fitments: extractFitmentsFromName(name),
    sellerId: null,
    sellerName: null,
    sellerPhone: null,
  }
}
