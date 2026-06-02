import { prisma } from '../../lib/prisma.js'
import { VEHICLE_BRANDS, BRAND_NAMES, PART_CATEGORIES, UNIVERSAL_CATEGORIES } from 'shared/constants'
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

/**
 * Résout la donnée d'une marque par clé, insensible à la casse. Les clés de
 * VEHICLE_BRANDS sont en MAJUSCULES (export depuis la base Global Auto) ; la
 * marque peut arriver d'une URL ou d'un véhicule utilisateur en casse libre.
 */
function resolveBrand(brand: string) {
  const direct = VEHICLE_BRANDS[brand]
  if (direct) return direct
  const lower = brand.toLowerCase()
  for (const [key, value] of Object.entries(VEHICLE_BRANDS)) {
    if (key.toLowerCase() === lower) return value
  }
  throw new AppError('BRAND_NOT_FOUND', 404, { message: `Marque "${brand}" introuvable` })
}

export function getModels(brand: string) {
  return Object.keys(resolveBrand(brand).models)
}

export function getYears(brand: string, model: string) {
  const brandData = resolveBrand(brand)
  const lower = model.toLowerCase()
  const modelKey = Object.keys(brandData.models).find((m) => m.toLowerCase() === lower)
  const years = modelKey ? brandData.models[modelKey] : undefined
  if (!years) {
    throw new AppError('MODEL_NOT_FOUND', 404, { message: `Modèle "${model}" introuvable pour ${brand}` })
  }
  return years.slice().reverse() // Most recent first
}

export function getCategories() {
  return [...PART_CATEGORIES]
}

export interface VehicleCompatibilityFilters {
  brand?: string
  model?: string
  year?: number
}

export interface BrowsePartsFilters extends VehicleCompatibilityFilters {
  category?: string
  q?: string
  page?: number
  limit?: number
}

/**
 * Clause Prisma de compatibilité véhicule STRICTE : ne matche que les pièces
 * ayant un fitment structuré correspondant à la marque/modèle/année. Les pièces
 * universelles (fluides, outillage, accessoires) restent toujours visibles.
 * Retourne null si aucun véhicule n'est sélectionné (= pas de filtre véhicule).
 */
function buildVehicleCompatibilityClause(filters: VehicleCompatibilityFilters): Record<string, unknown> | null {
  if (!filters.brand) return null

  const fitmentWhere: Record<string, unknown> = { brand: { equals: filters.brand, mode: 'insensitive' } }
  if (filters.model) {
    fitmentWhere.OR = [{ model: null }, { model: { equals: filters.model, mode: 'insensitive' } }]
  }
  if (filters.year) {
    fitmentWhere.AND = [
      { OR: [{ yearFrom: null }, { yearFrom: { lte: filters.year } }] },
      { OR: [{ yearTo: null }, { yearTo: { gte: filters.year } }] },
    ]
  }

  return {
    OR: [
      { fitments: { some: fitmentWhere } },
      { category: { in: [...UNIVERSAL_CATEGORIES] } },
    ],
  }
}

