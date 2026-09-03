import type { FastifyInstance } from 'fastify'
import { createVendorSchema, updateDeliveryZonesSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { AppError } from '../../lib/appError.js'
import { createVendor, getMyVendor, signGuarantees, getGuaranteeStatus, getDeliveryZones, updateDeliveryZones, getVendorDashboard, uploadMyKycPhoto, getMyKycPhoto } from './vendor.service.js'

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

  fastify.post(
    '/me/kyc-photo',
    {
      schema: {
        tags: ['Vendors'],
        description:
          'Photographier sa pièce d\'identité (CNI, passeport, permis) ou son RCCM',
        security: [{ BearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const file = await request.file()
      if (!file) {
        throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
      }
      const buffer = await file.toBuffer()
      const result = await uploadMyKycPhoto(request.user.id, buffer, file.mimetype)
      request.log.info({
        event: 'VENDOR_KYC_PHOTO_UPLOADED',
        userId: request.user.id,
        vendorId: result.vendorId,
      })
      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/me/kyc-photo',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Récupérer sa pièce d\'identité enregistrée',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { buffer, mimeType } = await getMyKycPhoto(request.user.id)
      return reply
        .header('Content-Type', mimeType)
        .header('Cache-Control', 'private, no-store')
        .send(buffer)
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

  fastify.get(
    '/me/delivery-zones',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Obtenir les zones de livraison configurées par le vendeur',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await getDeliveryZones(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.put(
    '/me/delivery-zones',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Configurer les zones de livraison du vendeur',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(updateDeliveryZonesSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { zones } = request.body as { zones: string[] }
      const result = await updateDeliveryZones(request.user.id, zones)

      request.log.info({ event: 'VENDOR_DELIVERY_ZONES_UPDATED', userId: request.user.id, zones })

      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/me/dashboard',
    {
      schema: {
        tags: ['Vendors'],
        description: 'Tableau de bord vendeur avec statistiques catalogue',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const result = await getVendorDashboard(request.user.id)
      return reply.status(200).send({ data: result })
    },
  )
}
