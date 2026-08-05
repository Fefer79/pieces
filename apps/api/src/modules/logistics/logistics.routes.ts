import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import {
  createLogisticsQuoteRequestSchema,
  logisticsPublicLookupSchema,
  adminLogisticsListQuerySchema,
  adminUpdateLogisticsQuoteRequestSchema,
  enterpriseLogisticsListQuerySchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  createQuoteRequest,
  addQuoteRequestPhoto,
  getQuoteRequestByReference,
  listQuoteRequestsForUser,
  listQuoteRequestsForEnterprise,
  getQuoteRequestForEnterprise,
  adminListQuoteRequests,
  adminQuoteRequestStats,
  adminGetQuoteRequest,
  adminUpdateQuoteRequest,
} from './logistics.service.js'
import type { LogisticsLeadPhotoKind } from '@prisma/client'

const PHOTO_KINDS: LogisticsLeadPhotoKind[] = ['PART', 'REGISTRATION_CARD', 'OTHER']

/**
 * Authentification OPTIONNELLE. Un Bearer valide enrichit le lead (userId,
 * flotte, véhicule) ; un jeton absent, expiré ou invalide dégrade simplement en
 * mode public — on ne renvoie JAMAIS 401 sur une route ouverte, sinon un
 * visiteur dont la session a expiré se retrouve bloqué sans comprendre.
 */
async function optionalAuth(request: FastifyRequest) {
  if (!request.headers.authorization?.startsWith('Bearer ')) return
  try {
    await requireAuth(request)
  } catch {
    // Silencieux : le lead sera créé en mode public.
  }
}

export async function logisticsRoutes(fastify: FastifyInstance) {
  // --- Création d'une demande de cotation (public, auth facultative) ---
  fastify.post(
    '/quote-requests',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Logistics'],
        description:
          'Créer une demande de cotation logistique. Accessible sans compte ; un Bearer valide rattache la demande au compte et à sa flotte.',
        body: zodToFastify(createLogisticsQuoteRequestSchema),
      },
      config: { rateLimit: { max: 5, timeWindow: '10 minutes' } },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await createQuoteRequest(request.body, {
        userId: request.user?.id ?? null,
        ip: request.ip,
        userAgent: request.headers['user-agent'] ?? null,
        referer: request.headers.referer ?? null,
      })
      return reply.status(201).send({ data })
    },
  )

  // --- Ajout d'une photo (jeton d'upload OU compte propriétaire) ---
  fastify.post(
    '/quote-requests/:id/photos',
    {
      preHandler: [optionalAuth],
      schema: {
        tags: ['Logistics'],
        description:
          'Ajoute une photo (pièce ou carte grise) à une demande. multipart/form-data : champ fichier "file", champ "kind". En-tête x-upload-token requis sans session.',
        consumes: ['multipart/form-data'],
      },
      config: { rateLimit: { max: 12, timeWindow: '10 minutes' } },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({
          error: { code: 'MISSING_IMAGE', message: 'Aucune image fournie', statusCode: 400 },
        })
      }

      const rawKind = (file.fields?.kind as { value?: string } | undefined)?.value
      const kind = PHOTO_KINDS.includes(rawKind as LogisticsLeadPhotoKind)
        ? (rawKind as LogisticsLeadPhotoKind)
        : 'OTHER'

      const buffer = await file.toBuffer()
      const uploadToken = (request.headers['x-upload-token'] as string | undefined) ?? null

      const data = await addQuoteRequestPhoto(id, uploadToken, request.user?.id ?? null, {
        buffer,
        mimeType: file.mimetype,
        filename: file.filename,
        kind,
      })
      // Volontairement sans URL : une carte grise ne doit pas fuiter par une
      // réponse publique (cf. logistics.service.ts).
      return reply.status(201).send({ data })
    },
  )

  // --- Suivi public par référence + jeton ---
  fastify.get(
    '/quote-requests/:reference/public',
    {
      schema: {
        tags: ['Logistics'],
        description: 'Consulter une demande par sa référence, avec le jeton reçu à la création',
        querystring: zodToFastify(logisticsPublicLookupSchema),
      },
      config: { rateLimit: { max: 30, timeWindow: '10 minutes' } },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { reference } = request.params as { reference: string }
      const { t } = request.query as { t: string }
      const data = await getQuoteRequestByReference(reference, t)
      return reply.send({ data })
    },
  )

  // --- Mes cotations (compte simple) ---
  fastify.get(
    '/quote-requests/mine',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Logistics'],
        description: 'Lister mes demandes de cotation',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await listQuoteRequestsForUser(request.user.id)
      return reply.send({ data })
    },
  )
}

/**
 * Routes scopées entreprise — montées sous /api/v1/enterprises pour rester
 * cohérentes avec enterprise.routes.ts, mais servies par le module logistics.
 */
export async function enterpriseLogisticsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/:enterpriseId/logistics/quote-requests',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Logistics'],
        description: 'Cotations logistique de la flotte',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(enterpriseLogisticsListQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { enterpriseId } = request.params as { enterpriseId: string }
      const data = await listQuoteRequestsForEnterprise(
        enterpriseId,
        request.user.id,
        enterpriseLogisticsListQuerySchema.parse(request.query),
      )
      return reply.send({ data })
    },
  )

  fastify.get(
    '/:enterpriseId/logistics/quote-requests/:id',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Logistics'],
        description: 'Détail d\'une cotation logistique de la flotte',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { enterpriseId, id } = request.params as { enterpriseId: string; id: string }
      const data = await getQuoteRequestForEnterprise(enterpriseId, request.user.id, id)
      return reply.send({ data })
    },
  )
}

export async function adminLogisticsRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/quote-requests',
    {
      preHandler: [requireAuth, requireCapability('crm:read')],
      schema: {
        tags: ['Admin'],
        description: 'File des demandes de cotation logistique',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(adminLogisticsListQuerySchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = await adminListQuoteRequests(adminLogisticsListQuerySchema.parse(request.query))
      return reply.send({ data })
    },
  )

  fastify.get(
    '/quote-requests/stats',
    {
      preHandler: [requireAuth, requireCapability('crm:read')],
      schema: {
        tags: ['Admin'],
        description: 'Entonnoir des cotations logistique',
        security: [{ BearerAuth: [] }],
      },
    },
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const data = await adminQuoteRequestStats()
      return reply.send({ data })
    },
  )

  fastify.get(
    '/quote-requests/:id',
    {
      preHandler: [requireAuth, requireCapability('crm:read')],
      schema: {
        tags: ['Admin'],
        description: 'Détail d\'une demande de cotation logistique',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const data = await adminGetQuoteRequest(id)
      return reply.send({ data })
    },
  )

  fastify.patch(
    '/quote-requests/:id',
    {
      preHandler: [requireAuth, requireCapability('crm:read')],
      schema: {
        tags: ['Admin'],
        description: 'Mettre à jour le statut / la note ops d\'une cotation',
        security: [{ BearerAuth: [] }],
        body: zodToFastify(adminUpdateLogisticsQuoteRequestSchema),
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const data = await adminUpdateQuoteRequest(
        id,
        request.user.id,
        adminUpdateLogisticsQuoteRequestSchema.parse(request.body),
      )
      return reply.send({ data })
    },
  )
}
