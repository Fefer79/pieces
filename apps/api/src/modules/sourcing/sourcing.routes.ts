import type { FastifyInstance } from 'fastify'
import {
  sourcingSearchCreateSchema,
  sourcingIdParamsSchema,
  adminSourcingListQuerySchema,
  offerUpdateSchema,
  offerToPurchaseOrderSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createSearch,
  getSearch,
  adminListSearches,
  adminSearchStats,
  updateOffer,
  buildOfferMatrix,
  createPurchaseOrderFromOffer,
  buildSupplierMessage,
} from './sourcing.service.js'

/**
 * Module ERP « Sourcing » — /api/v1/admin/sourcing. Entièrement back-office :
 * aucune surface publique ici (le client voit l'expédition, pas les offres).
 */
export async function sourcingRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Compteurs du cockpit sourcing (recherches par statut, offres par statut)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      return reply.status(200).send({ data: await adminSearchStats() })
    },
  )

  fastify.get(
    '/searches',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Liste paginée des recherches d\'offres',
        querystring: zodToFastify(adminSourcingListQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      return reply.status(200).send({ data: await adminListSearches(request.query) })
    },
  )

  fastify.post(
    '/searches',
    {
      schema: {
        tags: ['Sourcing'],
        description:
          'Lancer une recherche d\'offres (asynchrone : la recherche est enfilée, le worker l\'exécute). Refusée si une recherche est déjà en cours sur la même demande.',
        body: zodToFastify(sourcingSearchCreateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const search = await createSearch(request.body, request.user.id)
      request.log.info({
        event: 'SOURCING_SEARCH_CREATED',
        adminId: request.user.id,
        searchId: search.id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SOURCING_SEARCH_CREATED',
        targetType: 'SourcingSearch',
        targetId: search.id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(201).send({ data: search })
    },
  )

  fastify.get(
    '/searches/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Détail d\'une recherche et de ses offres',
        params: zodToFastify(sourcingIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await getSearch(id) })
    },
  )

  fastify.get(
    '/searches/:id/matrix',
    {
      schema: {
        tags: ['Sourcing'],
        description:
          'Matrice d\'arbitrage des offres retenues : coût rendu Abidjan, immobilisation comprise',
        params: zodToFastify(sourcingIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await buildOfferMatrix(id) })
    },
  )

  fastify.patch(
    '/offers/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Arbitrage d\'une offre : shortlist, rejet, note, mode forcé, prix confirmé',
        params: zodToFastify(sourcingIdParamsSchema),
        body: zodToFastify(offerUpdateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await updateOffer(id, request.body) })
    },
  )

  fastify.post(
    '/offers/:id/purchase-order',
    {
      schema: {
        tags: ['Sourcing'],
        description:
          'Générer le bon de commande depuis une offre retenue (fournisseur créé si nécessaire)',
        params: zodToFastify(sourcingIdParamsSchema),
        body: zodToFastify(offerToPurchaseOrderSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const po = await createPurchaseOrderFromOffer(id, request.body, request.user.id)
      request.log.info({
        event: 'SOURCING_PO_CREATED',
        adminId: request.user.id,
        offerId: id,
        purchaseOrderId: po.id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SOURCING_PO_CREATED',
        targetType: 'PurchaseOrder',
        targetId: po.id,
        payload: { offerId: id },
      }).catch(() => {})
      return reply.status(201).send({ data: po })
    },
  )

  fastify.post(
    '/offers/:id/message',
    {
      schema: {
        tags: ['Sourcing'],
        description:
          'Brouillon de message d\'enquête fournisseur. Ne l\'envoie PAS : renvoie le texte et les liens wa.me / mailto.',
        params: zodToFastify(sourcingIdParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
      config: { rateLimit: { max: 20, timeWindow: '10 minutes' } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await buildSupplierMessage(id, request.log) })
    },
  )
}
