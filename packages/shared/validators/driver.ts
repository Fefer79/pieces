import { z } from 'zod'
import { phoneSchema } from './auth'

export const driverStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE'])

export const createDriverSchema = z.object({
  name: z.string().min(2, 'Le nom est requis').max(120),
  phone: phoneSchema,
  licenseNumber: z.string().max(40).optional(),
  licenseCategory: z.string().max(20).optional(),
  photoUrl: z.string().url().optional(),
  hiredAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
})

export const updateDriverSchema = createDriverSchema.partial().extend({
  status: driverStatusSchema.optional(),
})

export const assignVehicleSchema = z.object({
  // null/absent = désaffecter (clôt l'affectation active sans en ouvrir une nouvelle).
  vehicleId: z.string().uuid().nullable().optional(),
})

// Date au format YYYY-MM-DD (jour du relevé).
const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide (AAAA-MM-JJ)')

export const driverDailyRecordSchema = z.object({
  date: dayString,
  revenue: z.number().int().nonnegative().default(0),
  fuelCost: z.number().int().nonnegative().default(0),
  otherExpenses: z.number().int().nonnegative().default(0),
  kmDriven: z.number().int().nonnegative().optional(),
  vehicleId: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
})

export const driverIncidentTypeSchema = z.enum([
  'ACCIDENT',
  'INFRACTION',
  'BREAKDOWN',
  'COMPLAINT',
  'OTHER',
])

export const driverIncidentSeveritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH'])

export const createIncidentSchema = z.object({
  type: driverIncidentTypeSchema,
  severity: driverIncidentSeveritySchema.default('LOW'),
  date: dayString,
  description: z.string().max(500).optional(),
  costEstimate: z.number().int().nonnegative().optional(),
  vehicleId: z.string().uuid().optional(),
})

export const driverAnalyticsQuerySchema = z.object({
  // Fenêtre d'analyse en jours (défaut 30).
  days: z.coerce.number().int().min(1).max(365).optional(),
})
