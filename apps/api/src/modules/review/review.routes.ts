import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createSellerReview,
  createDeliveryReview,
  getVendorReviews,
  getRiderReviews,
  openDispute,
  getDisputesByOrder,
  resolveDispute,
} from './review.service.js'

export async function reviewRoutes(fastify: FastifyInstance) {
  // Create seller review
  fastify.post(
    '/seller',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Reviews'], description: 'Évaluer un vendeur', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const body = request.body as { orderId: string; vendorId: string; rating: number; comment?: string }
      const review = await createSellerReview(request.user.id, body)
      return reply.status(201).send({ data: review })
    },
  )

  // Create delivery review
  fastify.post(
    '/delivery',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Reviews'], description: 'Évaluer une livraison', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const body = request.body as { deliveryId: string; riderId: string; rating: number; comment?: string }
      const review = await createDeliveryReview(request.user.id, body)
      return reply.status(201).send({ data: review })
    },
  )

  // Get vendor reviews
  fastify.get(
    '/vendor/:vendorId',
    {
      schema: { tags: ['Reviews'], description: 'Avis sur un vendeur' },
    },
    async (request, reply) => {
      const { vendorId } = request.params as { vendorId: string }
      const result = await getVendorReviews(vendorId)
      return reply.status(200).send({ data: result })
    },
  )

  // Get rider reviews
  fastify.get(
    '/rider/:riderId',
    {
      schema: { tags: ['Reviews'], description: 'Avis sur un livreur' },
    },
    async (request, reply) => {
      const { riderId } = request.params as { riderId: string }
      const result = await getRiderReviews(riderId)
      return reply.status(200).send({ data: result })
    },
  )

  // Open dispute
  fastify.post(
    '/disputes',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Disputes'], description: 'Ouvrir un litige', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const body = request.body as { orderId: string; reason: string }
      const dispute = await openDispute(request.user.id, body.orderId, body.reason)
      return reply.status(201).send({ data: dispute })
    },
  )

  // Get disputes for an order
  fastify.get(
    '/disputes/order/:orderId',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Disputes'], description: 'Litiges d\'une commande', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const disputes = await getDisputesByOrder(orderId)
      return reply.status(200).send({ data: disputes })
    },
  )

  // Resolve dispute (admin)
  fastify.post(
    '/disputes/:disputeId/resolve',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Disputes'], description: 'Résoudre un litige (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { disputeId } = request.params as { disputeId: string }
      const body = request.body as { resolution: string; inFavorOf: 'buyer' | 'seller' }
      const dispute = await resolveDispute(disputeId, body.resolution, body.inFavorOf)
      return reply.status(200).send({ data: dispute })
    },
  )
}
