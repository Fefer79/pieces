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
