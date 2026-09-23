import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../../plugins/auth.js'
import { requireRoleOrCapability } from '../../plugins/erpAuth.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import {
  registerMechanicSchema,
  updateMechanicSchema,
  suspendMechanicSchema,
  mechanicSearchQuerySchema,
  mechanicParamsSchema,
  createMechanicReviewSchema,
} from 'shared/validators'
import type { MechanicSpecialty } from 'shared/constants'
import {
  registerMechanic,
  getMyMechanic,
  getMechanic,
  updateMechanic,
  searchMechanics,
  suspendMechanic,
  reinstateMechanic,
  createMechanicReview,
  listMechanicReviews,
  hideMechanicReview,
  type RegisterMechanicInput,
  type UpdateMechanicInput,
} from './mechanic.service.js'

export async function mechanicRoutes(fastify: FastifyInstance) {
  // Inscription self-service — auto-publiée, aucun rôle requis au-delà d'être
  // authentifié (Mechanic n'est pas un des 7 rôles plateforme).
  fastify.post(
    '/',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Mechanics'],
        description: 'Inscrire sa fiche mécanicien/garage',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(registerMechanicSchema),
      },
    },
    async (request, reply) => {
      const body = request.body as RegisterMechanicInput
      const result = await registerMechanic(request.user.id, body)
      request.log.info({ event: 'MECHANIC_REGISTERED', userId: request.user.id, mechanicId: result.id })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/me',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Mechanics'],
        description: "Fiche mécanicien de l'utilisateur connecté",
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const result = await getMyMechanic(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  // Recherche/annuaire public — géo (lat/lng/radiusKm), commune, spécialité, texte.
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Mechanics'],
        description: 'Rechercher des mécaniciens (géo, commune, spécialité)',
        querystring: zodToFastify(mechanicSearchQuerySchema),
      },
    },
    async (request, reply) => {
      const query = request.query as {
        lat?: string
        lng?: string
        radiusKm?: string
        commune?: string
        specialty?: MechanicSpecialty
        q?: string
        page?: string
        limit?: string
      }
      const result = await searchMechanics({
        lat: query.lat !== undefined ? Number(query.lat) : undefined,
        lng: query.lng !== undefined ? Number(query.lng) : undefined,
        radiusKm: query.radiusKm !== undefined ? Number(query.radiusKm) : undefined,
        commune: query.commune,
        specialty: query.specialty,
        q: query.q,
        page: query.page !== undefined ? Number(query.page) : undefined,
        limit: query.limit !== undefined ? Number(query.limit) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Mechanics'],
        description: 'Profil public d’un mécanicien',
        params: zodToFastify(mechanicParamsSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getMechanic(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Mechanics'],
        description: 'Modifier une fiche mécanicien (propriétaire, LIAISON ou ADMIN)',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(mechanicParamsSchema),
        body: zodToFastify(updateMechanicSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as UpdateMechanicInput
      const result = await updateMechanic(
        { id: request.user.id, roles: request.user.roles },
        id,
        body,
      )
      request.log.info({ event: 'MECHANIC_UPDATED', userId: request.user.id, mechanicId: id })
      return reply.status(200).send({ data: result })
    },
  )

  // Avis — ouvert à tout utilisateur authentifié, pas besoin d'une transaction
  // pieces.ci (la plupart des interactions mécanicien se passent hors plateforme).
  fastify.post(
    '/:id/reviews',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Mechanics'],
        description: 'Laisser un avis sur un mécanicien',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(mechanicParamsSchema),
        body: zodToFastify(createMechanicReviewSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { rating, comment } = request.body as { rating: number; comment?: string }
      const result = await createMechanicReview(request.user.id, id, { rating, comment })
      request.log.info({ event: 'MECHANIC_REVIEW_CREATED', userId: request.user.id, mechanicId: id })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/:id/reviews',
    {
      schema: {
        tags: ['Mechanics'],
        description: 'Lister les avis publiés d’un mécanicien',
        params: zodToFastify(mechanicParamsSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const query = request.query as { page?: string; limit?: string }
      const result = await listMechanicReviews(id, {
        page: query.page !== undefined ? Number(query.page) : undefined,
        limit: query.limit !== undefined ? Number(query.limit) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )

  const moderationGuard = [requireAuth, requireRoleOrCapability(['LIAISON'], 'mechanics:moderate')]

  fastify.post(
    '/:id/suspend',
    {
      preHandler: moderationGuard,
      schema: {
        tags: ['Mechanics'],
        description: 'Suspendre une fiche mécanicien signalée',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(mechanicParamsSchema),
        body: zodToFastify(suspendMechanicSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { reason } = request.body as { reason: string }
      const result = await suspendMechanic(id, request.user.id, reason)
      request.log.info({ event: 'MECHANIC_SUSPENDED', userId: request.user.id, mechanicId: id })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/:id/reinstate',
    {
      preHandler: moderationGuard,
      schema: {
        tags: ['Mechanics'],
        description: 'Réactiver une fiche mécanicien suspendue',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(mechanicParamsSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await reinstateMechanic(id, request.user.id)
      request.log.info({ event: 'MECHANIC_REINSTATED', userId: request.user.id, mechanicId: id })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/reviews/:id/hide',
    {
      preHandler: moderationGuard,
      schema: {
        tags: ['Mechanics'],
        description: 'Masquer un avis signalé',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(mechanicParamsSchema),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await hideMechanicReview(id, request.user.id)
      request.log.info({ event: 'MECHANIC_REVIEW_HIDDEN', userId: request.user.id, reviewId: id })
      return reply.status(200).send({ data: result })
    },
  )
}
