import type { FastifyInstance } from 'fastify'
import { switchContextSchema, updateRolesSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { getProfile, switchContext, updateRoles } from './user.service.js'

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Users'],
        description: 'Obtenir le profil de l\'utilisateur connecté',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await getProfile(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/me/context',
    {
      schema: {
        body: zodToFastify(switchContextSchema),
        tags: ['Users'],
        description: 'Changer le contexte actif (rôle) de l\'utilisateur',
        security: [{ BearerAuth: [] }],
      },
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
      schema: {
        body: zodToFastify(updateRolesSchema),
        tags: ['Users'],
        description: 'Mettre à jour les rôles d\'un utilisateur (admin only)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (request, reply) => {
      const { userId } = request.params as { userId: string }
      const { roles } = request.body as { roles: string[] }
      const result = await updateRoles(userId, roles as Parameters<typeof updateRoles>[1])
      request.log.info({ event: 'ADMIN_UPDATE_ROLES', adminId: request.user.id, targetUserId: userId, roles })
      return reply.status(200).send({ data: result })
    },
  )
}
