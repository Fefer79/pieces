import { z } from 'zod'
import { CURRENCY_CODES } from '../constants/currencies'
import { SHIPMENT_CARRIERS, SHIPMENT_STATUSES } from '../constants/carriers'

/**
 * Sourcing & expéditions. Le mode nominal est la SAISIE MANUELLE : l'ops colle
 * les liens des pages vendeur qu'il a trouvées, puis complète ligne par ligne.
 *
 * Règle de conception : à la création d'une offre, seule `url` est requise.
 * Toute validation supplémentaire (prix obligatoire, pays obligatoire) tuerait
 * l'usage — on ne colle pas dix liens en remplissant dix formulaires.
 */

export const sourcingOriginSchema = z.enum(['MANUAL', 'AGENT'])
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
export const currencyCodeSchema = z.enum(CURRENCY_CODES)
export const shipmentCarrierSchema = z.enum(SHIPMENT_CARRIERS)
export const shipmentStatusSchema = z.enum(SHIPMENT_STATUSES)
/**
 * Modes d'acheminement d'une offre sourcée. `PRE_POSITIONED` en est absent
 * volontairement : une offre qu'on va acheter n'est, par définition, pas déjà
 * dans notre stock consigné — et `purchaseOrderModeSchema` (validators/stock)
 * ne l'accepte pas non plus.
 */
export const sourcingModeSchema = z.enum([
  'LOCAL',
  'AIR_NOW',
  'AIR_STANDARD',
  'AIR_ECONOMY',
  'SEA_LCL',
])
export const partConditionSchema = z.enum(['NEW', 'USED', 'REFURBISHED'])
export const partSourceSchema = z.enum(['OEM', 'AFTERMARKET', 'COMPATIBLE'])

// ---------------------------------------------------------------------------
// Dossier de sourcing
// ---------------------------------------------------------------------------

/**
 * ⚠ `LogisticsQuoteRequest.id` est un CUID, `PartRequest.id` un UUID : ne pas
 * mettre `.uuid()` sur `quoteRequestId`, la validation rejetterait tout.
 */
export const sourcingSearchCreateSchema = z
  .object({
    quoteRequestId: z.string().min(1).max(64).optional(),
    partRequestId: z.string().uuid().optional(),
    origin: sourcingOriginSchema.default('MANUAL'),
  })
  .refine((v) => !!v.quoteRequestId || !!v.partRequestId, {
    message: 'Rattachez le dossier à une demande de cotation ou à une demande de pièce',
  })

