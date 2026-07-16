import { z } from 'zod'
import { phoneSchema } from './auth'
import { ABIDJAN_COMMUNES } from '../constants/communes'

export const contactStatusSchema = z.enum([
  'A_CONTACTER',
  'APPELE',
  'VISITE',
  'RELANCE',
  'CONCLU',
  'INJOIGNABLE',
  'A_REVOIR',
  'REJETE',
])

export const contactLinkTypeSchema = z.enum([
  'FACEBOOK',
  'WHATSAPP',
  'SITE_WEB',
  'INSTAGRAM',
  'TIKTOK',
  'AUTRE',
])

export const createVendorContactSchema = z
  .object({
    name: z.string().min(2).max(100),
    shopName: z.string().min(2).max(100).optional(),
    phone: phoneSchema,
    phone2: phoneSchema.optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    commune: z.enum(ABIDJAN_COMMUNES).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    pieces: z.array(z.string()).default([]),
    piecesLibre: z.string().max(2000).optional().nullable(),
    remarques: z.string().max(2000).optional().nullable(),
    vendorId: z.string().uuid().optional().nullable(),
  })
  .refine((data) => (data.lat == null) === (data.lng == null), {
    message: 'La latitude et la longitude doivent être fournies ensemble',
    path: ['lat'],
  })

export const updateVendorContactSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    shopName: z.string().min(2).max(100).optional(),
    phone: phoneSchema.optional(),
    phone2: phoneSchema.optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    commune: z.enum(ABIDJAN_COMMUNES).optional().nullable(),
    address: z.string().max(255).optional().nullable(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    pieces: z.array(z.string()).optional(),
    piecesLibre: z.string().max(2000).optional().nullable(),
    remarques: z.string().max(2000).optional().nullable(),
    vendorId: z.string().uuid().optional().nullable(),
    statut: contactStatusSchema.optional(),
    relanceLe: z.string().datetime().optional().nullable(),
    derniereVisite: z.string().datetime().optional().nullable(),
    derniereCommande: z.string().datetime().optional().nullable(),
    notesAppel: z.string().max(2000).optional().nullable(),
    photos: z.array(z.string()).optional(),
  })
  .refine((data) => (data.lat == null) === (data.lng == null), {
    message: 'La latitude et la longitude doivent être fournies ensemble',
    path: ['lat'],
  })

export const linkVendorContactSchema = z.object({
  url: z.string().url(),
  type: contactLinkTypeSchema,
  label: z.string().max(200).optional(),
})

export const vendorContactParamsSchema = z.object({
  id: z.string().min(1),
})

export const vendorContactListQuerySchema = z.object({
  statut: contactStatusSchema.optional(),
  commune: z.enum(ABIDJAN_COMMUNES).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export type CreateVendorContactInput = z.infer<typeof createVendorContactSchema>
export type UpdateVendorContactInput = z.infer<typeof updateVendorContactSchema>
export type LinkVendorContactInput = z.infer<typeof linkVendorContactSchema>
export type VendorContactListQuery = z.infer<typeof vendorContactListQuerySchema>
