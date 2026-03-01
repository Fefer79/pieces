import type { FastifyInstance } from 'fastify'
import { createVendorSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { createVendor, getMyVendor, signGuarantees, getGuaranteeStatus } from './vendor.service.js'

export async function vendorRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/',
    {
      schema: {
        body: zodToFastify(createVendorSchema),
        tags: ['Vendors'],
        description: 'Créer un profil vendeur avec KYC (onboarding agent terrain)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await createVendor(request.user.id, request.body)
      request.log.info({ event: 'VENDOR_CREATED', userId: request.user.id, vendorId: result.id })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/me',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Obtenir le profil vendeur de l\'utilisateur connecté',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await getMyVendor(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/me/signature',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Signer les garanties obligatoires et activer le profil vendeur',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await signGuarantees(request.user.id)
      request.log.info({ event: 'VENDOR_ACTIVATED', userId: request.user.id, vendorId: result.id })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/me/guarantees',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Obtenir le statut des garanties du vendeur',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await getGuaranteeStatus(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )
}
