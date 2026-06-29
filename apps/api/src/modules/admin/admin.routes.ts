import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  getAdminDashboardStats,
  getAdminUsers,
  getAdminOrders,
  getAdminVendors,
  getAdminCatalog,
  getAdminCatalogItem,
  updateAdminCatalogItem,
  addAdminPhoto,
  removeAdminPhoto,
  reorderAdminPhotos,
  getEnterpriseMembers,
  getAdminOverview,
  getAdminCatalogList,
  getAdminCatalogSuggest,
  getAdminEntitySuggest,
  getAdminVendorsList,
  getAdminVendorDetail,
  updateAdminVendor,
  getAdminClientsList,
  getAdminClientDetail,
  getAdminEnterprisesList,
  getAdminEnterpriseDetail,
  getAdminLiaisonsList,
  getAdminLiaisonDetail,
  getAdminLiaisonActivity,
  getAdminExternalImports,
  getAdminExternalImportStats,
  replaceAdminFitments,
  type AdminFitmentInput,
  exportCsv,
} from './admin.service.js'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { recomputeVendorScore, recomputeAllVendorScores } from '../vendor/vendorScore.service.js'
import {
  createSubscription,
  updateSubscription,
  listSubscriptionsForEnterprise,
  getCurrentSubscription,
  computeMonthlyAmount,
  type SubscriptionTier,
  type SubscriptionStatus,
  type BillingCycle,
} from '../enterprise/subscription.service.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import {
  adminListQuerySchema,
  adminSuggestQuerySchema,
  adminEntitySuggestQuerySchema,
  adminExportQuerySchema,
  adminUpdateCatalogItemSchema,
  adminUpdateVendorSchema,
  reorderPhotosSchema,
  replaceFitmentsSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
} from 'shared/validators'

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

  // Admin: single annonce detail (clickable row → view/edit)
  fastify.get(
    '/catalog/:id',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Détail d\'une annonce (admin)', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getAdminCatalogItem(id)
      return reply.status(200).send({ data })
    },
  )

  // Admin: edit an annonce
  fastify.patch(
    '/catalog/:id',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Modifie une annonce (admin)',
        body: zodToFastify(adminUpdateCatalogItemSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await updateAdminCatalogItem(id, request.body as Record<string, never>)
      request.log.info({ event: 'ADMIN_CATALOG_ITEM_UPDATED', itemId: id })
      return reply.status(200).send({ data })
    },
  )

  // Admin: add a photo to an annonce
  fastify.post(
    '/catalog/:id/photos',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Ajoute une photo (max 3) à une annonce (admin)',
        consumes: ['multipart/form-data'],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const file = await request.file()
      if (!file) {
        throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
      }
      const buffer = await file.toBuffer()
      const data = await addAdminPhoto(id, buffer, file.filename, file.mimetype)
      request.log.info({ event: 'ADMIN_CATALOG_PHOTO_ADDED', itemId: id, photoId: data.id })
      return reply.status(201).send({ data })
    },
  )

  // Admin: remove a photo from an annonce
  fastify.delete(
    '/catalog/:id/photos/:photoId',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Supprime une photo d\'une annonce (admin)' },
    },
    async (request, reply) => {
      const { id, photoId } = request.params as { id: string; photoId: string }
      const data = await removeAdminPhoto(id, photoId)
      request.log.info({ event: 'ADMIN_CATALOG_PHOTO_REMOVED', itemId: id, photoId })
      return reply.status(200).send({ data })
    },
  )

  // Admin: reorder photos of an annonce
  fastify.patch(
    '/catalog/:id/photos/reorder',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Réordonne les photos d\'une annonce (admin)',
        body: zodToFastify(reorderPhotosSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { photoIds } = request.body as { photoIds: string[] }
      const data = await reorderAdminPhotos(id, photoIds)
      request.log.info({ event: 'ADMIN_CATALOG_PHOTOS_REORDERED', itemId: id })
      return reply.status(200).send({ data })
    },
  )

  // Admin: replace the vehicle-compatibility (fitment) list of an annonce.
  // Unlike the vendor-facing catalog API, this is not gated by vendor ownership.
  fastify.put(
    '/catalog/:id/fitments',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Remplace les compatibilités véhicule d\'une annonce (admin)',
        body: zodToFastify(replaceFitmentsSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { fitments } = request.body as { fitments: AdminFitmentInput[] }
      const data = await replaceAdminFitments(id, fitments)
      request.log.info({ event: 'ADMIN_CATALOG_FITMENTS_REPLACED', itemId: id, count: data.length })
      return reply.status(200).send({ data })
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
    '/catalog/suggest',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Autocomplétion catalogue : suggestions pièces / marques / vendeurs',
        querystring: zodToFastify(adminSuggestQuerySchema),
      },
    },
    async (request, reply) => {
      const { q } = request.query as { q?: string }
      const data = await getAdminCatalogSuggest(q ?? '')
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/suggest',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Autocomplétion des listes admin (clients, entreprises, vendeurs, imports externes)',
        querystring: zodToFastify(adminEntitySuggestQuerySchema),
      },
    },
    async (request, reply) => {
      const { entity, q } = request.query as {
        entity: 'clients' | 'enterprises' | 'vendors' | 'external-imports'
        q?: string
      }
      const data = await getAdminEntitySuggest(entity, q ?? '')
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/external-imports/list',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Liste paginée des CatalogItems issus de sources externes (scrapers)',
        querystring: zodToFastify(adminListQuerySchema),
      },
    },
    async (request, reply) => {
      const data = await getAdminExternalImports(request.query as Record<string, never>)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/external-imports/stats',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Compteurs par source externe (total, withOem, lastImportAt)' },
    },
    async (_request, reply) => {
      const data = await getAdminExternalImportStats()
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

  fastify.patch(
    '/vendors/:id',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Modifie le contact d\'un vendeur (admin)',
        body: zodToFastify(adminUpdateVendorSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await updateAdminVendor(id, request.body as Record<string, never>)
      request.log.info({ event: 'ADMIN_VENDOR_UPDATED', vendorId: id })
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

  // Subscriptions admin (Phase 1 — manual activation)
  fastify.get(
    '/enterprises/:id/subscriptions',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Historique des abonnements d\'une entreprise' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await listSubscriptionsForEnterprise(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/enterprises/:id/subscription',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], security: [{ BearerAuth: [] }], description: 'Abonnement actif d\'une entreprise + tarif estimé selon nb véhicules' },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const sub = await getCurrentSubscription(id)
      const vehicleCount = await prisma.vehicle.count({ where: { enterpriseId: id } })
      const tier = sub?.tier ?? 'FREE'
      const pricing = computeMonthlyAmount(tier as SubscriptionTier, vehicleCount)
      return reply.status(200).send({ data: { subscription: sub, pricing } })
    },
  )

  fastify.post(
    '/enterprises/:id/subscriptions',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Crée un abonnement pour une entreprise (annule l\'actif précédent)',
        body: zodToFastify(createSubscriptionSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as {
        tier: SubscriptionTier
        billingCycle?: BillingCycle
        startTrial?: boolean
        trialDays?: number
        notes?: string | null
      }
      const userId = (request as { user?: { id?: string } }).user?.id
      const sub = await createSubscription(id, { ...body, actorUserId: userId })
      request.log.info({ event: 'SUBSCRIPTION_CREATED', enterpriseId: id, subscriptionId: sub.id, tier: sub.tier })
      return reply.status(201).send({ data: sub })
    },
  )

  fastify.patch(
    '/subscriptions/:subscriptionId',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: {
        tags: ['Admin'], security: [{ BearerAuth: [] }],
        description: 'Modifie un abonnement (tier, status, cycle, notes)',
        body: zodToFastify(updateSubscriptionSchema),
      },
    },
    async (request, reply) => {
      const { subscriptionId } = request.params as { subscriptionId: string }
      const body = request.body as {
        tier?: SubscriptionTier
        status?: SubscriptionStatus
        billingCycle?: BillingCycle
        notes?: string | null
      }
      const userId = (request as { user?: { id?: string } }).user?.id
      const sub = await updateSubscription(subscriptionId, { ...body, actorUserId: userId })
      request.log.info({ event: 'SUBSCRIPTION_UPDATED', subscriptionId })
      return reply.status(200).send({ data: sub })
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

  // Liaisons oversight
  fastify.get(
    '/liaisons',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Liste des Liaisons + stats', security: [{ BearerAuth: [] }] },
    },
    async (_request, reply) => {
      const result = await getAdminLiaisonsList()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/liaisons/:id',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Détail d\'un Liaison', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getAdminLiaisonDetail(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/liaisons/:id/activity',
    {
      preHandler: [requireAuth, requireRole('ADMIN')],
      schema: { tags: ['Admin'], description: 'Journal d\'activité d\'un Liaison', security: [{ BearerAuth: [] }] },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const query = request.query as { page?: string; limit?: string }
      const result = await getAdminLiaisonActivity(
        id,
        Number(query.page) || 1,
        Number(query.limit) || 50,
      )
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
