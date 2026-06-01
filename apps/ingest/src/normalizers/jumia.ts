import type { PartCondition, PartSource } from '@prisma/client'
import type { JumiaProductRaw } from '../sources/jumia.ts'

export const EXTERNAL_SOURCE_SLUG = 'JUMIA_CI'

export type JumiaNormalized = {
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
}

const OEM_BRANDS = new Set([
  'BOSCH', 'VALEO', 'MANN', 'NGK', 'DENSO', 'MAHLE', 'HELLA', 'SKF', 'KYB',
  'CONTINENTAL', 'FEBI', 'SACHS', 'LUK', 'GATES', 'BREMBO', 'TRW', 'LEMFORDER',
  'PIERBURG', 'NISSENS', 'MOTORCRAFT', 'AISIN', 'MOBIL', 'CASTROL',
])

function classifyPartSource(brand: string | null): PartSource {
  if (!brand) return 'AFTERMARKET'
  if (OEM_BRANDS.has(brand.toUpperCase())) return 'OEM'
  return 'AFTERMARKET'
}

/**
 * "23,750 FCFA" → 23750 ; "2,900 FCFA - 4,820 FCFA" → 2900 (borne basse).
 * Sépare les milliers (virgule/espace) du symbole et retient le 1ᵉʳ montant.
 */
function parsePrice(text: string | null): number | null {
  if (!text) return null
  const firstPart = text.split('-')[0] ?? text
  const digits = firstPart.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeJumiaProduct(raw: JumiaProductRaw): JumiaNormalized | null {
  const name = raw.name?.trim()
  if (!name) return null
  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: raw.productId,
    externalSourceUrl: raw.url,
    name,
    category: raw.category ?? null,
    partBrand: raw.brand ?? null,
    oemReference: null,
    price: parsePrice(raw.priceText),
    inStock: true,
    condition: 'NEW',
    partSource: classifyPartSource(raw.brand ?? null),
    imageOriginalUrl: raw.imageUrl ?? null,
  }
}
