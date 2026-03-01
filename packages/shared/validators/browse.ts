import { z } from 'zod'

export const vinDecodeSchema = z.object({
  vin: z.string().length(17, 'Le VIN doit contenir exactement 17 caractères').regex(/^[A-HJ-NPR-Z0-9]{17}$/i, 'Format VIN invalide'),
})

export const createVehicleSchema = z.object({
  brand: z.string().min(1, 'La marque est requise'),
  model: z.string().min(1, 'Le modèle est requis'),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/i).optional(),
})
