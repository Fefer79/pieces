import { z } from 'zod'

// Validateurs du module Sourcing & Expéditions
// (docs/sourcing-expeditions-plan-2026-08.md).
//
// ⚠ `zodToFastify()` perd les `.refine()` : les règles composites (une seule
// recherche active par demande, transitions d'expédition) sont appliquées dans
// les services, qui restent l'autorité.

export const sourcingSearchStatusSchema = z.enum(['PENDING', 'RUNNING', 'DONE', 'FAILED'])

export const sourcingOfferStatusSchema = z.enum([
  'CANDIDATE',
  'SHORTLISTED',
  'CONTACTED',
  'REJECTED',
  'ORDERED',
])

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
// Sortie de l'agent de recherche
//
// Tout est nullable sauf le nom du fournisseur : l'agent ne DOIT PAS inventer.
// Un prix absent reste absent (le plan : « prix null si non visible, jamais
// inventé »), c'est l'ops qui le confirme ensuite.
// ---------------------------------------------------------------------------

export const sourcingOffersOutputSchema = z.object({
  offres: z.array(
    z.object({
      fournisseur: z.string().min(1),
      canal: sourcingChannelSchema.catch('MARKETPLACE_INTL'),
      pays: z.string().nullable().optional(),
      ville: z.string().nullable().optional(),
      url: z.string().nullable().optional(),
      site: z.string().nullable().optional(),
      titre: z.string().nullable().optional(),
      marque: z.string().nullable().optional(),
      reference_oem: z.string().nullable().optional(),
      etat: z.string().nullable().optional(),
      prix: z.number().nullable().optional(),
      devise: z.string().nullable().optional(),
      frais_livraison: z.number().nullable().optional(),
      quantite_minimale: z.number().int().nullable().optional(),
      delai_jours: z.number().nullable().optional(),
      poids_kg: z.number().nullable().optional(),
      disponibilite: z.string().nullable().optional(),
      telephone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
      whatsapp: z.string().nullable().optional(),
      confiance: z.number().min(0).max(1).catch(0.5),
    }),
  ),
  note: z.string().nullable().optional(),
})
export type SourcingOffersOutput = z.infer<typeof sourcingOffersOutputSchema>

// ---------------------------------------------------------------------------
// Requêtes API — recherches et offres
// ---------------------------------------------------------------------------

/**
 * Une recherche part d'une demande existante (cotation logistique ou demande de
 * pièce flotte) OU d'une saisie libre. Le service exige au moins un `partName`
 * exploitable : si un rattachement est fourni, le snapshot en est déduit.
 */
export const sourcingSearchCreateSchema = z.object({
  quoteRequestId: z.string().min(1).optional(),
  partRequestId: z.string().min(1).optional(),
  partName: z.string().min(2).max(160).optional(),
  oemReference: z.string().max(80).optional(),
  vehicleBrand: z.string().max(60).optional(),
  vehicleModel: z.string().max(60).optional(),
  vehicleYear: z.number().int().min(1950).max(2100).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
})
export type SourcingSearchCreateInput = z.infer<typeof sourcingSearchCreateSchema>

export const sourcingIdParamsSchema = z.object({ id: z.string().min(1) })

export const adminSourcingListQuerySchema = z.object({
  status: sourcingSearchStatusSchema.optional(),
  quoteRequestId: z.string().min(1).optional(),
  q: z.string().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})
export type AdminSourcingListQuery = z.infer<typeof adminSourcingListQuerySchema>

/** Arbitrage ops sur une offre : shortlist, rejet, note, mode forcé, prix confirmé. */
export const offerUpdateSchema = z.object({
  status: sourcingOfferStatusSchema.optional(),
  opsNote: z.string().max(1000).nullable().optional(),
  chosenMode: logisticsModeSchema.nullable().optional(),
  priceConfirmed: z.boolean().optional(),
  priceAmount: z.number().min(0).nullable().optional(),
  priceCurrency: z.string().max(8).nullable().optional(),
  leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  weightKg: z.number().min(0).max(5000).nullable().optional(),
})
export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>

/** Génération du bon de commande depuis une offre retenue. */
export const offerToPurchaseOrderSchema = z.object({
  destinationId: z.string().min(1).optional(),
  quantite: z.number().int().min(1).max(999).optional(),
  tauxChange: z.number().int().min(1).optional(),
  notes: z.string().max(1000).optional(),
})
export type OfferToPurchaseOrderInput = z.infer<typeof offerToPurchaseOrderSchema>

// ---------------------------------------------------------------------------
// Requêtes API — expéditions
// ---------------------------------------------------------------------------

export const shipmentCreateSchema = z.object({
  purchaseOrderId: z.string().min(1).optional(),
  quoteRequestId: z.string().min(1).optional(),
  carrier: shipmentCarrierSchema.default('TRANSITAIRE'),
  carrierOther: z.string().max(80).optional(),
  trackingNumber: z.string().max(80).optional(),
  mode: logisticsModeSchema.default('AIR_STANDARD'),
  originCountry: z.string().max(60).optional(),
  originCity: z.string().max(60).optional(),
  etaAt: z.string().datetime().optional(),
  weightKg: z.number().min(0).max(5000).optional(),
  volumeDm3: z.number().min(0).max(100000).optional(),
  notes: z.string().max(1000).optional(),
})
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>

export const shipmentUpdateSchema = z.object({
  carrier: shipmentCarrierSchema.optional(),
  carrierOther: z.string().max(80).nullable().optional(),
  trackingNumber: z.string().max(80).nullable().optional(),
  mode: logisticsModeSchema.optional(),
  originCountry: z.string().max(60).nullable().optional(),
  originCity: z.string().max(60).nullable().optional(),
  etaAt: z.string().datetime().nullable().optional(),
  weightKg: z.number().min(0).max(5000).nullable().optional(),
  volumeDm3: z.number().min(0).max(100000).nullable().optional(),
  freightCostFcfa: z.number().int().min(0).nullable().optional(),
  customsCostFcfa: z.number().int().min(0).nullable().optional(),
  lastMileCostFcfa: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
})
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>

export const shipmentTransitionSchema = z.object({
  toStatus: shipmentStatusSchema,
  label: z.string().max(160).optional(),
  location: z.string().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(1000).optional(),
})
export type ShipmentTransitionInput = z.infer<typeof shipmentTransitionSchema>

export const adminShipmentListQuerySchema = z.object({
  status: shipmentStatusSchema.optional(),
  carrier: shipmentCarrierSchema.optional(),
  q: z.string().max(120).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})
export type AdminShipmentListQuery = z.infer<typeof adminShipmentListQuerySchema>

/** Lecture publique d'une expédition : référence + jeton, comme les cotations. */
export const shipmentPublicLookupSchema = z.object({ t: z.string().min(8).max(120) })

export const shipmentReferenceParamsSchema = z.object({ reference: z.string().min(4).max(40) })
