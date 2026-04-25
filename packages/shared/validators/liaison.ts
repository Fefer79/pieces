import { z } from 'zod'
import { phoneSchema } from './auth'
import { vendorTypeSchema, kycTypeSchema } from './vendor'
import { ABIDJAN_COMMUNES } from '../constants/communes'

export const liaisonCreateVendorSchema = z
  .object({
    shopName: z.string().min(2).max(100),
    contactName: z.string().min(2).max(100),
    phone: phoneSchema,
    vendorType: vendorTypeSchema,
    documentNumber: z.string().min(5).max(50),
    kycType: kycTypeSchema,
    commune: z.enum(ABIDJAN_COMMUNES),
    address: z.string().min(2).max(255),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    deliveryZones: z.array(z.enum(ABIDJAN_COMMUNES)).default([]),
  })
  .refine(
    (data) =>
      (data.vendorType === 'FORMAL' && data.kycType === 'RCCM') ||
      (data.vendorType === 'INFORMAL' && data.kycType === 'CNI'),
    {
      message:
        'Le type KYC doit correspondre au type vendeur : FORMAL → RCCM, INFORMAL → CNI',
      path: ['kycType'],
    },
  )

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

export const liaisonCreatePartSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(80).optional(),
  oemReference: z.string().max(80).optional(),
  vehicleCompatibility: z.string().max(255).optional(),
  price: z.number().int().positive().optional(),
  condition: z.enum(['NEW', 'USED', 'REFURBISHED']),
  warrantyMonths: z.number().int().min(0).max(60).optional(),
  inStock: z.boolean().default(true),
  imageOriginalUrl: z.string().url().optional(),
})
