import { z } from 'zod'

export const createSellerReviewSchema = z.object({
  orderId: z.string().min(1),
  vendorId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export const createDeliveryReviewSchema = z.object({
  deliveryId: z.string().min(1),
  riderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export const openDisputeSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(5).max(2000),
})

export const resolveDisputeSchema = z.object({
  resolution: z.string().min(5).max(2000),
  inFavorOf: z.enum(['buyer', 'seller']),
})
