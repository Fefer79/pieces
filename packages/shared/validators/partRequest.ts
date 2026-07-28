import { z } from 'zod'

export const partRequestStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'REVIEWING',
  'APPROVED',
  'REJECTED',
  'CONVERTED',
  'CANCELLED',
])

export const partRequestUrgencySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])

export const partRequestSourceSchema = z.enum(['LOCAL', 'AIR', 'CARGO', 'ANY'])

export const createPartRequestSchema = z.object({
  vehicleId: z.string().uuid('Véhicule invalide'),
  description: z.string().max(2000, '2000 caractères maximum').optional(),
  partName: z.string().min(1, 'Le nom de la pièce est requis').max(200),
  category: z.string().max(100).optional(),
  oemReference: z.string().max(100).optional(),
  urgency: partRequestUrgencySchema.default('NORMAL'),
  preferredSource: partRequestSourceSchema.default('ANY'),
  maxBudget: z.number().int().nonnegative().optional(),
})

export const updatePartRequestSchema = createPartRequestSchema.partial().extend({
  // Le véhicule n'est pas déplaçable une fois la demande créée.
  vehicleId: z.never().optional(),
})

export const submitPartRequestSchema = z.object({})

export const approvePartRequestSchema = z.object({
  note: z.string().max(500).optional(),
})

export const rejectPartRequestSchema = z.object({
  reason: z.string().min(1, 'Le motif de refus est requis').max(500),
})

export const convertPartRequestSchema = z.object({
  source: partRequestSourceSchema,
  catalogItemId: z.string().uuid().optional(),
  vendorId: z.string().uuid().optional(),
  estimatedPrice: z.number().int().nonnegative().optional(),
  deliveryCommune: z.string().max(80).optional(),
})

export const addPartRequestPhotoSchema = z.object({
  position: z.number().int().min(0).default(0),
})

/** Matrice d'arbitrage logistique — tous les prix sont optionnels (lecture seule). */
export const partRequestMatrixSchema = z.object({
  localPrice: z.number().int().nonnegative().optional(),
  importPrice: z.number().int().nonnegative().optional(),
  prePositionedPrice: z.number().int().nonnegative().optional(),
  localAvailable: z.boolean().optional(),
  localDelayDays: z.number().min(0).max(90).optional(),
  weightKg: z.number().positive().max(3000).optional(),
  volumeDm3: z.number().positive().max(20000).optional(),
  downtimeCostPerDay: z.number().int().nonnegative().max(1_000_000).optional(),
})
