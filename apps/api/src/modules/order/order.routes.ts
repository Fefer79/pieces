import type { FastifyInstance } from 'fastify'
import { createOrderSchema, confirmOrderSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import {
  createOrder,
  getOrderByShareToken,
  getOrderById,
  getUserOrders,
  selectPaymentMethod,
  cancelOrder,
  transitionOrder,
} from './order.service.js'

export async function orderRoutes(fastify: FastifyInstance) {
  // Create order (mechanic initiates)
  fastify.post(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Créer une commande (mécanicien initie)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(createOrderSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as { items: { catalogItemId: string }[]; ownerPhone?: string; laborCost?: number }
      const order = await createOrder(request.user.id, body.items, {
        ownerPhone: body.ownerPhone,
        laborCost: body.laborCost,
      })
      return reply.status(201).send({ data: order })
    },
  )

  // List user's orders
  fastify.get(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Lister les commandes de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const orders = await getUserOrders(request.user.id)
      return reply.status(200).send({ data: orders })
    },
  )

  // Get order by ID (authenticated)
  fastify.get(
    '/:orderId',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Détails d\'une commande',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const order = await getOrderById(orderId)
      return reply.status(200).send({ data: order })
    },
  )

  // Get order by share token (public — for owner choice page)
  fastify.get(
    '/share/:shareToken',
    {
      schema: {
        tags: ['Orders'],
        description: 'Consulter une commande via lien partagé (propriétaire)',
      },
    },
    async (request, reply) => {
      const { shareToken } = request.params as { shareToken: string }
      const order = await getOrderByShareToken(shareToken)
      return reply.status(200).send({ data: order })
    },
  )

  // Select payment method + initiate payment
  fastify.post(
    '/:orderId/pay',
    {
      schema: {
        tags: ['Orders'],
        description: 'Sélectionner le mode de paiement et initier le paiement',
        body: zodToFastify(confirmOrderSchema),
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const { paymentMethod } = request.body as { paymentMethod: string }
      const order = await selectPaymentMethod(orderId, paymentMethod, 'buyer')
      return reply.status(200).send({ data: order })
    },
  )

  // Vendor confirm order
  fastify.post(
    '/:orderId/confirm',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Vendeur confirme la commande',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const order = await transitionOrder(orderId, 'VENDOR_CONFIRMED', request.user.id, 'Confirmé par le vendeur')
      return reply.status(200).send({ data: order })
    },
  )

  // Cancel order
  fastify.post(
    '/:orderId/cancel',
    {
      schema: {
        tags: ['Orders'],
        description: 'Annuler une commande',
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const body = (request.body as { reason?: string } | null) ?? {}
      const order = await cancelOrder(orderId, 'buyer', body.reason)
      return reply.status(200).send({ data: order })
    },
  )
}
