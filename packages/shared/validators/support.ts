import { z } from 'zod'

// ---------------------------------------------------------------------------
// ERP — Support & SAV (litiges et retours, côté administration)
// ---------------------------------------------------------------------------

// Miroir exact des enums Prisma DisputeStatus / ReturnStatus.
export const supportDisputeStatusSchema = z.enum([
  'OPEN',
  'UNDER_REVIEW',
  'RESOLVED_BUYER',
  'RESOLVED_SELLER',
  'CLOSED',
])

export const supportReturnStatusSchema = z.enum([
  'REQUESTED',
  'ACCEPTED',
  'PICKED_UP',
  'INSPECTED',
  'REFUNDED',
  'REJECTED',
  'CANCELLED',
])

export const supportDisputesQuerySchema = z.object({
  statut: supportDisputeStatusSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const supportReturnsQuerySchema = z.object({
  statut: supportReturnStatusSchema.optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const supportIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const supportResolveDisputeSchema = z.object({
  inFavorOf: z.enum(['buyer', 'seller']),
  resolution: z.string().trim().min(1, { message: 'La résolution est requise' }).max(2000),
})

export const supportTransitionReturnSchema = z.object({
  statut: supportReturnStatusSchema,
  // Exigé côté service quand statut = REFUNDED (même règle que return.service).
  refundAmount: z.number().int().min(0).optional(),
  note: z.string().trim().max(2000).optional(),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SupportDisputesQuery = z.infer<typeof supportDisputesQuerySchema>
export type SupportReturnsQuery = z.infer<typeof supportReturnsQuerySchema>
export type SupportResolveDisputeInput = z.infer<typeof supportResolveDisputeSchema>
export type SupportTransitionReturnInput = z.infer<typeof supportTransitionReturnSchema>
