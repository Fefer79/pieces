import type { FastifyInstance } from 'fastify'
import {
  shipmentCreateSchema,
  shipmentUpdateSchema,
  shipmentTransitionSchema,
  adminShipmentListQuerySchema,
  sourcingIdParamsSchema,
  shipmentReferenceParamsSchema,
  shipmentPublicLookupSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createShipment,
  updateShipment,
  transitionShipment,
  adminListShipments,
  adminShipmentStats,
  adminGetShipment,
  getShipmentPublic,
  notifyShipmentUpdate,
} from './shipment.service.js'

/** Back-office des expéditions — /api/v1/admin/shipments. */
export async function shipmentRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Compteurs d\'expéditions par statut',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      return reply.status(200).send({ data: await adminShipmentStats() })
    },
  )

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Liste paginée des expéditions',
        querystring: zodToFastify(adminShipmentListQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      return reply.status(200).send({ data: await adminListShipments(request.query) })
    },
  )

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Shipments'],
        description:
          'Créer une expédition (depuis un bon de commande et/ou une cotation). Le jeton de suivi public n\'est renvoyé qu\'ici.',
        body: zodToFastify(shipmentCreateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const shipment = await createShipment(request.body, request.user.id)
      request.log.info({
        event: 'SHIPMENT_CREATED',
        adminId: request.user.id,
        shipmentId: shipment.id,
        reference: shipment.reference,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SHIPMENT_CREATED',
        targetType: 'Shipment',
        targetId: shipment.id,
      }).catch(() => {})
      return reply.status(201).send({ data: shipment })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Détail d\'une expédition avec sa frise d\'événements',
        params: zodToFastify(sourcingIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await adminGetShipment(id) })
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Mettre à jour transporteur, suivi, poids et coûts réels',
        params: zodToFastify(sourcingIdParamsSchema),
        body: zodToFastify(shipmentUpdateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await updateShipment(id, request.body) })
    },
  )

  fastify.post(
    '/:id/transition',
    {
      schema: {
        tags: ['Shipments'],
        description:
          'Faire avancer l\'expédition. Écrit un événement horodaté et propage EN_TRANSIT au bon de commande lié.',
        params: zodToFastify(sourcingIdParamsSchema),
        body: zodToFastify(shipmentTransitionSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const shipment = await transitionShipment(id, request.body, request.user.id)
      request.log.info({
        event: 'SHIPMENT_TRANSITIONED',
        adminId: request.user.id,
        shipmentId: id,
        status: shipment.status,
      })
      return reply.status(200).send({ data: shipment })
    },
  )

  fastify.post(
    '/:id/notify',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Prévenir le demandeur par WhatsApp de l\'état de son expédition',
        params: zodToFastify(sourcingIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await notifyShipmentUpdate(id, request.log) })
    },
  )
}

/**
 * Suivi public d'une expédition — /api/v1/logistics/shipments/:reference/public.
 * Aucun coût, transitaire jamais nommé (cf. toPublicShipment).
 */
export async function publicShipmentRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/shipments/:reference/public',
    {
      schema: {
        tags: ['Shipments'],
        description: 'Suivi client d\'une expédition par référence + jeton',
        params: zodToFastify(shipmentReferenceParamsSchema),
        querystring: zodToFastify(shipmentPublicLookupSchema),
      },
      config: { rateLimit: { max: 60, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { reference } = request.params as { reference: string }
      const { t } = request.query as { t: string }
      return reply.status(200).send({ data: await getShipmentPublic(reference, t) })
    },
  )
}
