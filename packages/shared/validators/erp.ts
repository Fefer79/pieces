import { z } from 'zod'

// Validateurs du socle ERP interne (erp.pieces.ci).
//
// ⚠ `zodToFastify()` perd les `.refine()` : toute règle composite est
// réappliquée dans le service, qui reste l'autorité.

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

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

export const staffListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  actif: z.enum(['true', 'false']).optional(),
})

export const staffCandidatesQuerySchema = z.object({
  q: z.string().trim().min(2, 'Deux caractères au minimum').max(120),
})

export const staffCreateSchema = z.object({
  userId: z.string().min(1, 'Utilisateur requis'),
  staffRole: staffRoleSchema,
  businessUnits: z.array(businessUnitSchema).max(3).default([]),
  title: z.string().trim().max(120).optional(),
  hiredAt: z.string().datetime().optional(),
})

export const staffUpdateSchema = z.object({
  staffRole: staffRoleSchema.optional(),
  businessUnits: z.array(businessUnitSchema).max(3).optional(),
  title: z.string().trim().max(120).nullable().optional(),
  active: z.boolean().optional(),
  hiredAt: z.string().datetime().nullable().optional(),
})

export const staffParamsSchema = z.object({
  id: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Recherche globale
// ---------------------------------------------------------------------------

/** Types d'objets atteignables depuis la barre de recherche. */
export const erpSearchKindSchema = z.enum([
  'compte',
  'vendeur',
  'entreprise',
  'piece',
  'commande',
  'sourcing',
  'expedition',
])

export const erpSearchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Deux caractères au minimum').max(120),
  /** Nombre de résultats par famille. */
  limit: z.coerce.number().int().min(1).max(10).default(5),
})

export type StaffListQuery = z.infer<typeof staffListQuerySchema>
export type StaffCandidatesQuery = z.infer<typeof staffCandidatesQuerySchema>
export type StaffCreateInput = z.infer<typeof staffCreateSchema>
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>
export type ErpSearchQuery = z.infer<typeof erpSearchQuerySchema>
export type ErpSearchKind = z.infer<typeof erpSearchKindSchema>
