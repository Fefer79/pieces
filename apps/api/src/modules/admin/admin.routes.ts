import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  getAdminDashboardStats,
  getAdminUsers,
  getAdminOrders,
  getAdminVendors,
  getAdminCatalog,
  getEnterpriseMembers,
  getAdminOverview,
  getAdminCatalogList,
  getAdminVendorsList,
  getAdminVendorDetail,
  getAdminClientsList,
  getAdminClientDetail,
  getAdminEnterprisesList,
  getAdminEnterpriseDetail,
  exportCsv,
} from './admin.service.js'
import { recomputeVendorScore, recomputeAllVendorScores } from '../vendor/vendorScore.service.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { adminListQuerySchema, adminExportQuerySchema } from 'shared/validators'

export async function adminRoutes(fastify: FastifyInstance) {
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

  // Admin: list all catalog items (no pagination)
  fastify.get(
    '/catalog',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Liste des annonces (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const query = request.query as { status?: string }
      const result = await getAdminCatalog(query.status)
      return reply.status(200).send({ data: result })
    },
  )

  // Phase 2 — rich admin dashboard
  fastify.get(
    '/overview',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'KPIs + revenu mensuel + top vendeurs', security: [{ BearerAuth: [] }] },
    },
    async (_request, reply) => {
      const data = await getAdminOverview()
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/catalog/list',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Liste catalogue paginée + recherche + filtres',
        querystring: zodToFastify(adminListQuerySchema),
      },
    },
    async (request, reply) => {
      const data = await getAdminCatalogList(request.query as Record<string, never>)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/vendors/list',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Liste vendeurs paginée + recherche',
        querystring: zodToFastify(adminListQuerySchema),
      },
    },
    async (request, reply) => {
      const data = await getAdminVendorsList(request.query as Record<string, never>)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/vendors/:id/detail',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Détail vendeur + transactions + commissions' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getAdminVendorDetail(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/clients/list',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Liste clients (utilisateurs) paginée + recherche',
        querystring: zodToFastify(adminListQuerySchema),
      },
    },
    async (request, reply) => {
      const data = await getAdminClientsList(request.query as Record<string, never>)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/clients/:id/detail',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Détail client + commandes' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getAdminClientDetail(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/enterprises/list',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Liste entreprises paginée + recherche',
        querystring: zodToFastify(adminListQuerySchema),
      },
    },
    async (request, reply) => {
      const data = await getAdminEnterprisesList(request.query as Record<string, never>)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/enterprises/:id/detail',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Détail entreprise + membres + parc + commandes' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getAdminEnterpriseDetail(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/vendors/:id/recompute-score',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Recalcule le score agrégé d\'un vendeur' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await recomputeVendorScore(id)
      request.log.info({ event: 'VENDOR_SCORE_RECOMPUTED', vendorId: id })
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/vendors/recompute-scores',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Recalcule tous les scores vendeurs (batch)' },
    },
    async (request, reply) => {
      const data = await recomputeAllVendorScores()
      request.log.info({ event: 'VENDOR_SCORES_BATCH_RECOMPUTED', count: data.count })
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/export.csv',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Export CSV (entity = vendors|clients|orders|catalog)',
        querystring: zodToFastify(adminExportQuerySchema),
      },
    },
    async (request, reply) => {
      const { entity } = request.query as { entity: 'vendors' | 'clients' | 'orders' | 'catalog' }
      const csv = await exportCsv(entity)
      return reply
        .header('content-type', 'text/csv; charset=utf-8')
        .header('content-disposition', `attachment; filename="${entity}-${Date.now()}.csv"`)
        .status(200)
        .send(csv)
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
