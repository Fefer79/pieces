import { z } from 'zod'

// ---------------------------------------------------------------------------
// ERP — Équipe & commissions
// ---------------------------------------------------------------------------

export const agentObjectiveMetricSchema = z.enum([
  'VENDEURS_GERES',
  'NOUVEAUX_VENDEURS',
  'PROSPECTS_CONCLUS',
  'PIECES_AJOUTEES',
  'INTERACTIONS_CRM',
  'TACHES_FAITES',
  'VISITES_TERRAIN',
])

export const agentCommissionStatusSchema = z.enum(['ESTIMEE', 'DUE', 'PAYEE', 'ANNULEE'])

// Période mensuelle 'YYYY-MM'
export const periodeSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'La période doit être au format YYYY-MM' })

// ---------------------------------------------------------------------------
// Membres & profils
// ---------------------------------------------------------------------------

export const equipeMembersQuerySchema = z.object({
  q: z.string().max(200).optional(),
  actif: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const equipeMemberParamsSchema = z.object({
  id: z.string().uuid(),
})

export const upsertTeamProfileSchema = z.object({
  fonction: z.string().max(120).optional().nullable(),
  tauxCommissionPct: z.number().int().min(0).max(100).optional(),
  actif: z.boolean().optional(),
  embaucheLe: z.string().datetime().optional().nullable(),
})

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

export const objectivesQuerySchema = z.object({
  periode: periodeSchema,
})

export const setObjectiveSchema = z.object({
  periode: periodeSchema,
  metrique: agentObjectiveMetricSchema,
  cible: z.number().int().min(1).max(100000),
})

export const objectiveParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Commissions
// ---------------------------------------------------------------------------

export const agentCommissionsQuerySchema = z.object({
  periode: periodeSchema.optional(),
  statut: agentCommissionStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const generateCommissionsSchema = z.object({
  periode: periodeSchema,
})

export const updateAgentCommissionSchema = z.object({
  montantFcfa: z.number().int().min(0).max(100000000).optional(),
  note: z.string().max(500).optional().nullable(),
})

export const agentCommissionParamsSchema = z.object({
  id: z.string().uuid(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EquipeMembersQuery = z.infer<typeof equipeMembersQuerySchema>
export type UpsertTeamProfileInput = z.infer<typeof upsertTeamProfileSchema>
export type ObjectivesQuery = z.infer<typeof objectivesQuerySchema>
export type SetObjectiveInput = z.infer<typeof setObjectiveSchema>
export type AgentCommissionsQuery = z.infer<typeof agentCommissionsQuerySchema>
export type GenerateCommissionsInput = z.infer<typeof generateCommissionsSchema>
export type UpdateAgentCommissionInput = z.infer<typeof updateAgentCommissionSchema>
