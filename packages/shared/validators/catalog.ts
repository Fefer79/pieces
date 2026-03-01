import { z } from 'zod'

export const catalogItemStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export const catalogItemFilterSchema = z.object({
  status: catalogItemStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const catalogItemParamsSchema = z.object({
  id: z.string().uuid(),
})

export const updateCatalogItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  oemReference: z.string().max(100).nullable().optional(),
  vehicleCompatibility: z.string().max(200).nullable().optional(),
  price: z.number().int().min(0).optional(),
})

export const toggleStockSchema = z.object({
  inStock: z.boolean(),
})
