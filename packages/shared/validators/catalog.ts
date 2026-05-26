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

export const partConditionSchema = z.enum(['NEW', 'USED', 'REFURBISHED'])

export const MIN_COMMISSION_FCFA = 1000
export const MIN_COMMISSION_RATE = 0.05

export function minCommissionFor(price: number): number {
  if (!price || price <= 0) return MIN_COMMISSION_FCFA
  return Math.max(MIN_COMMISSION_FCFA, Math.round(price * MIN_COMMISSION_RATE))
}

export const MAX_PHOTOS_PER_ITEM = 3

export const updateCatalogItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  oemReference: z.string().max(100).nullable().optional(),
  vehicleCompatibility: z.string().max(200).nullable().optional(),
  price: z.number().int().min(0).optional(),
  condition: partConditionSchema.optional(),
  warrantyMonths: z.number().int().min(0).max(120).optional(),
  commissionAmount: z.number().int().min(0).optional(),
  commissionAccepted: z.boolean().optional(),
})

export const toggleStockSchema = z.object({
  inStock: z.boolean(),
})

export const photoParamsSchema = z.object({
  id: z.string().uuid(),
  photoId: z.string().uuid(),
})

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(MAX_PHOTOS_PER_ITEM),
})

export const adminListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.string().max(40).optional(),
  vendorId: z.string().uuid().optional(),
  role: z.string().max(40).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const adminExportQuerySchema = z.object({
  entity: z.enum(['vendors', 'clients', 'orders', 'catalog']),
})