/** Clause texte libre (nom de pièce ou référence OEM). Null si < 2 caractères. */
function buildTextClause(q?: string): Record<string, unknown> | null {
  const term = q?.trim()
  if (!term || term.length < 2) return null
  return {
    OR: [
      { name: { contains: term, mode: 'insensitive' } },
      { oemReference: { contains: term, mode: 'insensitive' } },
    ],
  }
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

  // Filtrage strict : véhicule (fitments) + texte combinés en AND.
  const and: Record<string, unknown>[] = []
  const vehicleClause = buildVehicleCompatibilityClause(filters)
  if (vehicleClause) and.push(vehicleClause)
  const textClause = buildTextClause(filters.q)
  if (textClause) and.push(textClause)
  if (and.length > 0) where.AND = and

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
        condition: true,
        partSource: true,
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

export interface CompareOffer {
  id: string
  vendorId: string
  vendorName: string
  vendorRating: number | null
  vendorOrdersDelivered: number
  price: number | null
  condition: string | null
  partSource: string | null
  warrantyMonths: number | null
  inStock: boolean
  imageThumbUrl: string | null
}

export interface CompareGroup {
  groupKey: string
  oemReference: string | null
  name: string | null
  category: string | null
  offerCount: number
  minPrice: number | null
  offers: CompareOffer[]
}

function normalizeName(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function compareParts(filters: BrowsePartsFilters & { oem?: string } = {}) {
  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
  }

  if (filters.category) where.category = filters.category
  if (filters.oem) where.oemReference = { equals: filters.oem, mode: 'insensitive' }

  if (filters.brand) {
    const compatParts: string[] = [filters.brand]
    if (filters.model) compatParts.push(filters.model)
    if (filters.year) compatParts.push(String(filters.year))
    const compatQuery = compatParts.join(' ')

    const fitmentWhere: Record<string, unknown> = { brand: { equals: filters.brand, mode: 'insensitive' } }
    if (filters.model) {
      fitmentWhere.OR = [{ model: null }, { model: { equals: filters.model, mode: 'insensitive' } }]
    }
    if (filters.year) {
      fitmentWhere.AND = [
        { OR: [{ yearFrom: null }, { yearFrom: { lte: filters.year } }] },
        { OR: [{ yearTo: null }, { yearTo: { gte: filters.year } }] },
      ]
    }
    where.OR = [
      { fitments: { some: fitmentWhere } },
      { vehicleCompatibility: { contains: compatQuery, mode: 'insensitive' } },
    ]
  }

  const items = await prisma.catalogItem.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      oemReference: true,
      condition: true,
      partSource: true,
      price: true,
      warrantyMonths: true,
      inStock: true,
      imageThumbUrl: true,
      vendor: {
        select: {
          id: true,
          shopName: true,
          aggregateRating: true,
          ordersDelivered: true,
        },
      },
    },
    take: 500,
  })

  const groups = new Map<string, CompareGroup>()
  for (const item of items) {
    const groupKey = item.oemReference
      ? `oem:${item.oemReference.toUpperCase()}`
      : `name:${normalizeName(item.name)}`
    if (!groupKey || groupKey === 'name:') continue

    const offer: CompareOffer = {
      id: item.id,
      vendorId: item.vendor.id,
      vendorName: item.vendor.shopName,
      vendorRating: item.vendor.aggregateRating,
      vendorOrdersDelivered: item.vendor.ordersDelivered,
      price: item.price,
      condition: item.condition,
      partSource: item.partSource,
      warrantyMonths: item.warrantyMonths,
      inStock: item.inStock,
      imageThumbUrl: item.imageThumbUrl,
    }

    const existing = groups.get(groupKey)
    if (existing) {
      existing.offers.push(offer)
      existing.offerCount += 1
      if (offer.price != null && (existing.minPrice == null || offer.price < existing.minPrice)) {
        existing.minPrice = offer.price
      }
    } else {
      groups.set(groupKey, {
        groupKey,
        oemReference: item.oemReference,
        name: item.name,
        category: item.category,
        offerCount: 1,
        minPrice: offer.price,
        offers: [offer],
      })
    }
  }

  const result = Array.from(groups.values()).map((g) => {
    g.offers.sort((a, b) => {
      const ap = a.price ?? Number.POSITIVE_INFINITY
      const bp = b.price ?? Number.POSITIVE_INFINITY
      return ap - bp
    })
    return g
  })

  result.sort((a, b) => b.offerCount - a.offerCount)

  return { groups: result, total: result.length }
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
        condition: true,
        partSource: true,
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

/**
 * Suggestions de NOMS de pièces pour l'autocomplétion. Si un véhicule est passé,
 * les suggestions sont restreintes aux pièces compatibles (mêmes règles strictes
 * que browseParts) pour rester pertinentes.
 */
export async function suggestParts(
  query: string,
  filters: VehicleCompatibilityFilters = {},
  limit = 8,
): Promise<{ suggestions: string[] }> {
  const term = query.trim()
  if (term.length < 2) return { suggestions: [] }

  const where: Record<string, unknown> = {
    status: 'PUBLISHED',
    inStock: true,
    vendor: { status: 'ACTIVE' },
    name: { contains: term, mode: 'insensitive' },
  }

  const vehicleClause = buildVehicleCompatibilityClause(filters)
  if (vehicleClause) where.AND = [vehicleClause]

  const rows = await prisma.catalogItem.findMany({
    where,
    select: { name: true },
    distinct: ['name'],
    orderBy: { name: 'asc' },
    take: Math.min(limit, 20),
  })

  return { suggestions: rows.map((r) => r.name).filter((n): n is string => n != null) }
}

/**
 * Détail public d'une fiche produit (pièce). Ne renvoie que les pièces
 * publiées d'un vendeur actif. Inclut photos, compatibilités véhicule et
 * coordonnées vendeur — utilisé par la fiche produit côté acheteur.
 */
export async function getPublicItemDetail(id: string) {
  const item = await prisma.catalogItem.findFirst({
    where: { id, status: 'PUBLISHED', vendor: { status: 'ACTIVE' } },
    select: {
      id: true,
      name: true,
      category: true,
      oemReference: true,
      vehicleCompatibility: true,
      condition: true,
      partSource: true,
      price: true,
      warrantyMonths: true,
      inStock: true,
      imageOriginalUrl: true,
      imageThumbUrl: true,
      imageSmallUrl: true,
      imageMediumUrl: true,
      imageLargeUrl: true,
      vendor: { select: { id: true, shopName: true } },
      photos: {
        orderBy: { position: 'asc' },
        select: { id: true, urlThumb: true, urlMedium: true, urlLarge: true, urlOriginal: true },
      },
      fitments: {
        orderBy: [{ brand: 'asc' }, { model: 'asc' }],
        select: { id: true, brand: true, model: true, yearFrom: true, yearTo: true, engine: true },
      },
    },
  })

  if (!item) {
    throw new AppError('ITEM_NOT_FOUND', 404, { message: 'Pièce introuvable' })
  }

  return item
}
