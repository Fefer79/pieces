import { z } from 'zod'

export const createOrderSchema = z.object({
  items: z.array(z.object({
    catalogItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
  })).min(1, 'Au moins un article est requis'),
  ownerPhone: z.string().regex(/^\+225\d{10}$/, 'Numéro ivoirien requis (+225...)').optional(),
  laborCost: z.number().int().min(0).optional(),
  vehicleId: z.string().uuid().optional(),
  deliveryCommune: z.string().max(50).optional(),
})

export const upsertDraftSchema = z.object({
  items: z.array(z.object({
    catalogItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
  })),
})

// shareToken = randomBytes(16).toString('hex') côté serveur → 32 hex chars.
// Sert de preuve de possession pour les actions du propriétaire (non authentifié).
const shareTokenSchema = z.string().regex(/^[a-f0-9]{32}$/, 'Lien de partage invalide')

export const confirmOrderSchema = z.object({
  paymentMethod: z.enum(['ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'COD']),
  shareToken: shareTokenSchema,
})

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
  shareToken: shareTokenSchema,
})
