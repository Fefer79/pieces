import { z } from 'zod'

// Modes d'achat = clés de LOGISTICS_MODES (packages/shared/constants/logistics.ts)
export const purchaseOrderModeSchema = z.enum([
  'LOCAL',
  'AIR_NOW',
  'AIR_STANDARD',
  'AIR_ECONOMY',
  'SEA_LCL',
])

export const purchaseOrderStatusSchema = z.enum([
  'BROUILLON',
  'ENVOYEE',
  'EN_TRANSIT',
  'RECEPTION_PARTIELLE',
  'RECEPTIONNEE',
  'ANNULEE',
])

export const stockMovementTypeSchema = z.enum([
  'RECEPTION',
  'SORTIE_COMMANDE',
  'AJUSTEMENT',
  'RESTITUTION',
])

export const stockLocationTypeSchema = z.enum(['ENTREPOT', 'BOUTIQUE', 'TRANSIT'])

export const stockLevelStatusSchema = z.enum(['rupture', 'bas', 'ok'])

// ---------------------------------------------------------------------------
// Emplacements
// ---------------------------------------------------------------------------

export const createStockLocationSchema = z.object({
  nom: z.string().min(2).max(100),
  type: stockLocationTypeSchema.default('ENTREPOT'),
  commune: z.string().max(100).optional().nullable(),
  adresse: z.string().max(255).optional().nullable(),
})

export const updateStockLocationSchema = z.object({
  nom: z.string().min(2).max(100).optional(),
  type: stockLocationTypeSchema.optional(),
  commune: z.string().max(100).optional().nullable(),
  adresse: z.string().max(255).optional().nullable(),
  actif: z.boolean().optional(),
})

export const stockLocationParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Niveaux, ajustements, mouvements
// ---------------------------------------------------------------------------

export const stockLevelsQuerySchema = z.object({
  locationId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
  statut: stockLevelStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const stockAdjustmentSchema = z.object({
  catalogItemId: z.string().uuid(),
  locationId: z.string().uuid(),
  delta: z
    .number()
    .int()
    .refine((v) => v !== 0, { message: 'Le delta ne peut pas être nul' }),
  coutUnitaireFcfa: z.number().int().min(0).optional().nullable(),
  seuilBas: z.number().int().min(0).optional(),
  note: z.string().max(500).optional().nullable(),
})

export const stockMovementsQuerySchema = z.object({
  catalogItemId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  type: stockMovementTypeSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const vendorStockAlertsQuerySchema = z.object({
  type: z.enum(['rupture', 'bas']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

// ---------------------------------------------------------------------------
// Fournisseurs
// ---------------------------------------------------------------------------

export const createSupplierSchema = z.object({
  nom: z.string().min(2).max(120),
  pays: z.string().max(60).optional().nullable(),
  ville: z.string().max(60).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  site: z.string().url().optional().nullable(),
  devise: z.string().length(3).default('AED'),
  delaiTypiqueJours: z.number().int().min(0).max(365).optional().nullable(),
  conditions: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const updateSupplierSchema = z.object({
  nom: z.string().min(2).max(120).optional(),
  pays: z.string().max(60).optional().nullable(),
  ville: z.string().max(60).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  telephone: z.string().max(30).optional().nullable(),
  whatsapp: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  site: z.string().url().optional().nullable(),
  devise: z.string().length(3).optional(),
  delaiTypiqueJours: z.number().int().min(0).max(365).optional().nullable(),
  conditions: z.string().max(2000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  actif: z.boolean().optional(),
})

export const suppliersQuerySchema = z.object({
  q: z.string().max(200).optional(),
  actif: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const supplierParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Bons de commande
// ---------------------------------------------------------------------------

export const purchaseOrderLineSchema = z.object({
  catalogItemId: z.string().uuid().optional().nullable(),
  designation: z.string().min(2).max(200),
  oemReference: z.string().max(100).optional().nullable(),
  quantite: z.number().int().min(1),
  prixUnitaire: z.number().min(0),
  poidsEstimeKg: z.number().min(0).optional().nullable(),
})

export const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  destinationId: z.string().uuid().optional().nullable(),
  mode: purchaseOrderModeSchema.default('LOCAL'),
  // 3 ou 4 caractères : les codes ISO font 3 lettres, mais la valeur par défaut
  // historique est « FCFA » (et c'est aussi le défaut en base). Avec
  // `.length(3)` le défaut échouait sa propre validation — un BC créé sans
  // devise explicite était rejeté.
  devise: z.string().min(3).max(4).default('FCFA'),
  tauxChange: z.number().int().min(1).optional().nullable(),
  etaAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  lines: z.array(purchaseOrderLineSchema).min(1).max(100),
})

export const updatePurchaseOrderSchema = z.object({
  statut: purchaseOrderStatusSchema.optional(),
  destinationId: z.string().uuid().optional().nullable(),
  etaAt: z.string().datetime().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const receivePurchaseOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        lineId: z.string().uuid(),
        quantiteRecue: z.number().int().min(1),
        prixUnitaireReelFcfa: z.number().int().min(0).optional().nullable(),
      }),
    )
    .min(1)
    .max(100),
})

export const purchaseOrdersQuerySchema = z.object({
  statut: purchaseOrderStatusSchema.optional(),
  supplierId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const purchaseOrderParamsSchema = z.object({
  id: z.string().uuid(),
})

export const estimateLandedCostSchema = z.object({
  mode: purchaseOrderModeSchema,
  poidsTotalKg: z.number().min(0),
  montantFcfa: z.number().int().min(0),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>
export type UpdateStockLocationInput = z.infer<typeof updateStockLocationSchema>
export type StockLevelsQuery = z.infer<typeof stockLevelsQuerySchema>
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>
export type StockMovementsQuery = z.infer<typeof stockMovementsQuerySchema>
export type VendorStockAlertsQuery = z.infer<typeof vendorStockAlertsQuerySchema>
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
export type SuppliersQuery = z.infer<typeof suppliersQuerySchema>
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>
export type ReceivePurchaseOrderInput = z.infer<typeof receivePurchaseOrderSchema>
export type PurchaseOrdersQuery = z.infer<typeof purchaseOrdersQuerySchema>
export type EstimateLandedCostInput = z.infer<typeof estimateLandedCostSchema>
