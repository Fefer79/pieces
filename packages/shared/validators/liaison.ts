import { z } from 'zod'
import { phoneSchema } from './auth'
import { vendorTypeSchema, kycTypeSchema } from './vendor'
import { ABIDJAN_COMMUNES } from '../constants/communes'

// Onboarding minimal : seuls le nom de la boutique et le téléphone sont requis.
// Le vendeur est créé en PENDING_ACTIVATION ; KYC, localisation et zones de
// livraison peuvent être complétés plus tard (fiche vendeur / relance).
export const liaisonCreateVendorSchema = z
  .object({
    shopName: z.string().min(2).max(100),
    contactName: z.string().min(2).max(100).optional(),
    phone: phoneSchema,
    vendorType: vendorTypeSchema.default('INFORMAL'),
    documentNumber: z.string().min(5).max(50).optional(),
    kycType: kycTypeSchema.optional(),
    commune: z.enum(ABIDJAN_COMMUNES).optional(),
    address: z.string().min(2).max(255).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    deliveryZones: z.array(z.enum(ABIDJAN_COMMUNES)).default([]),
  })
  // Le KYC est facultatif, mais s'il est fourni le type doit correspondre au
  // type vendeur : FORMAL → RCCM, INFORMAL → CNI.
  .refine(
    (data) =>
      !data.documentNumber ||
      (data.vendorType === 'FORMAL' && data.kycType === 'RCCM') ||
      (data.vendorType === 'INFORMAL' && data.kycType === 'CNI'),
    {
      message:
        'Le type KYC doit correspondre au type vendeur : FORMAL → RCCM, INFORMAL → CNI',
      path: ['kycType'],
    },
  )
  // GPS : latitude et longitude vont de pair.
  .refine((data) => (data.lat == null) === (data.lng == null), {
    message: 'La latitude et la longitude doivent être fournies ensemble',
    path: ['lat'],
  })

export const liaisonUpdateVendorSchema = z.object({
  shopName: z.string().min(2).max(100).optional(),
  contactName: z.string().min(2).max(100).optional(),
  phone: phoneSchema.optional(),
  commune: z.enum(ABIDJAN_COMMUNES).optional(),
  address: z.string().min(2).max(255).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  deliveryZones: z.array(z.enum(ABIDJAN_COMMUNES)).optional(),
})

const liaisonFitmentSchema = z.object({
  brand: z.string().min(1).max(60),
  model: z.string().min(1).max(80).nullable().optional(),
  yearFrom: z.number().int().min(1950).max(2100).nullable().optional(),
  yearTo: z.number().int().min(1950).max(2100).nullable().optional(),
  engine: z.string().min(1).max(60).nullable().optional(),
}).refine(
  (v) => v.yearFrom == null || v.yearTo == null || v.yearFrom <= v.yearTo,
  { message: 'yearFrom doit être inférieur ou égal à yearTo', path: ['yearFrom'] },
)

export const liaisonCreatePartSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(80).optional(),
  oemReference: z.string().max(80).optional(),
  vehicleCompatibility: z.string().max(255).optional(),
  fitments: z.array(liaisonFitmentSchema).max(50).optional(),
  price: z.number().int().min(1).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']),
  warrantyValue: z.number().int().min(0).max(365).optional(),
  warrantyUnit: z.enum(['DAY', 'WEEK', 'MONTH']).optional(),
  commissionAmount: z.number().int().min(0).optional(),
  inStock: z.boolean().default(true),
  imageOriginalUrl: z.string().url().optional(),
})

// Saisie rapide : le liaison enregistre le vendeur tiers (nom, contact, location)
// au moment de poster l'annonce, sans fiche KYC complète. Le vendeur est créé en
// PENDING_ACTIVATION et pourra être complété (KYC) plus tard par l'admin.
export const liaisonQuickVendorSchema = z.object({
  shopName: z.string().min(2).max(100),
  contactName: z.string().min(2).max(100),
  phone: phoneSchema,
  commune: z.enum(ABIDJAN_COMMUNES),
  address: z.string().min(2).max(255).optional(),
})

export const liaisonQuickPartSchema = liaisonCreatePartSchema.extend({
  vendor: liaisonQuickVendorSchema,
})

export const liaisonUpdatePartSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  category: z.string().min(2).max(80).nullable().optional(),
  oemReference: z.string().max(80).nullable().optional(),
  vehicleCompatibility: z.string().max(255).nullable().optional(),
  fitments: z.array(liaisonFitmentSchema).max(50).optional(),
  price: z.number().int().min(1).optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']).optional(),
  warrantyValue: z.number().int().min(0).max(365).nullable().optional(),
  warrantyUnit: z.enum(['DAY', 'WEEK', 'MONTH']).nullable().optional(),
  commissionAmount: z.number().int().min(0).optional(),
  inStock: z.boolean().optional(),
})
