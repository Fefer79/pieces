import type { FastifyInstance } from 'fastify'
import { consentSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { recordConsent, getUserData, requestDeletion } from './consent.service.js'

export async function consentRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/me/consent',
    {
      schema: {
        body: zodToFastify(consentSchema),
        tags: ['Consent'],
        description: 'Enregistrer le consentement ARTCI de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const result = await recordConsent(request.user.id, request.body)
      request.log.info({ event: 'CONSENT_RECORDED', userId: request.user.id })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/me/data',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Consent'],
        description: 'Accéder à toutes les données personnelles de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await getUserData(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/me/data/deletion-request',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Consent'],
        description: 'Demander la suppression des données personnelles',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await requestDeletion(request.user.id)
      request.log.info({ event: 'DATA_DELETION_REQUESTED', userId: request.user.id })
      return reply.status(200).send({ data: result })
    },
  )
}
