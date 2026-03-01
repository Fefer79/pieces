import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { uploadPartImage, getMyItems, getItem } from './catalog.service.js'
import { AppError } from '../../lib/appError.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { catalogItemFilterSchema } from 'shared/validators'

export async function catalogRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/items/upload',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Upload une photo de pièce pour génération catalogue IA',
        security: [{ BearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const data = await request.file()

      if (!data) {
        throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
      }

      const buffer = await data.toBuffer()
      const result = await uploadPartImage(
        request.user.id,
        buffer,
        data.filename,
        data.mimetype,
      )

      request.log.info({
        event: 'CATALOG_IMAGE_UPLOADED',
        userId: request.user.id,
        itemId: result.id,
      })

      return reply.status(201).send({ data: result })
    },
  )

  fastify.get(
    '/items',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Liste les fiches catalogue du vendeur connecté',
        security: [{ BearerAuth: [] }],
        querystring: zodToFastify(catalogItemFilterSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const query = request.query as { status?: string; page?: string; limit?: string }
      const result = await getMyItems(request.user.id, {
        status: query.status as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | undefined,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      })

      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/items/:id',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Détail d\'une fiche catalogue',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getItem(request.user.id, id)

      return reply.status(200).send({ data: result })
    },
  )
}
