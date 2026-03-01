import { z } from 'zod'
import { phoneSchema } from './auth'
import { ABIDJAN_COMMUNES } from '../constants/communes'

export const vendorTypeSchema = z.enum(['FORMAL', 'INFORMAL'])
export const kycTypeSchema = z.enum(['RCCM', 'CNI'])
export const guaranteeTypeSchema = z.enum(['RETURN_48H', 'WARRANTY_30D'])

export const createVendorSchema = z
  .object({
    shopName: z.string().min(2).max(100),
    contactName: z.string().min(2).max(100),
    phone: phoneSchema,
    vendorType: vendorTypeSchema,
    documentNumber: z.string().min(5).max(50),
    kycType: kycTypeSchema,
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

export const updateDeliveryZonesSchema = z.object({
  zones: z.array(z.enum(ABIDJAN_COMMUNES)).min(1, 'Au moins une commune est requise'),
})
