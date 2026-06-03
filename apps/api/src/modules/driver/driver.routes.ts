import type { FastifyInstance } from 'fastify'
import { driverDailyRecordSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { getMyDriverProfile, listMyDriverRecords, upsertMyDailyRecord } from './driver.service.js'

// Espace self-service du chauffeur (compte lié à une fiche Driver).
export async function driverRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me',
    { preHandler: [requireAuth], schema: { tags: ['Driver'], security: [{ BearerAuth: [] }] } },
    async (request, reply) => {
      const data = await getMyDriverProfile(request.user.id, request.user.phone)
      return reply.send({ data })
    },
  )

  fastify.get(
    '/me/records',
    { preHandler: [requireAuth], schema: { tags: ['Driver'], security: [{ BearerAuth: [] }] } },
    async (request, reply) => {
      const q = request.query as { days?: string }
      const data = await listMyDriverRecords(request.user.id, q.days ? Number(q.days) : 30)
      return reply.send({ data })
    },
  )

  fastify.post(
    '/me/daily',
    {
      preHandler: [requireAuth],
      schema: { tags: ['Driver'], security: [{ BearerAuth: [] }], body: zodToFastify(driverDailyRecordSchema) },
    },
    async (request, reply) => {
      const data = await upsertMyDailyRecord(
        request.user.id,
        request.body as Parameters<typeof upsertMyDailyRecord>[1],
      )
      return reply.status(201).send({ data })
    },
  )
}
