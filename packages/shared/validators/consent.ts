import { z } from 'zod'

export const consentSchema = z.object({
  accepted: z.literal(true, { message: 'Le consentement doit être accepté' }),
})

export const deletionRequestSchema = z.object({
  reason: z.string().max(500).optional(),
})
