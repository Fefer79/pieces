import type { FastifyInstance } from 'fastify'
import {
  shipmentCreateSchema,
  shipmentUpdateSchema,
  shipmentTransitionSchema,
  shipmentParamsSchema,
  shipmentReferenceParamsSchema,
  adminShipmentsQuerySchema,
  shipmentPublicLookupSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  createShipment,
  getShipment,
  listShipments,
  shipmentStats,
  updateShipment,
  transitionShipment,
  getShipmentPublic,
  notifyShipmentUpdate,
} from './shipment.service.js'

/** Monté sous /api/v1/admin/shipments. */
export async function shipmentRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('purchase:read')]

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Compteurs des expéditions par étape',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => reply.status(200).send({ data: await shipmentStats() }),
  )

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Liste paginée des expéditions',
        querystring: zodToFastify(adminShipmentsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => reply.status(200).send({ data: await listShipments(request.query) }),
  )

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Créer une expédition (le jeton public n\'est renvoyé qu\'ici)',
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
        payload: { reference: shipment.reference, carrier: shipment.carrier },
      }).catch(() => {})
      return reply.status(201).send({ data: shipment })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Détail d\'une expédition et sa frise d\'événements',
        params: zodToFastify(shipmentParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await getShipment(id) })
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Mettre à jour transporteur, suivi, poids ou coûts',
        params: zodToFastify(shipmentParamsSchema),
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
        tags: ['Expéditions'],
        description: 'Faire avancer l\'expédition d\'une étape',
        params: zodToFastify(shipmentParamsSchema),
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
        tags: ['Expéditions'],
        description: 'Prévenir le demandeur par WhatsApp de l\'étape en cours',
        params: zodToFastify(shipmentParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await notifyShipmentUpdate(id) })
    },
  )
}

/**
 * Suivi public d'une expédition : monté sous /api/v1/logistics, sans
 * authentification, protégé par le jeton de la référence (même contrat que le
 * suivi d'une cotation).
 */
export async function publicShipmentRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/shipments/:reference',
    {
      schema: {
        tags: ['Expéditions'],
        description: 'Suivi client d\'une expédition (jeton requis)',
        params: zodToFastify(shipmentReferenceParamsSchema),
        querystring: zodToFastify(shipmentPublicLookupSchema),
      },
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { reference } = request.params as { reference: string }
      const { t } = request.query as { t: string }
      return reply.status(200).send({ data: await getShipmentPublic(reference, t) })
    },
  )
}
