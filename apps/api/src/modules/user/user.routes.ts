import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { getProfile, switchContext, updateRoles } from './user.service.js'

const switchContextBodySchema = {
  type: 'object',
  required: ['role'],
  properties: {
    role: { type: 'string' },
  },
} as const

const updateRolesBodySchema = {
  type: 'object',
  required: ['roles'],
  properties: {
    roles: { type: 'array', items: { type: 'string' } },
  },
} as const

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const result = await getProfile(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/me/context',
    {
      schema: { body: switchContextBodySchema },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { role } = request.body as { role: string }
      const result = await switchContext(request.user.id, role)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/:userId/roles',
    {
      schema: { body: updateRolesBodySchema },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const { roles } = request.body as { roles: string[] }
      const result = await updateRoles(userId, roles as Parameters<typeof updateRoles>[1])
      return reply.status(200).send({ data: result })
    },
  )
}
