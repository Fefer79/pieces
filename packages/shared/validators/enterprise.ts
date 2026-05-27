import { z } from 'zod'

export const vehicleUsageTypeSchema = z.enum([
  'TRANSPORT',
  'CHANTIER',
  'LIVRAISON',
  'DIRECTION',
  'AUTRE',
])

export const enterpriseMemberRoleSchema = z.enum([
  'OWNER',
  'MANAGER',
  'MECHANIC',
  'ACCOUNTANT',
])

export const createEnterpriseSchema = z.object({
  name: z.string().min(2, 'Le nom est requis'),
  commune: z.string().min(1, 'La commune est requise'),
  address: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  rccm: z.string().optional(),
})

export const inviteMemberSchema = z.object({
  phone: z
    .string()
    .regex(/^\+225\d{10}$/, 'Format attendu : +225XXXXXXXXXX')
    .optional(),
  email: z.string().email().optional(),
  role: enterpriseMemberRoleSchema.default('MECHANIC'),
}).refine((d) => Boolean(d.phone || d.email), {
  message: 'phone ou email requis',
})

export const fleetVehicleSchema = z.object({
  brand: z.string().min(1, 'La marque est requise'),
  model: z.string().min(1, 'Le modèle est requis'),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  vin: z
    .string()
    .length(17)
    .regex(/^[A-HJ-NPR-Z0-9]{17}$/i)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  plate: z.string().min(1).max(20).optional(),
  engine: z.string().max(60).optional(),
  mileage: z.number().int().nonnegative().optional(),
  usageType: vehicleUsageTypeSchema.optional(),
  groupName: z.string().max(80).optional(),
  photoUrl: z.string().url().optional(),
})

export const updateVehicleSchema = fleetVehicleSchema.partial()

export const updateMileageSchema = z.object({
  mileage: z.number().int().nonnegative(),
})

export const csvImportRowSchema = fleetVehicleSchema
