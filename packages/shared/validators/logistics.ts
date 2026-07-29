import { z } from 'zod'

// Validateurs des demandes de cotation logistique (logistique.pieces.ci).
//
// ⚠ `zodToFastify()` convertit ces schémas en JSON Schema pour Fastify, ce qui
// PERD les `.refine()` / `.superRefine()`. Les règles composites (normalisation
// du téléphone, cohérence des preuves) sont donc appliquées dans le service, qui
// reste l'autorité.

/** VIN ISO 3779 : 17 caractères, sans I, O ni Q (confusions avec 1 et 0). */
export const LOGISTICS_VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/i

/**
 * Saisie téléphone tolérante : indicatif optionnel, séparateurs libres.
 * La normalisation vers `+225XXXXXXXXXX` se fait côté serveur
 * (apps/api/src/lib/phone.ts).
 */
export const IVORIAN_PHONE_INPUT_REGEX = /^(?:\+?225)?[\s.\-()]*(?:\d[\s.\-()]*){9,10}$/

export const logisticsLeadStatusSchema = z.enum([
  'NEW',
  'CONTACTED',
  'QUOTING',
  'QUOTED',
  'WON',
  'LOST',
  'SPAM',
])

export const logisticsLeadSurfaceSchema = z.enum([
  'LANDING',
  'CALCULATEUR',
  'CAMPAIGN',
  'WHATSAPP',
  'REFERRAL',
  'APP',
  'FLEET',
])

export const logisticsCustomerTypeSchema = z.enum([
  'FLEET_VTC',
  'FLEET_COMPANY',
  'MINING_BTP',
  'INDIVIDUAL',
  'GARAGE',
  'DEALER',
  'IMPORTER',
  'OTHER',
])

export const logisticsPhotoKindSchema = z.enum(['PART', 'REGISTRATION_CARD', 'OTHER'])

export const leadCertaintyLevelSchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const createLogisticsQuoteRequestSchema = z.object({
  // Contact
  contactName: z.string().min(2).max(120),
  companyName: z.string().max(160).optional(),
  phone: z.string().regex(IVORIAN_PHONE_INPUT_REGEX, 'Numéro ivoirien invalide'),
  whatsapp: z.string().regex(IVORIAN_PHONE_INPUT_REGEX, 'Numéro WhatsApp invalide').optional(),
  email: z.string().email('Adresse e-mail invalide').max(160).optional(),
  commune: z.string().max(80).optional(),
  customerType: logisticsCustomerTypeSchema.default('OTHER'),
  fleetSize: z.number().int().min(0).max(100_000).optional(),

  // Pièce
  partName: z.string().min(2).max(200),
  partCategory: z.string().max(100).optional(),
  oemReference: z.string().max(100).optional(),
  quantity: z.number().int().min(1).max(999).default(1),
  partPriceHint: z.number().int().nonnegative().max(100_000_000).optional(),

  // Véhicule
  vin: z.string().regex(LOGISTICS_VIN_REGEX, 'Format VIN invalide (17 caractères)').optional(),
  vehicleBrand: z.string().max(80).optional(),
  vehicleModel: z.string().max(80).optional(),
  vehicleYear: z.number().int().min(1980).max(2100).optional(),
  energyType: z.enum(['ICE', 'EV', 'HYBRID']).optional(),
  vehicleImmobilized: z.boolean().default(false),

  // Rattachements — proposés par le client, TOUJOURS revérifiés côté serveur
  // contre le porteur du jeton (sinon on lit la flotte du voisin).
  enterpriseId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  partRequestId: z.string().uuid().optional(),

  // Provenance
  surface: logisticsLeadSurfaceSchema.default('LANDING'),
  campaign: z.string().max(120).optional(),

  // Conformité + anti-bot
  consent: z.literal(true),
  /** Epoch ms du montage du formulaire — une soumission trop rapide est un bot. */
  startedAt: z.number().int().optional(),
  /** Honeypot : rempli uniquement par les robots. */
  website: z.string().max(200).optional(),
})

export const logisticsPhotoUploadSchema = z.object({
  kind: logisticsPhotoKindSchema,
  position: z.number().int().min(0).default(0),
})

export const logisticsPublicLookupSchema = z.object({
  t: z.string().min(16).max(128),
})

export const adminLogisticsListQuerySchema = z.object({
  status: logisticsLeadStatusSchema.optional(),
  certaintyLevel: leadCertaintyLevelSchema.optional(),
  q: z.string().max(120).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})

export const adminUpdateLogisticsQuoteRequestSchema = z.object({
  status: logisticsLeadStatusSchema.optional(),
  opsNote: z.string().max(2000).optional(),
  assignedToUserId: z.string().uuid().nullable().optional(),
  lostReason: z.string().max(500).optional(),
})

export const enterpriseLogisticsListQuerySchema = z.object({
  status: logisticsLeadStatusSchema.optional(),
  vehicleId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
})

export type CreateLogisticsQuoteRequestInput = z.infer<
  typeof createLogisticsQuoteRequestSchema
>
export type AdminLogisticsListQuery = z.infer<typeof adminLogisticsListQuerySchema>
export type AdminUpdateLogisticsQuoteRequestInput = z.infer<
  typeof adminUpdateLogisticsQuoteRequestSchema
>
export type EnterpriseLogisticsListQuery = z.infer<typeof enterpriseLogisticsListQuerySchema>
