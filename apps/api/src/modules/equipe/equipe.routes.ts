import type { FastifyInstance } from 'fastify'
import {
  equipeMembersQuerySchema,
  equipeMemberParamsSchema,
  upsertTeamProfileSchema,
  objectivesQuerySchema,
  setObjectiveSchema,
  objectiveParamsSchema,
  agentCommissionsQuerySchema,
  generateCommissionsSchema,
  updateAgentCommissionSchema,
  agentCommissionParamsSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  getEquipeOverview,
  listMembers,
  upsertProfile,
  getMember,
  listObjectives,
  setObjective,
  deleteObjective,
  listCommissions,
  generateCommissions,
  updateCommission,
  payCommission,
  cancelCommission,
} from './equipe.service.js'

export async function equipeRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  // -------------------------------------------------------------------------
  // Cockpit
  // -------------------------------------------------------------------------

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Cockpit « Équipe & commissions » (membres, commissions, objectifs)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await getEquipeOverview()
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Membres & profils
  // -------------------------------------------------------------------------

  fastify.get(
    '/members',
    {
      schema: {
        tags: ['Équipe'],
        description:
          'Liste des membres de l’équipe (liaisons) : profil, compteurs, commission du mois estimée, objectifs',
        querystring: zodToFastify(equipeMembersQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listMembers(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/members/:id',
    {
      schema: {
        tags: ['Équipe'],
        description:
          'Fiche membre : profil, vendeurs gérés (commissions du mois), objectifs avec progression, 12 dernières commissions, activité',
        params: zodToFastify(equipeMemberParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getMember(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.put(
    '/members/:id/profile',
    {
      schema: {
        tags: ['Équipe'],
        description:
          'Créer ou mettre à jour le profil d’un membre (fonction, taux, actif, embauche)',
        params: zodToFastify(equipeMemberParamsSchema),
        body: zodToFastify(upsertTeamProfileSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await upsertProfile(id, request.body)
      request.log.info({ event: 'EQUIPE_PROFILE_UPDATED', adminId: request.user.id, userId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'EQUIPE_PROFILE_UPDATED',
        targetType: 'User',
        targetId: id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Objectifs
  // -------------------------------------------------------------------------

  fastify.get(
    '/members/:id/objectives',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Objectifs d’un membre pour une période, avec progression calculée en direct',
        params: zodToFastify(equipeMemberParamsSchema),
        querystring: zodToFastify(objectivesQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await listObjectives(id, request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.put(
    '/members/:id/objectives',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Fixer un objectif mensuel (upsert par agent + période + métrique)',
        params: zodToFastify(equipeMemberParamsSchema),
        body: zodToFastify(setObjectiveSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await setObjective(id, request.body)
      request.log.info({
        event: 'OBJECTIVE_SET',
        adminId: request.user.id,
        userId: id,
        objectiveId: result.id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'OBJECTIVE_SET',
        targetType: 'AgentObjective',
        targetId: result.id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.delete(
    '/objectives/:id',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Supprimer un objectif',
        params: zodToFastify(objectiveParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await deleteObjective(id)
      request.log.info({ event: 'OBJECTIVE_DELETED', adminId: request.user.id, objectiveId: id })
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Commissions
  // -------------------------------------------------------------------------

  fastify.get(
    '/commissions',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Liste des commissions mensuelles (filtres période, statut)',
        querystring: zodToFastify(agentCommissionsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listCommissions(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/commissions/generate',
    {
      schema: {
        tags: ['Équipe'],
        description:
          'Générer les commissions d’une période (upsert par agent, jamais de réécriture d’une PAYEE ni d’une ANNULEE)',
        body: zodToFastify(generateCommissionsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await generateCommissions(request.body)
      request.log.info({
        event: 'COMMISSION_GENERATED',
        adminId: request.user.id,
        ...result,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'COMMISSION_GENERATED',
        targetType: 'AgentCommission',
        targetId: null,
        payload: result,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/commissions/:id',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Modifier le montant ou la note d’une commission non payée (409 si PAYEE)',
        params: zodToFastify(agentCommissionParamsSchema),
        body: zodToFastify(updateAgentCommissionSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateCommission(id, request.body)
      request.log.info({ event: 'COMMISSION_UPDATED', adminId: request.user.id, commissionId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'COMMISSION_UPDATED',
        targetType: 'AgentCommission',
        targetId: id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/commissions/:id/pay',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Marquer une commission payée (DUE ou ESTIMEE → PAYEE, horodaté)',
        params: zodToFastify(agentCommissionParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await payCommission(id)
      request.log.info({
        event: 'COMMISSION_PAID',
        adminId: request.user.id,
        commissionId: id,
        agentId: result.agentId,
        montantFcfa: result.montantFcfa,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'COMMISSION_PAID',
        targetType: 'AgentCommission',
        targetId: id,
        payload: {
          agentId: result.agentId,
          periode: result.periode,
          montantFcfa: result.montantFcfa,
        },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/commissions/:id/cancel',
    {
      schema: {
        tags: ['Équipe'],
        description: 'Annuler une commission non payée (409 si PAYEE)',
        params: zodToFastify(agentCommissionParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await cancelCommission(id)
      request.log.info({
        event: 'COMMISSION_CANCELLED',
        adminId: request.user.id,
        commissionId: id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'COMMISSION_CANCELLED',
        targetType: 'AgentCommission',
        targetId: id,
        payload: { agentId: result.agentId, periode: result.periode },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )
}
