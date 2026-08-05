import { z } from 'zod'
import { BUSINESS_UNITS } from '../constants/erp-rbac'

// ---------------------------------------------------------------------------
// Cockpit — lecture des trois lignes d'activité
// ---------------------------------------------------------------------------

export const businessUnitSchema = z.enum(BUSINESS_UNITS)

export const cockpitQuerySchema = z.object({
  businessUnit: businessUnitSchema.optional(),
  /** Nombre de mois d'historique dans la série de chiffre d'affaires. */
  months: z.coerce.number().int().min(1).max(24).default(6),
})

export type CockpitQuery = z.infer<typeof cockpitQuerySchema>
