import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  getUserOrderHistory,
  getAdminDashboardStats,
  getAdminUsers,
  getAdminOrders,
  getAdminVendors,
  getEnterpriseMembers,
} from './admin.service.js'

export async function adminRoutes(fastify: FastifyInstance) {
  // Story 9.1: User order history
  fastify.get(
    '/orders/history',
    {
      preHandler: [requireAuth],
      schema: { tags: ['History'], description: 'Historique des commandes utilisateur', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string }
      const result = await getUserOrderHistory(
        request.user.id,
        Number(query.page) || 1,
        Number(query.limit) || 20,
      )
      return reply.status(200).send({ data: result })
    },
  )

  // Story 9.2: Admin dashboard stats
  fastify.get(
    '/dashboard',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Tableau de bord admin', security: [{ BearerAuth: [] }] },
    },
    async (_request, reply) => {
      const stats = await getAdminDashboardStats()
      return reply.status(200).send({ data: stats })
    },
  )

  // Admin: list users
  fastify.get(
    '/users',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Liste des utilisateurs (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string }
      const result = await getAdminUsers(Number(query.page) || 1, Number(query.limit) || 50)
      return reply.status(200).send({ data: result })
    },
  )

  // Admin: list orders
  fastify.get(
    '/orders',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Liste des commandes (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string; status?: string }
      const result = await getAdminOrders(
        Number(query.page) || 1,
        Number(query.limit) || 50,
        query.status,
      )
      return reply.status(200).send({ data: result })
    },
  )

  // Admin: list vendors
  fastify.get(
    '/vendors',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Liste des vendeurs (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const query = request.query as { page?: string; limit?: string }
      const result = await getAdminVendors(Number(query.page) || 1, Number(query.limit) || 50)
      return reply.status(200).send({ data: result })
    },
  )

  // Story 9.3: Enterprise members
  fastify.get(
    '/enterprise/members',
    {
      preHandler: [requireAuth, requireRole('ENTERPRISE')],
      schema: { tags: ['Enterprise'], description: 'Membres entreprise', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const result = await getEnterpriseMembers(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )
}
