import type { FastifyInstance } from 'fastify'
import { identifyFromPhoto, searchByCategory } from './vision.service.js'

export async function visionRoutes(fastify: FastifyInstance) {
  // POST /identify — upload photo for AI identification (no auth required for MVP)
  fastify.post(
    '/identify',
    {
      schema: {
        tags: ['Vision'],
        description: 'Identifier une pièce par photo via Gemini VLM',
        consumes: ['multipart/form-data'],
      },
    },
    async (request, reply) => {
      const file = await request.file()
      if (!file) {
        return reply.status(400).send({
          error: { code: 'MISSING_IMAGE', message: 'Aucune image fournie', statusCode: 400 },
        })
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) {
        return reply.status(422).send({
          error: { code: 'INVALID_IMAGE_TYPE', message: 'Format accepté : JPEG, PNG, WebP', statusCode: 422 },
        })
      }

      const buffer = await file.toBuffer()
      if (buffer.length > 5 * 1024 * 1024) {
        return reply.status(422).send({
          error: { code: 'IMAGE_TOO_LARGE', message: 'Image trop volumineuse (max 5 Mo)', statusCode: 422 },
        })
      }

      const query = request.query as { brand?: string; model?: string; year?: string }
      const vehicleFilter = query.brand
        ? { brand: query.brand, model: query.model, year: query.year ? parseInt(query.year, 10) : undefined }
        : undefined

      const result = await identifyFromPhoto(buffer, file.mimetype, vehicleFilter, request.log)

      return reply.status(200).send({ data: result })
    },
  )

  // POST /disambiguate — user selected a candidate, search by that category
  fastify.post(
    '/disambiguate',
    {
      schema: {
        tags: ['Vision'],
        description: 'Rechercher des pièces après sélection de catégorie (désambiguïsation)',
      },
    },
    async (request, reply) => {
      const body = request.body as { category: string; brand?: string }
      if (!body.category) {
        return reply.status(400).send({
          error: { code: 'MISSING_CATEGORY', message: 'Catégorie requise', statusCode: 400 },
        })
      }

      const results = await searchByCategory(body.category, body.brand ? { brand: body.brand } : undefined)
      return reply.status(200).send({ data: results })
    },
  )
}
