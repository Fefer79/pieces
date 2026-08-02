import { z } from 'zod'

// ---------------------------------------------------------------------------
// ERP — Marketing (campagnes WhatsApp ciblées via les segments CRM et les tags)
// ---------------------------------------------------------------------------

// Miroir des enums Prisma MarketingCampaignStatus / MarketingAudienceType.
export const marketingCampaignStatusSchema = z.enum([
  'BROUILLON',
  'PLANIFIEE',
  'EN_COURS',
  'TERMINEE',
  'ANNULEE',
])

export const marketingAudienceTypeSchema = z.enum(['SEGMENT_CLIENT', 'SEGMENT_VENDEUR', 'TAG'])

export const marketingCampaignsQuerySchema = z.object({
  statut: marketingCampaignStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const createCampaignSchema = z.object({
  nom: z.string().trim().min(1, { message: 'Le nom de la campagne est requis' }).max(120),
  message: z.string().trim().min(1, { message: 'Le message est requis' }).max(1000),
  audienceType: marketingAudienceTypeSchema,
  // Clé de segment (ex. 'a_risque', 'sans_commande_30j') ou id de tag CRM.
  audienceValue: z.string().trim().min(1, { message: "L'audience est requise" }).max(100),
  // Date d'envoi planifiée (ISO) ; absente = brouillon à lancer manuellement.
  scheduledAt: z.string().datetime().optional(),
})

export const marketingCampaignParamsSchema = z.object({
  id: z.string().uuid(),
})

export const previewAudienceQuerySchema = z.object({
  audienceType: marketingAudienceTypeSchema,
  audienceValue: z.string().trim().min(1).max(100),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarketingCampaignsQuery = z.infer<typeof marketingCampaignsQuerySchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type PreviewAudienceQuery = z.infer<typeof previewAudienceQuerySchema>
