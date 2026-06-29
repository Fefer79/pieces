import type { FastifyInstance } from 'fastify'
import { createOrderSchema, confirmOrderSchema, cancelOrderSchema, upsertDraftSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import {
  createOrder,
  getOrderByShareToken,
  getOrderById,
  getUserOrders,
  selectPaymentMethod,
  cancelOrder,
  vendorConfirmOrder,
  getOpenDraft,
  upsertDraft,
} from './order.service.js'
import { getUserOrderHistory } from '../admin/admin.service.js'
import { generateDevisPdf } from './devis.service.js'

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
      const body = request.body as { items: { catalogItemId: string; quantity?: number }[]; ownerPhone?: string; laborCost?: number; vehicleId?: string; deliveryCommune?: string }
      const order = await createOrder(request.user.id, body.items, {
        ownerPhone: body.ownerPhone,
        laborCost: body.laborCost,
        vehicleId: body.vehicleId,
        deliveryCommune: body.deliveryCommune,
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

  // M4 fix: User order history with pagination (under /orders prefix, not /admin)
  fastify.get(
    '/history',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Historique paginé des commandes utilisateur',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string }
      const result = await getUserOrderHistory(
        request.user.id,
        Number(query.page) || 1,
        Number(query.limit) || 20,
      )
      return reply.status(200).send({ data: result })
    },
  )

  // Get the user's open cart draft (server-side hybrid cart)
  fastify.get(
    '/draft',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Récupérer le brouillon panier ouvert de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const draft = await getOpenDraft(request.user.id)
      return reply.status(200).send({ data: draft })
    },
  )

  // Upsert the user's open cart draft
  fastify.put(
    '/draft',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Synchroniser le brouillon panier (remplace items + quantités)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(upsertDraftSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as { items: { catalogItemId: string; quantity?: number }[] }
      const draft = await upsertDraft(request.user.id, body.items)
      return reply.status(200).send({ data: draft })
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
      const order = await getOrderById(orderId, { id: request.user.id, roles: request.user.roles })
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
      const { paymentMethod, shareToken } = request.body as { paymentMethod: string; shareToken: string }
      const order = await selectPaymentMethod(orderId, paymentMethod, 'buyer', shareToken)
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
      const order = await vendorConfirmOrder(orderId, { id: request.user.id, roles: request.user.roles })
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
        body: zodToFastify(cancelOrderSchema),
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const { reason, shareToken } = request.body as { reason?: string; shareToken: string }
      const order = await cancelOrder(orderId, 'buyer', reason, shareToken)
      return reply.status(200).send({ data: order })
    },
  )

  // Download devis PDF
  fastify.get(
    '/:orderId/devis.pdf',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Orders'],
        description: 'Télécharger le devis PDF de la commande',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const pdf = await generateDevisPdf(orderId, request.user.id)
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="devis-${orderId}.pdf"`)
      return reply.send(pdf)
    },
  )
}
