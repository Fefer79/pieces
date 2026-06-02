import { z } from 'zod'

export const createOrderSchema = z.object({
  items: z.array(z.object({
    catalogItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
  })).min(1, 'Au moins un article est requis'),
  ownerPhone: z.string().regex(/^\+225\d{10}$/, 'Numéro ivoirien requis (+225...)').optional(),
  laborCost: z.number().int().min(0).optional(),
  vehicleId: z.string().uuid().optional(),
})

export const upsertDraftSchema = z.object({
  items: z.array(z.object({
    catalogItemId: z.string().min(1),
    quantity: z.number().int().min(1).max(99).default(1),
  })),
})

export const confirmOrderSchema = z.object({
  paymentMethod: z.enum(['ORANGE_MONEY', 'MTN_MOMO', 'WAVE', 'COD']),
})

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
})
