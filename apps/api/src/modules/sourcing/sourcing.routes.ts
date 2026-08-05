import type { FastifyInstance } from 'fastify'
import {
  sourcingSearchCreateSchema,
  sourcingSearchParamsSchema,
  sourcingOfferParamsSchema,
  offerCreateSchema,
  offerUpdateSchema,
  adminSourcingListQuerySchema,
  createPurchaseOrderFromOfferSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  createSearch,
  getSearch,
  adminListSearches,
  adminSearchStats,
  createOffer,
  updateOffer,
  deleteOffer,
  buildOfferMatrix,
  createPurchaseOrderFromOffer,
  draftMessageForOffer,
} from './sourcing.service.js'

/** Monté sous /api/v1/admin/sourcing — back-office uniquement. */
export async function sourcingRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('purchase:read')]

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Compteurs du cockpit sourcing',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => reply.status(200).send({ data: await adminSearchStats() }),
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
    async (request, reply) =>
      reply.status(200).send({ data: await adminListSearches(request.query) }),
  )

  fastify.post(
    '/searches',
    {
      schema: {
        tags: ['Sourcing'],
        description:
          'Ouvrir un dossier de sourcing. origin=MANUAL (défaut) crée un dossier vide à remplir à la main ; origin=AGENT lance en plus la recherche automatique en tâche de fond.',
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
        partName: search.partName,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SOURCING_SEARCH_CREATED',
        targetType: 'SourcingSearch',
        targetId: search.id,
        payload: { partName: search.partName, origin: search.origin },
      }).catch(() => {})
      // 202 seulement quand un traitement de fond a réellement été mis en file.
      return reply.status(search.origin === 'AGENT' ? 202 : 201).send({ data: search })
    },
  )

  fastify.get(
    '/searches/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Détail d\'une recherche et ses offres',
        params: zodToFastify(sourcingSearchParamsSchema),
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
        description: 'Matrice d\'arbitrage des offres retenues (coût rendu Abidjan)',
        params: zodToFastify(sourcingSearchParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await buildOfferMatrix(id) })
    },
  )

  fastify.post(
    '/searches/:id/offers',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Saisir manuellement une offre relevée par un opérateur',
        params: zodToFastify(sourcingSearchParamsSchema),
        body: zodToFastify(offerCreateSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const offer = await createOffer(id, request.body)
      request.log.info({
        event: 'SOURCING_OFFER_CREATED',
        adminId: request.user.id,
        searchId: id,
        offerId: offer.id,
      })
      return reply.status(201).send({ data: offer })
    },
  )

  fastify.patch(
    '/offers/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Shortlister, rejeter, annoter ou corriger le prix d\'une offre',
        params: zodToFastify(sourcingOfferParamsSchema),
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

  fastify.delete(
    '/offers/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Supprimer une offre saisie par erreur (impossible si commandée)',
        params: zodToFastify(sourcingOfferParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await deleteOffer(id) })
    },
  )

  fastify.post(
    '/offers/:id/message',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Brouillon de message d\'enquête fournisseur (aucun envoi)',
        params: zodToFastify(sourcingOfferParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      return reply.status(200).send({ data: await draftMessageForOffer(id) })
    },
  )

  fastify.post(
    '/offers/:id/purchase-order',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Générer le bon de commande depuis une offre',
        params: zodToFastify(sourcingOfferParamsSchema),
        body: zodToFastify(createPurchaseOrderFromOfferSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const po = await createPurchaseOrderFromOffer(id, request.user.id, request.body)
      request.log.info({
        event: 'SOURCING_PO_CREATED',
        adminId: request.user.id,
        offerId: id,
        purchaseOrderId: po.id,
        numero: po.numero,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'SOURCING_PO_CREATED',
        targetType: 'PurchaseOrder',
        targetId: po.id,
        payload: { numero: po.numero, offerId: id },
      }).catch(() => {})
      return reply.status(201).send({ data: po })
    },
  )
}
