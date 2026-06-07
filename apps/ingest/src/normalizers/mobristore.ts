import type { PartCondition, PartSource } from '@prisma/client'
import type { MobristoreProductRaw } from '../sources/mobristore.ts'

export const EXTERNAL_SOURCE_SLUG = 'MOBRISTORE_CI'

export type MobristoreNormalized = {
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

/** « 110 000 F » / « 27 500 FCFA » → 110000 / 27500 (premier montant entier). */
function parsePrice(text: string | null): number | null {
  if (!text) return null
  const digits = text.replace(/[^\d]/g, '')
  if (!digits) return null
  const n = Number.parseInt(digits, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeMobristoreProduct(raw: MobristoreProductRaw): MobristoreNormalized | null {
  const name = raw.name?.trim()
  if (!name) return null
  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: raw.postId,
    externalSourceUrl: raw.url,
    name,
    category: null,
    partBrand: raw.brand ?? null,
    oemReference: null,
    price: parsePrice(raw.priceText),
    inStock: true,
    condition: 'NEW',
    // Annonces de revendeur sans marque équipementier : pièces compatibles.
    partSource: 'COMPATIBLE',
    imageOriginalUrl: raw.imageUrl ?? null,
  }
}
