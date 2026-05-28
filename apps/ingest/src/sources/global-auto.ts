import { z } from 'zod'
import { fetchJson } from '../lib/http.ts'

const API_BASE = 'https://globalautoback-production.up.railway.app/api'

export const EXTERNAL_SOURCE = 'GLOBAL_AUTO_CI'

// ---------- Vehicle tree schemas ----------

export const MakeSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string().optional(),
  product_count: z.union([z.string(), z.number()]).optional(),
})
export type GaMake = z.infer<typeof MakeSchema>

export const ModelSchema = z.object({
  id: z.number(),
  make_id: z.number(),
  name: z.string(),
  slug: z.string(),
  model_code: z.string().nullable().optional(),
  year_from: z.number().nullable().optional(),
  year_to: z.number().nullable().optional(),
  created_at: z.string().optional(),
  product_count: z.union([z.string(), z.number()]).optional(),
})
export type GaModel = z.infer<typeof ModelSchema>

export const SeriesSchema = z.object({
  id: z.number(),
  model_id: z.number(),
  name: z.string(),
  slug: z.string(),
  created_at: z.string().optional(),
  product_count: z.union([z.string(), z.number()]).optional(),
})
export type GaSeries = z.infer<typeof SeriesSchema>

// ---------- Product / compatibility schemas ----------

const VehicleCompatibilitySchema = z.object({
  make_id: z.number().nullable(),
  make_name: z.string().nullable(),
  model_id: z.number().nullable(),
  model_name: z.string().nullable(),
  series_id: z.number().nullable(),
  series_name: z.string().nullable(),
  trim_id: z.number().nullable(),
  trim_name: z.string().nullable(),
  engine_id: z.number().nullable(),
  engine_name: z.string().nullable(),
})
export type GaVehicleCompatibility = z.infer<typeof VehicleCompatibilitySchema>

const ProductImageSchema = z.object({
  id: z.number().optional(),
  url: z.string().optional(),
  image_url: z.string().optional(),
}).passthrough()

export const ProductSchema = z.object({
  id: z.number(),
  woocommerce_id: z.number().nullable().optional(),
  sku: z.string().nullable(),
  name: z.string(),
  slug: z.string(),
  short_description: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  regular_price: z.union([z.string(), z.number()]).nullable(),
  sale_price: z.union([z.string(), z.number()]).nullable().optional(),
  stock_quantity: z.number().nullable().optional(),
  stock_status: z.string().nullable().optional(),
  is_featured: z.boolean().optional(),
  published: z.boolean().optional(),
  visibility: z.string().nullable().optional(),
  created_at: z.string().optional(),
  category_id: z.number().nullable().optional(),
  category_name: z.string().nullable().optional(),
  category_slug: z.string().nullable().optional(),
  brand_id: z.number().nullable().optional(),
  brand_name: z.string().nullable().optional(),
  brand_slug: z.string().nullable().optional(),
  images: z.array(ProductImageSchema).default([]),
  vehicle_compatibility: z.array(VehicleCompatibilitySchema).default([]),
})
export type GaProduct = z.infer<typeof ProductSchema>

const ProductsPageSchema = z.object({
  products: z.array(ProductSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

// ---------- Fetchers ----------

export async function fetchMakes(): Promise<GaMake[]> {
  const raw = await fetchJson<unknown>(`${API_BASE}/vehicles/makes`)
  return z.array(MakeSchema).parse(raw)
}

export async function fetchModels(makeId: number): Promise<GaModel[]> {
  const raw = await fetchJson<unknown>(`${API_BASE}/vehicles/makes/${makeId}/models`)
  return z.array(ModelSchema).parse(raw)
}

export async function fetchSeries(modelId: number): Promise<GaSeries[]> {
  const raw = await fetchJson<unknown>(`${API_BASE}/vehicles/models/${modelId}/series`)
  return z.array(SeriesSchema).parse(raw)
}

export async function fetchProductsPage(
  page: number,
  limit = 500,
): Promise<{ products: GaProduct[]; total: number; totalPages: number }> {
  const raw = await fetchJson<unknown>(`${API_BASE}/products?page=${page}&limit=${limit}`)
  const parsed = ProductsPageSchema.parse(raw)
  return {
    products: parsed.products,
    total: parsed.pagination.total,
    totalPages: parsed.pagination.totalPages,
  }
}

/**
 * Stream all products page-by-page. Yields each page so the caller can process
 * incrementally without buffering ~4k products in memory.
 */
export async function* streamAllProducts(
  pageLimit = 500,
): AsyncGenerator<{ page: number; totalPages: number; products: GaProduct[] }> {
  let page = 1
  let totalPages = Infinity
  while (page <= totalPages) {
    const result = await fetchProductsPage(page, pageLimit)
    totalPages = result.totalPages
    yield { page, totalPages, products: result.products }
    page += 1
  }
}
