import { z } from 'zod'

export const vinDecodeSchema = z.object({
  vin: z.string().length(17, 'Le VIN doit contenir exactement 17 caractères').regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Format VIN invalide'),
})
