import type { PartCondition, PartSource } from '@prisma/client'
import type { GaProduct, GaVehicleCompatibility } from '../sources/global-auto.ts'

export const EXTERNAL_SOURCE_SLUG = 'GLOBAL_AUTO_CI'

export type GlobalAutoFitment = {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  engine: string | null
}

export type GlobalAutoNormalized = {
  externalSource: typeof EXTERNAL_SOURCE_SLUG
  externalSourceId: string
  externalSourceUrl: string | null
  name: string
  description: string | null
  category: string | null
  partBrand: string | null
  oemReference: string | null
  price: number | null
  inStock: boolean
  condition: PartCondition
  partSource: PartSource
  imageOriginalUrl: string | null
  fitments: GlobalAutoFitment[]
}

const OEM_BRANDS = new Set([
  'BOSCH', 'VALEO', 'MANN', 'NGK', 'DENSO', 'MAHLE', 'HELLA', 'SKF', 'KYB',
  'CONTINENTAL', 'FEBI', 'SACHS', 'LUK', 'GATES', 'BREMBO', 'TRW', 'LEMFORDER',
  'PIERBURG', 'AYWIPARTS', 'NISSENS',
])

function classifyPartSource(brandName: string | null): PartSource {
  if (!brandName) return 'AFTERMARKET'
  if (OEM_BRANDS.has(brandName.toUpperCase())) return 'OEM'
  return 'AFTERMARKET'
}

function parsePrice(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === 'number' ? value : Number.parseFloat(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

function pickPrimaryImage(images: GaProduct['images']): string | null {
  const first = images?.[0]
  if (!first) return null
  return first.url ?? first.image_url ?? null
}

const YEAR_RANGE = /\((\d{1,2})\/(\d{4})\s*-\s*(?:(\d{1,2})\/(\d{4})|\.\.\.)\)/
const YEAR_SHORT = /\b(\d{4})\b/

function parseSeriesYears(seriesName: string | null): { from: number | null; to: number | null } {
  if (!seriesName) return { from: null, to: null }
  const range = seriesName.match(YEAR_RANGE)
  if (range?.[2]) {
    const from = Number.parseInt(range[2], 10)
    const to = range[4] ? Number.parseInt(range[4], 10) : null
    return { from, to }
  }
  const single = seriesName.match(YEAR_SHORT)
  return { from: single?.[1] ? Number.parseInt(single[1], 10) : null, to: null }
}

function dedupeFitments(rows: GlobalAutoFitment[]): GlobalAutoFitment[] {
  const seen = new Set<string>()
  const out: GlobalAutoFitment[] = []
  for (const r of rows) {
    const key = `${r.brand}|${r.model ?? ''}|${r.yearFrom ?? ''}|${r.yearTo ?? ''}|${r.engine ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

export function compatibilityToFitments(compat: GaVehicleCompatibility[]): GlobalAutoFitment[] {
  const out: GlobalAutoFitment[] = []
  for (const c of compat) {
    if (!c.make_name) continue
    const years = parseSeriesYears(c.series_name)
    out.push({
      brand: c.make_name,
      model: c.model_name,
      yearFrom: years.from,
      yearTo: years.to,
      engine: c.trim_name,
    })
  }
  return dedupeFitments(out)
}

export function normalizeGlobalAutoProduct(raw: GaProduct, sitePrefix = 'https://global-auto.online'): GlobalAutoNormalized | null {
  const name = raw.name?.trim()
  if (!name) return null
  const price = parsePrice(raw.sale_price) ?? parsePrice(raw.regular_price)
  const inStock = raw.stock_status === 'in_stock' || (raw.stock_quantity != null && raw.stock_quantity > 0)
  return {
    externalSource: EXTERNAL_SOURCE_SLUG,
    externalSourceId: String(raw.id),
    externalSourceUrl: raw.slug ? `${sitePrefix}/products/${raw.slug}` : null,
    name,
    description: raw.description ?? raw.short_description ?? null,
    category: raw.category_name ?? null,
    partBrand: raw.brand_name ?? null,
    oemReference: raw.sku ?? null,
    price,
    inStock,
    condition: 'NEW',
    partSource: classifyPartSource(raw.brand_name ?? null),
    imageOriginalUrl: pickPrimaryImage(raw.images),
    fitments: compatibilityToFitments(raw.vehicle_compatibility),
  }
}
