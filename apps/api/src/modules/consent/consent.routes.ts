import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth.js'
import { recordConsent, getUserData, requestDeletion } from './consent.service.js'

const consentBodySchema = {
  type: 'object',
  required: ['accepted'],
  properties: {
    accepted: { type: 'boolean' },
  },
} as const

export async function consentRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/me/consent',
    {
      schema: { body: consentBodySchema },
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
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await getUserData(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/me/data/deletion-request',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await requestDeletion(request.user.id)
      request.log.info({ event: 'DATA_DELETION_REQUESTED', userId: request.user.id })
      return reply.status(200).send({ data: result })
    },
  )
}
