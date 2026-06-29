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
export const partSourceSchema = z.enum(['OEM', 'AFTERMARKET', 'COMPATIBLE'])
export const warrantyUnitSchema = z.enum(['DAY', 'WEEK', 'MONTH'])

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
  partSource: partSourceSchema.nullable().optional(),
  warrantyValue: z.number().int().min(0).max(365).optional(),
  warrantyUnit: warrantyUnitSchema.optional(),
  commissionAmount: z.number().int().min(0).optional(),
  commissionAccepted: z.boolean().optional(),
})

export const toggleStockSchema = z.object({
  inStock: z.boolean(),
})

// Admin edit of an annonce — broader than the vendor self-service schema:
// admins may also flip status/stock and clear descriptive fields.
export const adminUpdateCatalogItemSchema = z
  .object({
    name: z.string().min(1).max(200).nullable().optional(),
    category: z.string().min(1).max(100).nullable().optional(),
    oemReference: z.string().max(100).nullable().optional(),
    price: z.number().int().min(0).nullable().optional(),
    condition: partConditionSchema.nullable().optional(),
    partSource: partSourceSchema.nullable().optional(),
    status: catalogItemStatusSchema.optional(),
    inStock: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ à modifier' })

export const photoParamsSchema = z.object({
  id: z.string().uuid(),
  photoId: z.string().uuid(),
})

export const reorderPhotosSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(MAX_PHOTOS_PER_ITEM),
})

export const fitmentSchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(80).nullable().optional(),
  yearFrom: z.number().int().min(1950).max(2100).nullable().optional(),
  yearTo: z.number().int().min(1950).max(2100).nullable().optional(),
  engine: z.string().min(1).max(60).nullable().optional(),
}).refine(
  (v) => v.yearFrom == null || v.yearTo == null || v.yearFrom <= v.yearTo,
  { message: 'yearFrom doit être inférieur ou égal à yearTo', path: ['yearFrom'] },
)

export const fitmentParamsSchema = z.object({
  id: z.string().uuid(),
  fitmentId: z.string().uuid(),
})

export const replaceFitmentsSchema = z.object({
  fitments: z.array(fitmentSchema).max(50),
})

export const ingestSourceSchema = z.enum([
  'HAUTOPARTS_3H',
  'MAPA_CI',
  'JUMIA_CI',
  'COINAFRIQUE_CI',
  'ANNUAIRE_CI',
  'GLOBAL_AUTO_CI',
  'OSM',
  'GOOGLE_PLACES',
  'NHTSA',
  'WIKIPEDIA',
  'PARTSOUQ',
  'MANUAL',
])

export const adminListQuerySchema = z.object({
  q: z.string().max(200).optional(),
  status: z.string().max(40).optional(),
  vendorId: z.string().uuid().optional(),
  role: z.string().max(40).optional(),
  source: ingestSourceSchema.optional(),
  hasOem: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const adminSuggestQuerySchema = z.object({
  q: z.string().max(200).optional(),
})

export const adminEntitySuggestQuerySchema = z.object({
  entity: z.enum(['clients', 'enterprises', 'vendors', 'external-imports']),
  q: z.string().max(200).optional(),
})

export const adminExportQuerySchema = z.object({
  entity: z.enum(['vendors', 'clients', 'orders', 'catalog']),
})
