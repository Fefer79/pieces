import { z } from 'zod'

export const crmSubjectSchema = z.enum(['USER', 'VENDOR'])

export const crmInteractionTypeSchema = z.enum([
  'NOTE',
  'APPEL',
  'WHATSAPP',
  'VISITE',
  'EMAIL',
  'RELANCE',
])

export const crmTaskStatusSchema = z.enum(['A_FAIRE', 'FAIT', 'ANNULE'])

// Segments calculés côté service (le pipeline client est comportemental,
// pas un statut stocké). Voir admin.service.ts / crm.service.ts.
export const crmClientSegmentSchema = z.enum([
  'nouveau',
  'actif',
  'fidele',
  'a_risque',
  'inactif',
])

export const crmVendorSegmentSchema = z.enum([
  'actif',
  'sans_commande_30j',
  'fiche_incomplete',
  'litiges_ouverts',
])

export const createCrmInteractionSchema = z.object({
  subject: crmSubjectSchema,
  subjectId: z.string().uuid(),
  type: crmInteractionTypeSchema,
  details: z.string().max(2000).optional().nullable(),
})

export const createCrmTaskSchema = z.object({
  subject: crmSubjectSchema,
  subjectId: z.string().uuid(),
  titre: z.string().min(1).max(200),
  notes: z.string().max(2000).optional().nullable(),
  echeanceLe: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
})

export const updateCrmTaskSchema = z.object({
  titre: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional().nullable(),
  statut: crmTaskStatusSchema.optional(),
  echeanceLe: z.string().datetime().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
})

export const crmTasksQuerySchema = z.object({
  statut: crmTaskStatusSchema.optional(),
  assigneeId: z.string().uuid().optional(),
  subject: crmSubjectSchema.optional(),
  subjectId: z.string().uuid().optional(),
  due: z.enum(['today', 'overdue', 'upcoming']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const createCrmTagSchema = z.object({
  nom: z.string().min(1).max(60),
  couleur: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
})

export const crmTagAssignSchema = z.object({
  subject: crmSubjectSchema,
  subjectId: z.string().uuid(),
})

export const crmRelanceWhatsAppSchema = z.object({
  subject: crmSubjectSchema,
  subjectId: z.string().uuid(),
  message: z.string().min(1).max(1000),
})

export const crmTimelineParamsSchema = z.object({
  subject: crmSubjectSchema,
  subjectId: z.string().uuid(),
})

export const crmTimelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const crmTaskParamsSchema = z.object({
  id: z.string().uuid(),
})

export const crmTagParamsSchema = z.object({
  id: z.string().uuid(),
})

export type CreateCrmInteractionInput = z.infer<typeof createCrmInteractionSchema>
export type CreateCrmTaskInput = z.infer<typeof createCrmTaskSchema>
export type UpdateCrmTaskInput = z.infer<typeof updateCrmTaskSchema>
export type CrmTasksQuery = z.infer<typeof crmTasksQuerySchema>
export type CreateCrmTagInput = z.infer<typeof createCrmTagSchema>
export type CrmTagAssignInput = z.infer<typeof crmTagAssignSchema>
export type CrmRelanceWhatsAppInput = z.infer<typeof crmRelanceWhatsAppSchema>
export type CrmTimelineQuery = z.infer<typeof crmTimelineQuerySchema>
