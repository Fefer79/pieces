import type { FastifyInstance } from 'fastify'
import { getBrands, getModels, getYears, getModelEngines, getCategories, browseParts, searchParts, suggestParts, compareParts, decodeVin, getPublicItemDetail } from './browse.service.js'
import { zodToFastify } from '../../lib/zodSchema.js'
import { vinDecodeSchema } from 'shared/validators'

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
    '/brands/:brand/models/:model/engines',
    {
      schema: {
        tags: ['Browse'],
        description: 'Motorisations disponibles pour une marque/modèle',
      },
    },
    async (request, reply) => {
      const { brand, model } = request.params as { brand: string; model: string }
      const engines = getModelEngines(decodeURIComponent(brand), decodeURIComponent(model))
      return reply.status(200).send({ data: engines })
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
      const query = request.query as { brand?: string; model?: string; year?: string; category?: string; q?: string; page?: string; limit?: string }
      const result = await browseParts({
        brand: query.brand,
        model: query.model,
        year: query.year ? parseInt(query.year, 10) : undefined,
        category: query.category,
        q: query.q,
        page: query.page ? parseInt(query.page, 10) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/suggest',
    {
      schema: {
        tags: ['Browse'],
        description: 'Suggestions de noms de pièces pour l\'autocomplétion (restreintes au véhicule si fourni)',
      },
    },
    async (request, reply) => {
      const query = request.query as { q?: string; brand?: string; model?: string; year?: string }
      if (!query.q || query.q.trim().length < 2) {
        return reply.status(200).send({ data: { suggestions: [] } })
      }
      const result = await suggestParts(query.q, {
        brand: query.brand,
        model: query.model,
        year: query.year ? parseInt(query.year, 10) : undefined,
      })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/compare',
    {
      schema: {
        tags: ['Browse'],
        description: 'Regroupe les pièces compatibles par référence OEM (ou nom) avec les offres multi-fournisseurs',
      },
    },
    async (request, reply) => {
      const query = request.query as { brand?: string; model?: string; year?: string; category?: string; oem?: string; sort?: string }
      const result = await compareParts({
        brand: query.brand,
        model: query.model,
        year: query.year ? parseInt(query.year, 10) : undefined,
        category: query.category,
        oem: query.oem,
        sort: query.sort === 'value' ? 'value' : 'price',
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

  fastify.post(
    '/vin-decode',
    {
      schema: {
        tags: ['Browse'],
        description: 'Décoder un VIN pour identifier le véhicule (NHTSA VPIC)',
        body: zodToFastify(vinDecodeSchema),
      },
    },
    async (request, reply) => {
      const { vin } = request.body as { vin: string }
      const result = await decodeVin(vin)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/items/:id',
    {
      schema: {
        tags: ['Browse'],
        description: 'Détail public d\'une fiche produit (pièce)',
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getPublicItemDetail(id)
      return reply.status(200).send({ data: result })
    },
  )
}
