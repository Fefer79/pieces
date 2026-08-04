import { z } from 'zod'

// Validateurs du module Sourcing & Expéditions.
//
// ⚠ `zodToFastify()` perd les `.refine()` : toute règle composite est
// réappliquée dans le service, qui reste l'autorité (même convention que
// validators/logistics.ts).

export const sourcingSearchStatusSchema = z.enum(['PENDING', 'RUNNING', 'DONE', 'FAILED'])

export const sourcingOfferStatusSchema = z.enum([
  'CANDIDATE',
  'SHORTLISTED',
  'CONTACTED',
  'REJECTED',
  'ORDERED',
])

export const sourcingSearchOriginSchema = z.enum(['MANUAL', 'AGENT'])

export const sourcingChannelSchema = z.enum([
  'MARKETPLACE_INTL',
  'DISTRIBUTOR_REGIONAL',
  'EXPORTER',
  'MANUFACTURER',
  'LOCAL',
])

export const shipmentCarrierSchema = z.enum([
  'DHL',
  'FEDEX',
  'UPS',
  'TRANSITAIRE',
  'AIR_CARGO',
  'SEA_LCL',
  'POSTAL',
  'OTHER',
])

export const shipmentStatusSchema = z.enum([
  'SOURCING',
  'COLLECTED',
  'IN_TRANSIT',
  'CUSTOMS',
  'LOCAL_DELIVERY',
  'DELIVERED',
  'CANCELLED',
])

export const logisticsModeSchema = z.enum([
  'PRE_POSITIONED',
  'LOCAL',
  'AIR_NOW',
  'AIR_STANDARD',
  'AIR_ECONOMY',
  'SEA_LCL',
])

// ---------------------------------------------------------------------------
// Sortie de l'agent
// ---------------------------------------------------------------------------

/**
 * Une offre telle que l'agent la rapporte. Tout est nullable sauf le nom du
 * vendeur : le prompt interdit d'inventer, donc un champ absent de la page doit
 * pouvoir remonter vide plutôt que fabriqué.
 */
export const sourcingOfferOutputSchema = z.object({
  supplierName: z.string().min(1).max(200),
  channel: sourcingChannelSchema.default('MARKETPLACE_INTL'),
  country: z.string().max(80).nullish(),
  city: z.string().max(80).nullish(),
  url: z.string().max(2000).nullish(),
  sourceSite: z.string().max(120).nullish(),
  title: z.string().max(300).nullish(),
  brand: z.string().max(120).nullish(),
  oemReference: z.string().max(120).nullish(),
  conditionLabel: z.string().max(80).nullish(),
  priceAmount: z.number().nonnegative().nullish(),
  priceCurrency: z.string().max(8).nullish(),
  shippingAmount: z.number().nonnegative().nullish(),
  moq: z.number().int().positive().max(100_000).nullish(),
  leadTimeDays: z.number().int().min(0).max(365).nullish(),
  weightKg: z.number().positive().max(5_000).nullish(),
  availability: z.string().max(200).nullish(),
  contactPhone: z.string().max(60).nullish(),
  contactEmail: z.string().max(160).nullish(),
  contactWhatsapp: z.string().max(60).nullish(),
  confidence: z.number().min(0).max(1).default(0.5),
})

export const sourcingOffersOutputSchema = z.object({
  offers: z.array(sourcingOfferOutputSchema).max(30),
  /** Note libre de l'agent (pièce introuvable, référence ambiguë…). */
  note: z.string().max(1000).nullish(),
})

// ---------------------------------------------------------------------------
// Entrées API
// ---------------------------------------------------------------------------

export const sourcingSearchCreateSchema = z.object({
  /**
   * MANUAL par défaut : constituer le dossier à la main est le mode standard.
   * AGENT déclenche la recherche automatique, qui coûte un appel modèle et
   * jusqu'à 12 recherches web.
   */
  origin: sourcingSearchOriginSchema.default('MANUAL'),
  quoteRequestId: z.string().min(1).max(64).optional(),
  partRequestId: z.string().min(1).max(64).optional(),
  /** Écrase le libellé issu de la demande (ops qui reformule la requête). */
  partName: z.string().min(2).max(200).optional(),
  oemReference: z.string().max(120).optional(),
  vehicleBrand: z.string().max(80).optional(),
  vehicleModel: z.string().max(80).optional(),
  vehicleYear: z.number().int().min(1980).max(2100).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
})

export const sourcingSearchParamsSchema = z.object({ id: z.string().min(1).max(64) })
export const sourcingOfferParamsSchema = z.object({ id: z.string().min(1).max(64) })

/**
 * Saisie manuelle d'une offre relevée par un opérateur. Seul le nom du
 * fournisseur est obligatoire : on préfère une offre incomplète mais réelle à
 * une fiche bloquée faute d'un champ que la page ne donnait pas.
 */
