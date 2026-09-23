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
    // Vendeur informel : le numéro est optionnel, la photo de la pièce
    // d'identité (POST /vendors/me/kyc-photo) en tient lieu. Un vendeur formel
    // doit déclarer son RCCM.
    documentNumber: z.string().min(5).max(50).optional(),
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
  .refine((data) => data.vendorType !== 'FORMAL' || Boolean(data.documentNumber), {
    message: 'Le numéro RCCM est requis pour un vendeur formel',
    path: ['documentNumber'],
  })

export const updateDeliveryZonesSchema = z.object({
  zones: z.array(z.enum(ABIDJAN_COMMUNES)).min(1, 'Au moins une commune est requise'),
})

// Admin edit of a vendor's info (nom de boutique + nom du contact + téléphone).
// shopName est notamment utile pour corriger un vendeur CoinAfrique importé.
export const adminUpdateVendorSchema = z
  .object({
    shopName: z.string().min(2).max(120).optional(),
    contactName: z.string().min(2).max(100).optional(),
    phone: phoneSchema.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Aucun champ à modifier' })

// ---------------------------------------------------------------------------
// Ventes hors-plateforme (carnet numérique du vendeur) — WhatsApp, téléphone,
// en boutique. Volontairement séparé d'Order : pas d'escrow, pas de shareToken.
// ---------------------------------------------------------------------------

export const vendorSaleChannelSchema = z.enum(['BOUTIQUE', 'WHATSAPP', 'TELEPHONE', 'AUTRE'])

export const createVendorSaleSchema = z
  .object({
    catalogItemId: z.string().uuid().optional(),
    // Requis si l'article n'est pas dans le catalogue digital (vente d'occasion
    // ponctuelle) — sinon dérivé du nom de la fiche catalogue.
    itemName: z.string().min(2).max(150).optional(),
    quantity: z.number().int().min(1).max(999).default(1),
    unitPrice: z.number().int().min(0).max(50_000_000),
    buyerName: z.string().max(100).optional(),
    buyerPhone: phoneSchema.optional(),
    channel: vendorSaleChannelSchema.default('BOUTIQUE'),
    note: z.string().max(500).optional(),
    // Chaîne ISO reçue telle quelle depuis le JSON — la conversion en Date se
    // fait côté service, pas ici (zodToFastify ne rejoue pas le .parse() Zod,
    // seul le schéma JSON dérivé valide la requête).
    soldAt: z.string().datetime().optional(),
  })
  .refine((data) => Boolean(data.catalogItemId) || Boolean(data.itemName), {
    message: "Indiquez une pièce du catalogue ou un nom d'article",
    path: ['itemName'],
  })

export const vendorSalesQuerySchema = z.object({
  channel: vendorSaleChannelSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})
