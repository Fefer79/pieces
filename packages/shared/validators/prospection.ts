import { z } from 'zod'
import {
  PROSPECTION_INTERVIEW_STATUSES,
  PROSPECTION_CONSENT_METHODS,
} from '../constants/prospection-script'

export const prospectionInterviewStatusSchema = z.enum(PROSPECTION_INTERVIEW_STATUSES)
export const prospectionConsentMethodSchema = z.enum(PROSPECTION_CONSENT_METHODS)
export const prospectionAnswerSourceSchema = z.enum(['MANUEL', 'TRANSCRIPTION', 'IA'])

/**
 * Un entretien se rattache à un prospect (VendorContact du CRM) OU à un vendeur
 * déjà onboardé — au moins l'un des deux.
 */
export const createProspectionInterviewSchema = z
  .object({
    prospectId: z.string().min(1).optional().nullable(),
    vendorId: z.string().min(1).optional().nullable(),
  })
  .refine((d) => Boolean(d.prospectId) || Boolean(d.vendorId), {
    message: 'Rattachez l’entretien à un prospect ou à un vendeur',
    path: ['prospectId'],
  })

/**
 * Consentement du vendeur — préalable obligatoire à tout enregistrement audio ou
 * transcription. `scriptText` est la phrase réellement lue (gelée côté serveur),
 * `acknowledged` doit être `true`.
 */
export const recordProspectionConsentSchema = z.object({
  method: prospectionConsentMethodSchema,
  scriptText: z.string().min(10).max(2000),
  acknowledged: z.literal(true),
})

export const prospectionAnswerSchema = z.object({
  text: z.string().max(4000),
  source: prospectionAnswerSourceSchema.default('MANUEL'),
})

export const updateProspectionInterviewSchema = z.object({
  status: prospectionInterviewStatusSchema.optional(),
  notes: z.string().max(20000).optional().nullable(),
  answers: z.record(z.string().min(1).max(80), prospectionAnswerSchema).optional(),
  startedAt: z.string().datetime().optional().nullable(),
  endedAt: z.string().datetime().optional().nullable(),
})

/**
 * Fragment de transcription poussé depuis la dictée du terminal (moteur de
 * reconnaissance vocale iOS / navigateur). `replace: true` réécrit tout le
 * transcript, sinon on concatène.
 */
export const appendProspectionTranscriptSchema = z.object({
  text: z.string().min(1).max(20000),
  source: z.string().max(40).default('ios-speech'),
  replace: z.boolean().default(false),
  segments: z
    .array(
      z.object({
        text: z.string().max(4000),
        at: z.number().nonnegative().optional(),
      }),
    )
    .max(2000)
    .optional(),
})

export const applyProspectionInterviewSchema = z.object({
  /** Champs du prospect à écraser avec les réponses extraites (sinon : ne complète que les vides). */
  overwrite: z.boolean().default(false),
})

export const prospectionInterviewParamsSchema = z.object({
  id: z.string().min(1),
})

export const prospectionInterviewListQuerySchema = z.object({
  scope: z.enum(['mine', 'all']).default('mine'),
  status: prospectionInterviewStatusSchema.optional(),
  prospectId: z.string().optional(),
  vendorId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type CreateProspectionInterviewInput = z.infer<typeof createProspectionInterviewSchema>
export type RecordProspectionConsentInput = z.infer<typeof recordProspectionConsentSchema>
export type UpdateProspectionInterviewInput = z.infer<typeof updateProspectionInterviewSchema>
export type AppendProspectionTranscriptInput = z.infer<typeof appendProspectionTranscriptSchema>
export type ApplyProspectionInterviewInput = z.infer<typeof applyProspectionInterviewSchema>
export type ProspectionInterviewListQuery = z.infer<typeof prospectionInterviewListQuerySchema>
