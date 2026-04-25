import type { FastifyInstance } from 'fastify'
import {
  liaisonCreateVendorSchema,
  liaisonUpdateVendorSchema,
  liaisonCreatePartSchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createVendorByLiaison,
  listLiaisonVendors,
  getLiaisonVendor,
  updateLiaisonVendor,
  createPartForVendor,
  listVendorParts,
  listLiaisonParts,
  getLiaisonDashboard,
} from './liaison.service.js'

export async function liaisonRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('LIAISON', 'ADMIN')]

  fastify.get(
    '/dashboard',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Statistiques de la liaison (vendeurs, pièces)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await getLiaisonDashboard(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/vendors',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Liste des vendeurs gérés par la liaison',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listLiaisonVendors(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/vendors',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Créer un nouveau vendeur (onboarding terrain par la liaison)',
        body: zodToFastify(liaisonCreateVendorSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createVendorByLiaison(request.user.id, request.body)
      request.log.info({
        event: 'LIAISON_VENDOR_CREATED',
        liaisonId: request.user.id,
        vendorId: result.id,
      })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/vendors/:id',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Détail d\'un vendeur géré',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getLiaisonVendor(request.user.id, id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/vendors/:id',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Mettre à jour un vendeur géré',
        body: zodToFastify(liaisonUpdateVendorSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateLiaisonVendor(request.user.id, id, request.body)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/vendors/:id/parts',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Liste des pièces d\'un vendeur géré',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await listVendorParts(request.user.id, id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/vendors/:id/parts',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Ajouter une pièce au catalogue d\'un vendeur géré',
        body: zodToFastify(liaisonCreatePartSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await createPartForVendor(request.user.id, id, request.body)
      request.log.info({
        event: 'LIAISON_PART_CREATED',
        liaisonId: request.user.id,
        vendorId: id,
        partId: result.id,
      })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/parts',
    {
      schema: {
        tags: ['Liaison'],
        description: 'Liste de toutes les pièces saisies par la liaison',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listLiaisonParts(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )
}
