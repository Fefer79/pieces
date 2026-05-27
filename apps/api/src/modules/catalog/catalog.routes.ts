import type { FastifyInstance } from 'fastify'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { uploadPartImage, getMyItems, getItem, updateItem, publishItem, toggleStock, retryImageJob, addPhoto, removePhoto, reorderPhotos, listPhotos, listFitments, replaceFitments, addFitment, deleteFitment, type UpdateCatalogItemData, type FitmentInput } from './catalog.service.js'
import { AppError } from '../../lib/appError.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { catalogItemFilterSchema, catalogItemParamsSchema, updateCatalogItemSchema, toggleStockSchema, photoParamsSchema, reorderPhotosSchema, fitmentSchema, fitmentParamsSchema, replaceFitmentsSchema } from 'shared/validators'

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
      const parts = request.parts()
      let fileBuffer: Buffer | null = null
      let fileName = ''
      let mimeType = ''
      let serialPhotoBuffer: Buffer | null = null
      let serialPhotoName = ''
      let serialPhotoMime = ''
      const fields: Record<string, string> = {}

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname === 'serialPhoto') {
            serialPhotoBuffer = await part.toBuffer()
            serialPhotoName = part.filename
            serialPhotoMime = part.mimetype
          } else {
            fileBuffer = await part.toBuffer()
            fileName = part.filename
            mimeType = part.mimetype
          }
        } else {
          fields[part.fieldname] = part.value as string
        }
      }

      if (!fileBuffer) {
        throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
      }

      const result = await uploadPartImage(
        request.user.id,
        fileBuffer,
        fileName,
        mimeType,
        {
          name: fields.name || undefined,
          serialNumber: fields.serialNumber || undefined,
          category: fields.category || undefined,
          vehicleCompatibility: fields.vehicleCompatibility || undefined,
          condition: (fields.condition as 'NEW' | 'USED' | 'REFURBISHED' | undefined) || undefined,
          warrantyMonths: fields.warrantyMonths ? parseInt(fields.warrantyMonths, 10) : undefined,
          serialPhoto: serialPhotoBuffer ? { buffer: serialPhotoBuffer, fileName: serialPhotoName, mimeType: serialPhotoMime } : undefined,
        },
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
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getItem(request.user.id, id)

      return reply.status(200).send({ data: result })
    },
  )

  fastify.patch(
    '/items/:id',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Mise à jour partielle d\'une fiche catalogue',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
        body: zodToFastify(updateCatalogItemSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as UpdateCatalogItemData
      const result = await updateItem(request.user.id, id, body, request.log)

      request.log.info({ event: 'CATALOG_ITEM_UPDATED', userId: request.user.id, itemId: id })

      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/items/:id/publish',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Publier une fiche catalogue (DRAFT → PUBLISHED)',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await publishItem(request.user.id, id)

      request.log.info({ event: 'CATALOG_ITEM_PUBLISHED', userId: request.user.id, itemId: id })

      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/items/:id/retry-image',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Relancer le traitement image après échec',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await retryImageJob(request.user.id, id)

      request.log.info({ event: 'CATALOG_IMAGE_RETRIED', userId: request.user.id, itemId: id, requeued: result.requeued })

      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/items/:id/photos',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Liste les photos d\'une fiche catalogue',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await listPhotos(request.user.id, id)
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/items/:id/photos',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Ajoute une photo (max 3) à une fiche catalogue',
        security: [{ BearerAuth: [] }],
        consumes: ['multipart/form-data'],
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const file = await request.file()
      if (!file) {
        throw new AppError('MISSING_FILE', 422, { message: 'Aucun fichier fourni' })
      }
      const buffer = await file.toBuffer()
      const data = await addPhoto(request.user.id, id, buffer, file.filename, file.mimetype)
      request.log.info({ event: 'CATALOG_PHOTO_ADDED', userId: request.user.id, itemId: id, photoId: data.id, position: data.position })
      return reply.status(201).send({ data })
    },
  )

  fastify.delete(
    '/items/:id/photos/:photoId',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Supprime une photo d\'une fiche catalogue',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(photoParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id, photoId } = request.params as { id: string; photoId: string }
      const data = await removePhoto(request.user.id, id, photoId)
      request.log.info({ event: 'CATALOG_PHOTO_REMOVED', userId: request.user.id, itemId: id, photoId })
      return reply.status(200).send({ data })
    },
  )

  fastify.patch(
    '/items/:id/photos/reorder',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Réordonne les photos d\'une fiche catalogue',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
        body: zodToFastify(reorderPhotosSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { photoIds } = request.body as { photoIds: string[] }
      const data = await reorderPhotos(request.user.id, id, photoIds)
      request.log.info({ event: 'CATALOG_PHOTOS_REORDERED', userId: request.user.id, itemId: id })
      return reply.status(200).send({ data })
    },
  )

  fastify.get(
    '/items/:id/fitments',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Liste les compatibilités véhicule d\'une fiche',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const data = await listFitments(id)
      return reply.status(200).send({ data })
    },
  )

  fastify.put(
    '/items/:id/fitments',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Remplace la liste des compatibilités véhicule',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
        body: zodToFastify(replaceFitmentsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { fitments } = request.body as { fitments: FitmentInput[] }
      const data = await replaceFitments(request.user.id, id, fitments)
      request.log.info({ event: 'CATALOG_FITMENTS_REPLACED', userId: request.user.id, itemId: id, count: data.length })
      return reply.status(200).send({ data })
    },
  )

  fastify.post(
    '/items/:id/fitments',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Ajoute une compatibilité véhicule',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
        body: zodToFastify(fitmentSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as FitmentInput
      const data = await addFitment(request.user.id, id, body)
      request.log.info({ event: 'CATALOG_FITMENT_ADDED', userId: request.user.id, itemId: id, fitmentId: data.id })
      return reply.status(201).send({ data })
    },
  )

  fastify.delete(
    '/items/:id/fitments/:fitmentId',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Supprime une compatibilité véhicule',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(fitmentParamsSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id, fitmentId } = request.params as { id: string; fitmentId: string }
      const data = await deleteFitment(request.user.id, id, fitmentId)
      request.log.info({ event: 'CATALOG_FITMENT_REMOVED', userId: request.user.id, itemId: id, fitmentId })
      return reply.status(200).send({ data })
    },
  )

  fastify.patch(
    '/items/:id/stock',
    {
      schema: {
        tags: ['Catalog'],
        description: 'Toggle stock d\'une fiche catalogue (en stock / épuisée)',
        security: [{ BearerAuth: [] }],
        params: zodToFastify(catalogItemParamsSchema),
        body: zodToFastify(toggleStockSchema),
      },
      preHandler: [requireAuth, requireRole('SELLER', 'ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { inStock } = request.body as { inStock: boolean }
      const result = await toggleStock(request.user.id, id, inStock)

      request.log.info({ event: 'CATALOG_STOCK_TOGGLED', userId: request.user.id, itemId: id, inStock })

      return reply.status(200).send({ data: result })
    },
  )
}
