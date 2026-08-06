import type { FastifyInstance } from 'fastify'
import {
  createCrmInteractionSchema,
  createCrmTaskSchema,
  updateCrmTaskSchema,
  crmTasksQuerySchema,
  createCrmTagSchema,
  crmTagAssignSchema,
  crmRelanceWhatsAppSchema,
  crmTimelineParamsSchema,
  crmTimelineQuerySchema,
  crmTaskParamsSchema,
  crmTagParamsSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  getCrmOverview,
  getCrmTimeline,
  addCrmInteraction,
  listCrmTasks,
  createCrmTask,
  updateCrmTask,
  listCrmTags,
  createCrmTag,
  deleteCrmTag,
  getCrmTagsOn,
  assignCrmTag,
  unassignCrmTag,
  sendCrmRelance,
} from './crm.service.js'

type SubjectParams = { subject: 'USER' | 'VENDOR'; subjectId: string }

export async function crmRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('crm:read')]
  // Écritures : consulter le CRM et le modifier sont deux droits distincts.
  const writeGuard = [requireAuth, requireCapability('crm:write')]

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['CRM'],
        description: "Vue d'ensemble CRM (tâches du jour, retards, activité 7 j, segments)",
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await getCrmOverview()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/timeline/:subject/:subjectId',
    {
      schema: {
        tags: ['CRM'],
        description:
          "Timeline fusionnée (interactions CRM + activité plateforme) d'un client ou vendeur",
        params: zodToFastify(crmTimelineParamsSchema),
        querystring: zodToFastify(crmTimelineQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { subject, subjectId } = request.params as SubjectParams
      const result = await getCrmTimeline(subject, subjectId, request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/interactions',
    {
      schema: {
        tags: ['CRM'],
        description: 'Enregistrer une interaction (note, appel, WhatsApp, visite, email)',
        body: zodToFastify(createCrmInteractionSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const result = await addCrmInteraction(request.user.id, request.body)
      request.log.info({
        event: 'CRM_INTERACTION_ADDED',
        adminId: request.user.id,
        subject: result.subject,
        subjectId: result.subjectId,
        type: result.type,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CRM_INTERACTION_ADDED',
        targetType: result.subject === 'USER' ? 'User' : 'Vendor',
        targetId: result.subjectId,
        payload: { type: result.type },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/tasks',
    {
      schema: {
        tags: ['CRM'],
        description: 'Liste des tâches CRM (filtres : statut, assigné, cible, échéance)',
        querystring: zodToFastify(crmTasksQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listCrmTasks(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/tasks',
    {
      schema: {
        tags: ['CRM'],
        description: 'Créer une tâche CRM',
        body: zodToFastify(createCrmTaskSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const result = await createCrmTask(request.user.id, request.body)
      request.log.info({
        event: 'CRM_TASK_CREATED',
        adminId: request.user.id,
        taskId: result.id,
        subject: result.subject,
        subjectId: result.subjectId,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CRM_TASK_CREATED',
        targetType: 'CrmTask',
        targetId: result.id,
        payload: { subject: result.subject, subjectId: result.subjectId, titre: result.titre },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.patch(
    '/tasks/:id',
    {
      schema: {
        tags: ['CRM'],
        description: 'Modifier une tâche CRM (statut, échéance, assigné)',
        params: zodToFastify(crmTaskParamsSchema),
        body: zodToFastify(updateCrmTaskSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateCrmTask(id, request.body)
      request.log.info({ event: 'CRM_TASK_UPDATED', adminId: request.user.id, taskId: id })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CRM_TASK_UPDATED',
        targetType: 'CrmTask',
        targetId: id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/tags',
    {
      schema: {
        tags: ['CRM'],
        description: 'Liste des tags CRM avec le nombre de fiches taguées',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await listCrmTags()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/tags',
    {
      schema: {
        tags: ['CRM'],
        description: 'Créer un tag CRM',
        body: zodToFastify(createCrmTagSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const result = await createCrmTag(request.body)
      request.log.info({ event: 'CRM_TAG_CREATED', adminId: request.user.id, tagId: result.id })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.delete(
    '/tags/:id',
    {
      schema: {
        tags: ['CRM'],
        description: 'Supprimer un tag CRM',
        params: zodToFastify(crmTagParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await deleteCrmTag(id)
      request.log.info({ event: 'CRM_TAG_DELETED', adminId: request.user.id, tagId: id })
      return reply.status(204).send()
    },
  )

  fastify.get(
    '/tags/on/:subject/:subjectId',
    {
      schema: {
        tags: ['CRM'],
        description: 'Tags assignés à une fiche (client ou vendeur)',
        params: zodToFastify(crmTimelineParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { subject, subjectId } = request.params as SubjectParams
      const result = await getCrmTagsOn(subject, subjectId)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/tags/:id/assign',
    {
      schema: {
        tags: ['CRM'],
        description: 'Assigner un tag à une fiche (idempotent)',
        params: zodToFastify(crmTagParamsSchema),
        body: zodToFastify(crmTagAssignSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await assignCrmTag(id, request.body)
      request.log.info({
        event: 'CRM_TAG_ASSIGNED',
        adminId: request.user.id,
        tagId: id,
        subject: result.subject,
        subjectId: result.subjectId,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CRM_TAG_ASSIGNED',
        targetType: result.subject === 'USER' ? 'User' : 'Vendor',
        targetId: result.subjectId,
        payload: { tagId: id, tag: result.tag.nom },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.delete(
    '/tags/:id/assign',
    {
      schema: {
        tags: ['CRM'],
        description: "Retirer un tag d'une fiche",
        params: zodToFastify(crmTagParamsSchema),
        body: zodToFastify(crmTagAssignSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await unassignCrmTag(id, request.body)
      request.log.info({ event: 'CRM_TAG_UNASSIGNED', adminId: request.user.id, tagId: id })
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/relance-whatsapp',
    {
      schema: {
        tags: ['CRM'],
        description: 'Envoyer une relance WhatsApp manuelle (tracée comme interaction RELANCE)',
        body: zodToFastify(crmRelanceWhatsAppSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: writeGuard,
    },
    async (request, reply) => {
      const body = request.body as { subject: 'USER' | 'VENDOR'; subjectId: string }
      const result = await sendCrmRelance(request.user.id, request.body)
      request.log.info({
        event: 'CRM_RELANCE_SENT',
        adminId: request.user.id,
        subject: body.subject,
        subjectId: body.subjectId,
        sent: result.sent,
        channel: result.channel,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CRM_RELANCE_SENT',
        targetType: body.subject === 'USER' ? 'User' : 'Vendor',
        targetId: body.subjectId,
        payload: { sent: result.sent, channel: result.channel },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )
}
