import { z } from 'zod'

// Validateurs du socle ERP interne (erp.pieces.ci).
//
// ⚠ `zodToFastify()` convertit ces schémas en JSON Schema pour Fastify, ce qui
// PERD les `.refine()` / `.superRefine()`. Les règles composites (au moins un
// champ fourni sur un PATCH, cohérence relatedType/relatedId) sont donc
// revalidées dans le service, qui reste l'autorité.

export const staffRoleSchema = z.enum([
  'DIRECTION',
  'COMMERCIAL',
  'COMPTABLE',
  'ACHETEUR',
  'MAGASINIER',
  'OPS_LOGISTIQUE',
  'SUPPORT',
])

export const businessUnitSchema = z.enum(['MARKETPLACE', 'FLOTTE', 'LOGISTIQUE'])

export const taskStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'])

export const taskPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

/**
 * Types d'entités auxquelles une tâche ou une note peut être rattachée.
 *
 * Liste fermée volontairement : le rattachement est polymorphe en base
 * (`relatedType` + `relatedId`, sans FK), donc c'est ici qu'on empêche
 * l'invention de types au fil de l'eau.
 */
export const erpRelatedTypeSchema = z.enum([
  'Vendor',
  'VendorContact',
  'Enterprise',
  'User',
  'Order',
  'Invoice',
  'CatalogItem',
  'PartRequest',
  'LogisticsQuoteRequest',
])

// ---- Membres de l'équipe -------------------------------------------------

export const createStaffMemberSchema = z.object({
  userId: z.string().uuid(),
  staffRole: staffRoleSchema,
  businessUnits: z.array(businessUnitSchema).default([]),
  title: z.string().min(2).max(80).optional(),
  hiredAt: z.string().datetime().optional(),
})

export const updateStaffMemberSchema = z.object({
  staffRole: staffRoleSchema.optional(),
  businessUnits: z.array(businessUnitSchema).optional(),
  title: z.string().min(2).max(80).nullable().optional(),
  active: z.boolean().optional(),
  hiredAt: z.string().datetime().nullable().optional(),
})

export const staffListQuerySchema = z.object({
  staffRole: staffRoleSchema.optional(),
  active: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export const staffParamsSchema = z.object({
  staffId: z.string().min(1),
})

// ---- Tâches --------------------------------------------------------------

export const createTaskSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional(),
  priority: taskPrioritySchema.default('NORMAL'),
  dueAt: z.string().datetime().optional(),
  businessUnit: businessUnitSchema.optional(),
  assigneeStaffId: z.string().min(1).optional(),
  relatedType: erpRelatedTypeSchema.optional(),
  relatedId: z.string().min(1).optional(),
})

export const updateTaskSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  businessUnit: businessUnitSchema.nullable().optional(),
  assigneeStaffId: z.string().min(1).nullable().optional(),
})

export const taskListQuerySchema = z.object({
  status: taskStatusSchema.optional(),
  priority: taskPrioritySchema.optional(),
  businessUnit: businessUnitSchema.optional(),
  assigneeStaffId: z.string().min(1).optional(),
  /** Raccourci « mes tâches » — prioritaire sur `assigneeStaffId`. */
  mine: z.coerce.boolean().optional(),
  /** Ne remonte que les tâches en retard (échéance dépassée, non clôturées). */
  overdue: z.coerce.boolean().optional(),
  relatedType: erpRelatedTypeSchema.optional(),
  relatedId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export const taskParamsSchema = z.object({
  taskId: z.string().min(1),
})

// ---- Notes ---------------------------------------------------------------

export const createNoteSchema = z.object({
  body: z.string().min(1).max(4000),
  relatedType: erpRelatedTypeSchema,
  relatedId: z.string().min(1),
  pinned: z.boolean().default(false),
})

export const noteListQuerySchema = z.object({
  relatedType: erpRelatedTypeSchema,
  relatedId: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

// ---- Cockpit -------------------------------------------------------------

export const cockpitQuerySchema = z.object({
  businessUnit: businessUnitSchema.optional(),
  /** Nombre de mois d'historique dans la série de chiffre d'affaires. */
  months: z.coerce.number().int().min(1).max(24).default(6),
})

export type StaffRoleInput = z.infer<typeof staffRoleSchema>
export type BusinessUnitInput = z.infer<typeof businessUnitSchema>
export type ErpRelatedType = z.infer<typeof erpRelatedTypeSchema>
export type CreateStaffMemberInput = z.infer<typeof createStaffMemberSchema>
export type UpdateStaffMemberInput = z.infer<typeof updateStaffMemberSchema>
export type StaffListQuery = z.infer<typeof staffListQuerySchema>
export type CreateTaskInput = z.infer<typeof createTaskSchema>
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>
export type TaskListQuery = z.infer<typeof taskListQuerySchema>
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type NoteListQuery = z.infer<typeof noteListQuerySchema>
export type CockpitQuery = z.infer<typeof cockpitQuerySchema>