export const adminSourcingListQuerySchema = z.object({
  status: sourcingSearchStatusSchema.optional(),
  origin: sourcingOriginSchema.optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

// ---------------------------------------------------------------------------
// Offres
// ---------------------------------------------------------------------------

/** Le geste central : coller des liens de pages vendeur, un par ligne. */
export const offerUrlsSchema = z.object({
  urls: z.array(z.string().url().max(2000)).min(1).max(20),
})

/**
 * Champs complétables d'une offre. Tous optionnels : une offre fraîchement
 * collée n'a qu'une URL, et se remplit au fil de l'eau.
 */
const offerFieldsShape = {
  supplierName: z.string().max(160).nullable().optional(),
  channel: sourcingChannelSchema.optional(),
  country: z.string().max(2).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  title: z.string().max(300).nullable().optional(),
  brand: z.string().max(120).nullable().optional(),
  oemReference: z.string().max(80).nullable().optional(),
  condition: partConditionSchema.nullable().optional(),
  source: partSourceSchema.nullable().optional(),
  priceAmount: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  priceCurrency: currencyCodeSchema.optional(),
  priceConfirmed: z.boolean().optional(),
  shippingAmount: z.number().nonnegative().max(1_000_000_000).nullable().optional(),
  moq: z.number().int().min(1).max(100_000).nullable().optional(),
  leadTimeDays: z.number().int().min(0).max(365).nullable().optional(),
  weightKg: z.number().nonnegative().max(5_000).nullable().optional(),
  availability: z.string().max(160).nullable().optional(),
  contactPhone: z.string().max(40).nullable().optional(),
  contactEmail: z.string().max(200).nullable().optional(),
  contactWhatsapp: z.string().max(40).nullable().optional(),
  status: sourcingOfferStatusSchema.optional(),
  opsNote: z.string().max(2000).nullable().optional(),
  chosenMode: sourcingModeSchema.nullable().optional(),
}

export const offerCreateSchema = z.object({
  url: z.string().url().max(2000),
  ...offerFieldsShape,
})

export const offerUpdateSchema = z.object(offerFieldsShape)

/** Passage à la commande : seul le point de livraison est encore ouvert. */
export const offerToPurchaseOrderSchema = z.object({
  destinationId: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).optional(),
})

// ---------------------------------------------------------------------------
// Expéditions
// ---------------------------------------------------------------------------

export const shipmentCreateSchema = z.object({
  purchaseOrderId: z.string().uuid().optional(),
  quoteRequestId: z.string().min(1).max(64).optional(),
  carrier: shipmentCarrierSchema,
  carrierOther: z.string().max(120).optional(),
  trackingNumber: z.string().max(120).optional(),
  mode: sourcingModeSchema.default('AIR_STANDARD'),
  originCountry: z.string().max(2).optional(),
  originCity: z.string().max(120).optional(),
  etaAt: z.string().datetime().optional(),
  weightKg: z.number().nonnegative().max(50_000).optional(),
  volumeDm3: z.number().nonnegative().max(500_000).optional(),
  freightCostFcfa: z.number().int().min(0).optional(),
  customsCostFcfa: z.number().int().min(0).optional(),
  lastMileCostFcfa: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
})

export const shipmentUpdateSchema = z.object({
  trackingNumber: z.string().max(120).nullable().optional(),
  etaAt: z.string().datetime().nullable().optional(),
  weightKg: z.number().nonnegative().max(50_000).nullable().optional(),
  volumeDm3: z.number().nonnegative().max(500_000).nullable().optional(),
  freightCostFcfa: z.number().int().min(0).nullable().optional(),
  customsCostFcfa: z.number().int().min(0).nullable().optional(),
  lastMileCostFcfa: z.number().int().min(0).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
})

export const shipmentTransitionSchema = z.object({
  toStatus: shipmentStatusSchema,
  label: z.string().max(200).optional(),
  location: z.string().max(160).optional(),
  occurredAt: z.string().datetime().optional(),
  note: z.string().max(1000).optional(),
})

export const adminShipmentListQuerySchema = z.object({
  status: shipmentStatusSchema.optional(),
  carrier: shipmentCarrierSchema.optional(),
  q: z.string().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

// ---------------------------------------------------------------------------
// Sortie de l'agent (lot 5) — clés en français, comme enrichmentSourcingOutputSchema
// ---------------------------------------------------------------------------

export const sourcingOffersOutputSchema = z.object({
  offres: z.array(
    z.object({
      url: z.string(),
      site: z.string(),
      fournisseur: z.string().nullable(),
      canal: sourcingChannelSchema,
      pays: z.string().nullable(),
      ville: z.string().nullable(),
      titre: z.string(),
      marque: z.string().nullable(),
      reference_oem: z.string().nullable(),
      etat: z.enum(['NEUF', 'OCCASION', 'REUSINE']).nullable(),
      origine_piece: z.enum(['OEM', 'AFTERMARKET', 'COMPATIBLE']).nullable(),
      /** null si le prix n'est pas visible sur la page — jamais inventé. */
      prix: z.number().nullable(),
      devise: z.string().nullable(),
      frais_port: z.number().nullable().optional(),
      delai_jours: z.number().nullable().optional(),
      poids_kg: z.number().nullable().optional(),
      disponibilite: z.string().nullable().optional(),
      confiance: z.number().min(0).max(1),
    }),
  ),
})

export type SourcingSearchCreateInput = z.infer<typeof sourcingSearchCreateSchema>
export type AdminSourcingListQuery = z.infer<typeof adminSourcingListQuerySchema>
export type OfferUrlsInput = z.infer<typeof offerUrlsSchema>
export type OfferCreateInput = z.infer<typeof offerCreateSchema>
export type OfferUpdateInput = z.infer<typeof offerUpdateSchema>
export type OfferToPurchaseOrderInput = z.infer<typeof offerToPurchaseOrderSchema>
export type ShipmentCreateInput = z.infer<typeof shipmentCreateSchema>
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>
export type ShipmentTransitionInput = z.infer<typeof shipmentTransitionSchema>
export type AdminShipmentListQuery = z.infer<typeof adminShipmentListQuerySchema>
export type SourcingOffersOutput = z.infer<typeof sourcingOffersOutputSchema>
