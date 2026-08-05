import type { FastifyInstance } from 'fastify'
import {
  supportDisputesQuerySchema,
  supportReturnsQuerySchema,
  supportIdParamsSchema,
  supportResolveDisputeSchema,
  supportTransitionReturnSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  getSupportOverview,
  listDisputes,
  getDispute,
  reviewDispute,
  resolveDispute,
  closeDispute,
  listReturns,
  getReturn,
  transitionReturn,
} from './support.service.js'

export async function supportRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('crm:read')]

  // -------------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------------

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Support'],
        description: 'Cockpit « Support & SAV » (litiges, retours, remboursements 30 j)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await getSupportOverview()
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Litiges
  // -------------------------------------------------------------------------

  fastify.get(
    '/disputes',
    {
      schema: {
        tags: ['Support'],
        description: 'Liste des litiges (filtre statut, recherche raison/commande, pagination)',
        querystring: zodToFastify(supportDisputesQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listDisputes(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/disputes/:id',
    {
      schema: {
        tags: ['Support'],
        description: 'Fiche litige : commande complète (articles, séquestre), plaignant',
        params: zodToFastify(supportIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getDispute(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/disputes/:id/review',
    {
      schema: {
        tags: ['Support'],
        description: 'Prendre en charge un litige ouvert (OPEN → UNDER_REVIEW)',
        params: zodToFastify(supportIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await reviewDispute(id)
      request.log.info({ event: 'DISPUTE_REVIEWED', adminId: request.user.id, disputeId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'DISPUTE_REVIEWED',
        targetType: 'Dispute',
        targetId: id,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/disputes/:id/resolve',
    {
      schema: {
        tags: ['Support'],
        description:
          'Résoudre un litige (OPEN/UNDER_REVIEW → RESOLVED_BUYER/RESOLVED_SELLER, notif WhatsApp au plaignant)',
        params: zodToFastify(supportIdParamsSchema),
        body: zodToFastify(supportResolveDisputeSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await resolveDispute(id, request.body)
      request.log.info({
        event: 'DISPUTE_RESOLVED',
        adminId: request.user.id,
        disputeId: id,
        status: result.status,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'DISPUTE_RESOLVED',
        targetType: 'Dispute',
        targetId: id,
        payload: { inFavorOf: (request.body as { inFavorOf?: string })?.inFavorOf },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/disputes/:id/close',
    {
      schema: {
        tags: ['Support'],
        description: 'Clôturer un litige (UNDER_REVIEW/RESOLVED_* → CLOSED)',
        params: zodToFastify(supportIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await closeDispute(id)
      request.log.info({ event: 'DISPUTE_CLOSED', adminId: request.user.id, disputeId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'DISPUTE_CLOSED',
        targetType: 'Dispute',
        targetId: id,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Retours
  // -------------------------------------------------------------------------

  fastify.get(
    '/returns',
    {
      schema: {
        tags: ['Support'],
        description: 'Liste des retours (filtre statut, recherche description/commande, pagination)',
        querystring: zodToFastify(supportReturnsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listReturns(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/returns/:id',
    {
      schema: {
        tags: ['Support'],
        description: 'Fiche retour : commande complète (articles, séquestre), demandeur',
        params: zodToFastify(supportIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getReturn(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/returns/:id/transition',
    {
      schema: {
        tags: ['Support'],
        description:
          'Faire avancer un retour (machine à états des retours ; REFUNDED exige refundAmount et rembourse le séquestre HELD)',
        params: zodToFastify(supportIdParamsSchema),
        body: zodToFastify(supportTransitionReturnSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await transitionReturn(id, request.body)
      request.log.info({
        event: 'RETURN_STATUS_UPDATED',
        adminId: request.user.id,
        returnId: id,
        status: result.status,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'RETURN_STATUS_UPDATED',
        targetType: 'ReturnOrder',
        targetId: id,
        payload: {
          statut: result.status,
          ...(result.refundAmount != null && { refundAmount: result.refundAmount }),
        },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )
}
