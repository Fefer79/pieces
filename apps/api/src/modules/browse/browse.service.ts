import { prisma } from '../../lib/prisma.js'
import { VEHICLE_BRANDS, BRAND_NAMES, PART_CATEGORIES } from 'shared/constants'
import { AppError } from '../../lib/appError.js'

export interface VinDecodeResult {
  vin: string
  make: string | null
  model: string | null
  year: number | null
  decoded: boolean
}

export async function decodeVin(vin: string): Promise<VinDecodeResult> {
  const upperVin = vin.toUpperCase()
  try {
    const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${upperVin}?format=json`)
    if (!res.ok) {
      return { vin: upperVin, make: null, model: null, year: null, decoded: false }
    }
    const data = (await res.json()) as { Results?: Array<{ Make?: string; Model?: string; ModelYear?: string }> }
    const result = data.Results?.[0]
    if (!result || !result.Make) {
      return { vin: upperVin, make: null, model: null, year: null, decoded: false }
    }

    return {
      vin: upperVin,
      make: result.Make || null,
      model: result.Model || null,
      year: result.ModelYear ? parseInt(result.ModelYear, 10) : null,
      decoded: true,
    }
  } catch {
    return { vin: upperVin, make: null, model: null, year: null, decoded: false }
  }
}

export function getBrands() {
  return BRAND_NAMES
}

export function getModels(brand: string) {
  const brandData = VEHICLE_BRANDS[brand]
  if (!brandData) {
    throw new AppError('BRAND_NOT_FOUND', 404, { message: `Marque "${brand}" introuvable` })
  }
  return Object.keys(brandData.models)
}

export function getYears(brand: string, model: string) {
  const brandData = VEHICLE_BRANDS[brand]
  if (!brandData) {
    throw new AppError('BRAND_NOT_FOUND', 404, { message: `Marque "${brand}" introuvable` })
  }
  const years = brandData.models[model]
  if (!years) {
    throw new AppError('MODEL_NOT_FOUND', 404, { message: `Modèle "${model}" introuvable pour ${brand}` })
  }
  return years.slice().reverse() // Most recent first
}

export function getCategories() {
  return [...PART_CATEGORIES]
}

export interface BrowsePartsFilters {
  brand?: string
  model?: string
  year?: number
  category?: string
  page?: number
  limit?: number
}

export async function browseParts(filters: BrowsePartsFilters = {}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
  }

  if (filters.category) {
    where.category = filters.category
  }

  // Filter by vehicle compatibility (text matching)
  if (filters.brand) {
    const compatParts: string[] = [filters.brand]
    if (filters.model) compatParts.push(filters.model)
    if (filters.year) compatParts.push(String(filters.year))
    const compatQuery = compatParts.join(' ')
    where.vehicleCompatibility = { contains: compatQuery, mode: 'insensitive' }
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        oemReference: true,
        vehicleCompatibility: true,
        price: true,
        imageThumbUrl: true,
        imageMediumUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function searchParts(query: string, filters: { category?: string; page?: number; limit?: number } = {}) {
  const page = filters.page ?? 1
  const limit = Math.min(filters.limit ?? 20, 100)
  const skip = (page - 1) * limit

  // Apply synonym correction
  let correctedQuery = query.toLowerCase().trim()
  const synonyms = await prisma.searchSynonym.findMany()
  for (const syn of synonyms) {
    if (correctedQuery.includes(syn.typo)) {
      correctedQuery = correctedQuery.replace(syn.typo, syn.correction)
    }
  }

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
    OR: [
      { name: { contains: correctedQuery, mode: 'insensitive' } },
      { category: { contains: correctedQuery, mode: 'insensitive' } },
      { oemReference: { contains: correctedQuery, mode: 'insensitive' } },
      { vehicleCompatibility: { contains: correctedQuery, mode: 'insensitive' } },
    ],
  }

  if (filters.category) {
    where.category = filters.category
  }

  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        category: true,
        oemReference: true,
        vehicleCompatibility: true,
        price: true,
        imageThumbUrl: true,
        imageMediumUrl: true,
        vendor: { select: { id: true, shopName: true } },
      },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return {
    query: correctedQuery,
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
