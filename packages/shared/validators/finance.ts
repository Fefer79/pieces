import { z } from 'zod'

// ---------------------------------------------------------------------------
// ERP — Finance (cockpit & exports comptables, lecture seule)
// ---------------------------------------------------------------------------

// Période mensuelle 'YYYY-MM' (même format que periodeSchema d'equipe)
export const financePeriodeSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'La période doit être au format YYYY-MM' })

export const financeOverviewQuerySchema = z.object({
  periode: financePeriodeSchema.optional(),
})

export const financeMonthlyQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional(),
})

export const financeVendorsQuerySchema = z.object({
  periode: financePeriodeSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const financeExportQuerySchema = z.object({
  periode: financePeriodeSchema,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FinanceOverviewQuery = z.infer<typeof financeOverviewQuerySchema>
export type FinanceMonthlyQuery = z.infer<typeof financeMonthlyQuerySchema>
export type FinanceVendorsQuery = z.infer<typeof financeVendorsQuerySchema>
export type FinanceExportQuery = z.infer<typeof financeExportQuerySchema>
