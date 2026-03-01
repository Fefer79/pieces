import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createDelivery,
  assignRider,
  startPickup,
  startTransit,
  confirmDelivery,
  markClientAbsent,
  updateRiderLocation,
  getDeliveryByOrderId,
  getRiderDeliveries,
  getPendingDeliveries,
} from './delivery.service.js'

export async function deliveryRoutes(fastify: FastifyInstance) {
  // Create delivery for an order (admin/system)
  fastify.post(
    '/',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Deliveries'],
        description: 'Créer une livraison pour une commande',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body = request.body as {
        orderId: string; pickupAddress?: string; deliveryAddress?: string
        pickupLat?: number; pickupLng?: number; deliveryLat?: number; deliveryLng?: number
        mode?: 'EXPRESS' | 'STANDARD'; codAmount?: number
      }
      const delivery = await createDelivery(body.orderId, body)
      return reply.status(201).send({ data: delivery })
    },
  )

  // List pending deliveries (admin)
  fastify.get(
    '/pending',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Deliveries'],
        description: 'Livraisons en attente d\'assignation',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request, reply) => {
      const deliveries = await getPendingDeliveries()
      return reply.status(200).send({ data: deliveries })
    },
  )

  // Assign rider to delivery (admin)
  fastify.post(
    '/:deliveryId/assign',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Deliveries'],
        description: 'Assigner un rider à une livraison',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const { riderId } = request.body as { riderId: string }
      const delivery = await assignRider(deliveryId, riderId)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Rider: my deliveries
  fastify.get(
    '/mine',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Mes livraisons (Rider)',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const deliveries = await getRiderDeliveries(request.user.id)
      return reply.status(200).send({ data: deliveries })
    },
  )

  // Rider: start pickup
  fastify.post(
    '/:deliveryId/pickup',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Rider démarre le ramassage',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const delivery = await startPickup(deliveryId, request.user.id)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Rider: start transit (picked up the part)
  fastify.post(
    '/:deliveryId/transit',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Rider en route vers le client',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const delivery = await startTransit(deliveryId, request.user.id)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Rider: confirm delivery
  fastify.post(
    '/:deliveryId/deliver',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Rider confirme la livraison',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const delivery = await confirmDelivery(deliveryId, request.user.id)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Rider: mark client absent
  fastify.post(
    '/:deliveryId/client-absent',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Rider signale client absent',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const delivery = await markClientAbsent(deliveryId, request.user.id)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Rider: update GPS location
  fastify.post(
    '/:deliveryId/location',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Deliveries'],
        description: 'Mettre à jour la position GPS du rider',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { deliveryId } = request.params as { deliveryId: string }
      const { lat, lng } = request.body as { lat: number; lng: number }
      const delivery = await updateRiderLocation(deliveryId, request.user.id, lat, lng)
      return reply.status(200).send({ data: delivery })
    },
  )

  // Get delivery by order ID (public for tracking)
  fastify.get(
    '/order/:orderId',
    {
      schema: {
        tags: ['Deliveries'],
        description: 'Obtenir la livraison d\'une commande',
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const delivery = await getDeliveryByOrderId(orderId)
      return reply.status(200).send({ data: delivery })
    },
  )
}
