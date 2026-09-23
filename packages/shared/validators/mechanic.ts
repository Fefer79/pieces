import { z } from 'zod'
import { phoneSchema } from './auth'
import { MECHANIC_SPECIALTIES } from '../constants/mechanic-specialties'

export const mechanicSpecialtySchema = z.enum(MECHANIC_SPECIALTIES)

export const registerMechanicSchema = z.object({
  name: z.string().min(2).max(100),
  phone: phoneSchema,
  commune: z.string().max(100).optional(),
  address: z.string().max(255).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  specialties: z.array(mechanicSpecialtySchema).max(MECHANIC_SPECIALTIES.length).default([]),
  bio: z.string().max(500).optional(),
})

// Le téléphone reste hors du périmètre modifiable en libre-service : c'est
// l'identifiant unique de la fiche, un changement passe par la modération.
export const updateMechanicSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    commune: z.string().max(100).optional(),
    address: z.string().max(255).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    specialties: z.array(mechanicSpecialtySchema).max(MECHANIC_SPECIALTIES.length).optional(),
    bio: z.string().max(500).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ à modifier' })

export const suspendMechanicSchema = z.object({
  reason: z.string().min(3).max(300),
})

export const mechanicSearchQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(1).max(100).optional(),
  commune: z.string().max(100).optional(),
  specialty: mechanicSpecialtySchema.optional(),
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export const createMechanicReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
})

export const mechanicParamsSchema = z.object({
  id: z.string().uuid(),
})