export const offerCreateSchema = z.object({
  supplierName: z.string().min(1).max(200),
  channel: sourcingChannelSchema.default('MARKETPLACE_INTL'),
  country: z.string().max(80).optional(),
  city: z.string().max(80).optional(),
  url: z.string().url('Lien invalide').max(2000).optional(),
  title: z.string().max(300).optional(),
  brand: z.string().max(120).optional(),
  oemReference: z.string().max(120).optional(),
  conditionLabel: z.string().max(80).optional(),
  priceAmount: z.number().nonnegative().max(1_000_000_000).optional(),
  priceCurrency: z.string().min(3).max(8).optional(),
  /** Vrai quand le prix a été obtenu du vendeur, pas seulement lu sur une page. */
  priceConfirmed: z.boolean().default(false),
  shippingAmount: z.number().nonnegative().max(1_000_000_000).optional(),
  moq: z.number().int().positive().max(100_000).optional(),
  leadTimeDays: z.number().int().min(0).max(365).optional(),
  weightKg: z.number().positive().max(5_000).optional(),
  availability: z.string().max(200).optional(),
  contactPhone: z.string().max(60).optional(),
  contactEmail: z.string().max(160).optional(),
  contactWhatsapp: z.string().max(60).optional(),
  chosenMode: logisticsModeSchema.optional(),
  opsNote: z.string().max(2000).optional(),
})

export const offerUpdateSchema = z.object({
  status: sourcingOfferStatusSchema.optional(),
  opsNote: z.string().max(2000).nullable().optional(),
  chosenMode: logisticsModeSchema.nullable().optional(),
  priceConfirmed: z.boolean().optional(),
  /** Prix corrigé par l'ops après confirmation auprès du vendeur. */
  priceAmount: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  priceCurrency: z.string().max(8).nullable().optional(),
  leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  weightKg: z.number().positive().max(5_000).nullable().optional(),
})

export const adminSourcingListQuerySchema = z.object({
  status: sourcingSearchStatusSchema.optional(),
  origin: sourcingSearchOriginSchema.optional(),
  quoteRequestId: z.string().max(64).optional(),
  q: z.string().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})

export const createPurchaseOrderFromOfferSchema = z.object({
  destinationId: z.string().uuid().optional(),
  /** Surcharge du taux de change appliqué au BC (le champ existe sur PurchaseOrder). */
  tauxChange: z.number().int().positive().max(100_000).optional(),
  notes: z.string().max(2000).optional(),
})

// ---------------------------------------------------------------------------
// Expéditions
// ---------------------------------------------------------------------------

export const shipmentCreateSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  quoteRequestId: z.string().min(1).max(64).optional(),
  carrier: shipmentCarrierSchema.default('TRANSITAIRE'),
  carrierOther: z.string().max(120).optional(),
  trackingNumber: z.string().max(120).optional(),
  mode: logisticsModeSchema.default('AIR_STANDARD'),
  originCountry: z.string().max(80).optional(),
  originCity: z.string().max(80).optional(),
  etaAt: z.string().datetime().optional(),
  weightKg: z.number().positive().max(5_000).optional(),
  volumeDm3: z.number().positive().max(100_000).optional(),
  freightCostFcfa: z.number().int().nonnegative().max(1_000_000_000).optional(),
  customsCostFcfa: z.number().int().nonnegative().max(1_000_000_000).optional(),
  lastMileCostFcfa: z.number().int().nonnegative().max(1_000_000_000).optional(),
  notes: z.string().max(2000).optional(),
})

export const shipmentUpdateSchema = z.object({
  carrier: shipmentCarrierSchema.optional(),
  carrierOther: z.string().max(120).nullable().optional(),
  trackingNumber: z.string().max(120).nullable().optional(),
  etaAt: z.string().datetime().nullable().optional(),
  weightKg: z.number().positive().max(5_000).nullable().optional(),
  volumeDm3: z.number().positive().max(100_000).nullable().optional(),
  freightCostFcfa: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  customsCostFcfa: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  lastMileCostFcfa: z.number().int().nonnegative().max(1_000_000_000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const shipmentTransitionSchema = z.object({
  status: shipmentStatusSchema,
  label: z.string().max(200).optional(),
  location: z.string().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(1000).optional(),
})

export const shipmentParamsSchema = z.object({ id: z.string().min(1).max(64) })
export const shipmentReferenceParamsSchema = z.object({
  reference: z.string().min(4).max(40),
})

export const adminShipmentsQuerySchema = z.object({
  status: shipmentStatusSchema.optional(),
  carrier: shipmentCarrierSchema.optional(),
  q: z.string().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})

export const shipmentPublicLookupSchema = z.object({ t: z.string().min(16).max(128) })

export type SourcingOfferOutput = z.infer<typeof sourcingOfferOutputSchema>
export type SourcingOffersOutput = z.infer<typeof sourcingOffersOutputSchema>
export type SourcingSearchCreateInput = z.infer<typeof sourcingSearchCreateSchema>
export type OfferCreateInput = z.infer<typeof offerCreateSchema>
export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>
export type AdminSourcingListQuery = z.infer<typeof adminSourcingListQuerySchema>
export type CreatePurchaseOrderFromOfferInput = z.infer<typeof createPurchaseOrderFromOfferSchema>
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>
export type ShipmentTransitionInput = z.infer<typeof shipmentTransitionSchema>
export type AdminShipmentsQuery = z.infer<typeof adminShipmentsQuerySchema>
