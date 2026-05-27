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

export const maintenanceKindSchema = z.enum([
  'OIL_CHANGE',
  'OIL_FILTER',
  'AIR_FILTER',
  'FUEL_FILTER',
  'CABIN_FILTER',
  'BRAKE_PADS_FRONT',
  'BRAKE_PADS_REAR',
  'TIMING_BELT',
  'TIRES',
  'COOLANT',
  'TRANSMISSION_FLUID',
  'OTHER',
])

export const createMaintenanceScheduleSchema = z.object({
  kind: maintenanceKindSchema,
  label: z.string().max(80).nullable().optional(),
  intervalKm: z.number().int().min(100).max(500_000),
  warningKm: z.number().int().min(0).max(50_000).optional(),
  lastDoneAtKm: z.number().int().nonnegative().nullable().optional(),
  lastDoneAt: z.string().datetime().nullable().optional(),
  enabled: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateMaintenanceScheduleSchema = createMaintenanceScheduleSchema.partial()

export const maintenanceScheduleParamsSchema = z.object({
  enterpriseId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  scheduleId: z.string().uuid(),
})

export const createMaintenanceCenterSchema = z.object({
  name: z.string().min(2).max(120),
  commune: z.string().max(80).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  contactPhone: z
    .string()
    .regex(/^\+225\d{10}$/, 'Format attendu : +225XXXXXXXXXX')
    .nullable()
    .optional(),
  deliveryDayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateMaintenanceCenterSchema = createMaintenanceCenterSchema.partial()

export const setVehicleHomeCenterSchema = z.object({
  homeCenterId: z.string().uuid().nullable(),
})

export const returnReasonSchema = z.enum([
  'DEFECTIVE',
  'WRONG_PART',
  'NOT_AS_DESCRIBED',
  'NO_LONGER_NEEDED',
  'OTHER',
])

export const returnStatusSchema = z.enum([
  'REQUESTED',
  'ACCEPTED',
  'PICKED_UP',
  'INSPECTED',
  'REFUNDED',
  'REJECTED',
  'CANCELLED',
])

export const createReturnOrderSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().nullable().optional(),
  reason: returnReasonSchema,
  description: z.string().max(2000).nullable().optional(),
  pickupAddress: z.string().max(500).nullable().optional(),
  pickupContactName: z.string().max(120).nullable().optional(),
  pickupContactPhone: z
    .string()
    .regex(/^\+225\d{10}$/, 'Format attendu : +225XXXXXXXXXX')
    .nullable()
    .optional(),
  evidence: z.array(z.string().url()).max(10).optional(),
})

export const transitionReturnSchema = z.object({
  toStatus: returnStatusSchema,
  resolutionNote: z.string().max(2000).nullable().optional(),
  refundAmount: z.number().int().min(0).nullable().optional(),
})

export const createBufferStockSchema = z.object({
  catalogItemId: z.string().uuid(),
  targetQty: z.number().int().min(1).max(100_000),
  currentQty: z.number().int().min(0).max(100_000).optional(),
  autoReplenish: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateBufferStockSchema = z.object({
  targetQty: z.number().int().min(0).max(100_000).optional(),
  currentQty: z.number().int().min(0).max(100_000).optional(),
  autoReplenish: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const adjustBufferStockSchema = z.object({
  delta: z.number().int(),
})

// ---------------------------------------------------------------------------
// Subscription packaging (Pro Flotte 3 niveaux — phase 1 fondations)
// ---------------------------------------------------------------------------

export const subscriptionTierSchema = z.enum(['FREE', 'PRO_FLOTTE', 'PRO_FLOTTE_PLUS'])
export const subscriptionStatusSchema = z.enum(['TRIALING', 'ACTIVE', 'SUSPENDED', 'CANCELLED'])
export const billingCycleSchema = z.enum(['MONTHLY', 'ANNUAL'])

export const createSubscriptionSchema = z.object({
  tier: subscriptionTierSchema,
  billingCycle: billingCycleSchema.default('MONTHLY'),
  startTrial: z.boolean().optional(),
  trialDays: z.number().int().min(1).max(90).optional(),
  notes: z.string().max(500).nullable().optional(),
})

export const updateSubscriptionSchema = z.object({
  tier: subscriptionTierSchema.optional(),
  status: subscriptionStatusSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  notes: z.string().max(500).nullable().optional(),
})
