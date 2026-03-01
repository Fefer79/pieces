import type { FastifyInstance } from 'fastify'
import { getBrands, getModels, getYears, getCategories, browseParts, searchParts } from './browse.service.js'

export async function browseRoutes(fastify: FastifyInstance) {
  // All browse routes are PUBLIC — no auth required

  fastify.get(
    '/brands',
    {
      schema: {
        tags: ['Browse'],
        description: 'Liste des marques automobiles disponibles',
      },
    },
    async (_request, reply) => {
      const brands = getBrands()
      return reply.status(200).send({ data: brands })
    },
  )

  fastify.get(
    '/brands/:brand/models',
    {
      schema: {
        tags: ['Browse'],
        description: 'Modèles disponibles pour une marque',
      },
    },
    async (request, reply) => {
      const { brand } = request.params as { brand: string }
      const models = getModels(decodeURIComponent(brand))
      return reply.status(200).send({ data: models })
    },
  )

  fastify.get(
    '/brands/:brand/models/:model/years',
    {
      schema: {
        tags: ['Browse'],
        description: 'Années disponibles pour une marque/modèle',
      },
    },
    async (request, reply) => {
      const { brand, model } = request.params as { brand: string; model: string }
      const years = getYears(decodeURIComponent(brand), decodeURIComponent(model))
      return reply.status(200).send({ data: years })
    },
  )

  fastify.get(
    '/categories',
    {
      schema: {
        tags: ['Browse'],
        description: 'Liste des catégories de pièces',
      },
    },
    async (_request, reply) => {
      const categories = getCategories()
      return reply.status(200).send({ data: categories })
    },
  )

  fastify.get(
    '/parts',
    {
      schema: {
        tags: ['Browse'],
        description: 'Parcourir les pièces par filtres (marque, modèle, année, catégorie)',
      },
    },
    async (request, reply) => {
      const query = request.query as { brand?: string; model?: string; year?: string; category?: string; page?: string; limit?: string }
      const result = await browseParts({
        brand: query.brand,
        model: query.model,
        year: query.year ? parseInt(query.year, 10) : undefined,
        category: query.category,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/search',
    {
      schema: {
        tags: ['Browse'],
        description: 'Rechercher des pièces par texte (pg_trgm + synonymes)',
      },
    },
    async (request, reply) => {
      const query = request.query as { q?: string; category?: string; page?: string; limit?: string }
      if (!query.q || query.q.trim().length < 2) {
        return reply.status(200).send({ data: { query: '', items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } } })
      }
      const result = await searchParts(query.q, {
        category: query.category,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )
}
