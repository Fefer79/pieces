import { z } from 'zod'
import { phoneSchema } from './auth'

export const vendorTypeSchema = z.enum(['FORMAL', 'INFORMAL'])
export const kycTypeSchema = z.enum(['RCCM', 'CNI'])

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
