import type { PartCondition, PartSource } from '@prisma/client'
import { slugify } from '../lib/slugify.ts'
import type { ThreeHProductRaw } from '../sources/three-h.ts'

export const EXTERNAL_SOURCE_SLUG = '3hautoparts'

export type ThreeHNormalized = {
  externalSource: typeof EXTERNAL_SOURCE_SLUG
  externalSourceId: string
  externalSourceUrl: string
  name: string
  description: string | null
  category: string | null
  partBrand: string | null
  oemReference: string | null
  price: number | null
  currency: string | null
  inStock: boolean
  condition: PartCondition
  partSource: PartSource
  imageOriginalUrl: string | null
  sku: string | null
}

const PART_BRANDS = [
  'Bosch',
  'Cargo',
  'SKF',
  'Valeo',
  'KYB',
  'Bardahl',
  'Mann',
  'NGK',
  'Denso',
  'Mahle',
  'Hella',
  'Continental',
] as const

const OEM_BRANDS = new Set(['Bosch', 'Valeo', 'Mann', 'NGK', 'Denso', 'Mahle', 'Hella', 'SKF', 'KYB', 'Continental'])

function detectBrand(name: string): string | null {
  const upper = name.toUpperCase()
  for (const brand of PART_BRANDS) {
    if (upper.includes(brand.toUpperCase())) return brand
  }
  return null
}

const UNIT_TOKEN = /^\d+(ML|L|CL|KG|G|MM|CM|M|W|V|A|AH|NM)$/

function detectOemReference(name: string): string | null {
  const tokens = name.match(/\b[A-Z0-9-]{5,}\b/g) ?? []
  for (const tok of tokens) {
    if (UNIT_TOKEN.test(tok)) continue
    const hasLetter = /[A-Z]/.test(tok)
    const hasDigit = /\d/.test(tok)
    if (hasLetter && hasDigit) return tok
  }
  return null
}

function classifyPartSource(brand: string | null): PartSource {
  if (brand && OEM_BRANDS.has(brand)) return 'OEM'
  return 'AFTERMARKET'
}

function parsePrice(value: string | number): number | null {
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function pickPrimaryImage(image: ThreeHProductRaw['image']): string | null {
  if (!image) return null
  if (Array.isArray(image)) return image[0]?.url ?? null
  return image.url
}

function stripSiteSuffix(name: string): string {
  return name.replace(/\s*-\s*3H Autoparts.*$/i, '').trim()
}

function extractSlugFromUrl(url: string): string {
  const match = url.match(/\/produit\/([^/]+)\/?$/)
  return match?.[1] ?? slugify(url)
}

export function normalizeThreeHProduct(raw: ThreeHProductRaw): ThreeHNormalized | null {
  const cleanName = stripSiteSuffix(raw.name)
  if (!cleanName) return null
  const brand = detectBrand(cleanName)
  const oem = raw.sku ?? detectOemReference(cleanName)
  const price = raw.offers ? parsePrice(raw.offers.price) : null
  const inStock = raw.offers?.availability?.includes('InStock') ?? false
  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: extractSlugFromUrl(raw.sourceUrl),
    externalSourceUrl: raw.sourceUrl,
    name: cleanName,
    description: raw.description ?? null,
    category: raw.category ?? null,
    partBrand: brand,
    oemReference: oem,
    price,
    currency: raw.offers?.priceCurrency ?? null,
    inStock,
    condition: 'NEW',
    partSource: classifyPartSource(brand),
    imageOriginalUrl: pickPrimaryImage(raw.image),
    sku: raw.sku ?? null,
  }
}
