import type { FastifyInstance } from 'fastify'
import {
  sourcingSearchCreateSchema,
  adminSourcingListQuerySchema,
  offerUrlsSchema,
  offerUpdateSchema,
  offerToPurchaseOrderSchema,
  shipmentCreateSchema,
  shipmentUpdateSchema,
  shipmentTransitionSchema,
  adminShipmentListQuerySchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createSearch,
  getSearch,
  adminListSearches,
  adminSearchStats,
  addOffersFromUrls,
  updateOffer,
  deleteOffer,
  buildOfferMatrix,
  createPurchaseOrderFromOffer,
} from './sourcing.service.js'
import {
  createShipment,
  getShipment,
  adminListShipments,
  adminShipmentStats,
  updateShipment,
  transitionShipment,
  notifyShipmentUpdate,
} from './shipment.service.js'

export async function sourcingRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  fastify.post(
    '/searches',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Ouvrir le dossier de sourcing d\'une demande (idempotent : renvoie le dossier existant)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(sourcingSearchCreateSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const data = await createSearch(request.user.id, request.body)
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/searches',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Liste des dossiers de sourcing',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(adminSourcingListQuerySchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const data = await adminListSearches(request.query)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/searches/stats',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Compteurs du cockpit sourcing',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const data = await adminSearchStats()
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/searches/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Détail d\'un dossier de sourcing et de ses offres',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getSearch(id)
      return reply.status(200).send({ data })
    },
  )

  // Le geste central : coller des liens de pages vendeur, un par ligne.
  fastify.post(
    '/searches/:id/offers',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Ajouter des offres en collant les liens des pages vendeur (max 20)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(offerUrlsSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await addOffersFromUrls(id, request.user.id, request.body)
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/searches/:id/matrix',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Matrice d\'arbitrage des offres retenues (coût rendu Abidjan, immobilisation comprise)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await buildOfferMatrix(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.patch(
    '/offers/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Compléter une offre (prix, devise, pays, délai, condition, shortlist…)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(offerUpdateSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await updateOffer(id, request.body)
      return reply.status(200).send({ data })
    },
  )

  fastify.delete(
    '/offers/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Supprimer une offre collée par erreur',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await deleteOffer(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/offers/:id/purchase-order',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Créer le bon de commande depuis une offre retenue',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(offerToPurchaseOrderSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await createPurchaseOrderFromOffer(id, request.user.id, request.body)
      return reply.status(201).send({ data })
    },
  )
}

export async function shipmentRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('ADMIN')]

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Liste des expéditions',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(adminShipmentListQuerySchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const data = await adminListShipments(request.query)
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Compteurs du cockpit expéditions',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const data = await adminShipmentStats()
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Créer une expédition (transporteur + numéro de suivi)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(shipmentCreateSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const data = await createShipment(request.user.id, request.body)
      return reply.status(201).send({ data })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Détail d\'une expédition et de ses étapes',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await getShipment(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Mettre à jour une expédition (numéro de suivi, ETA, coûts)',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(shipmentUpdateSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await updateShipment(id, request.body)
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/:id/transition',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Faire avancer l\'expédition d\'une étape',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(shipmentTransitionSchema),
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await transitionShipment(id, request.user.id, request.body)
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/:id/notify',
    {
      schema: {
        tags: ['Sourcing'],
        description: 'Prévenir le demandeur par WhatsApp (le transitaire n\'est jamais nommé)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await notifyShipmentUpdate(id)
      return reply.status(200).send({ data })
    },
  )
}
