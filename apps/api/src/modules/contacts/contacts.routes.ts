import type { FastifyInstance } from 'fastify'
import {
  createVendorContactSchema,
  updateVendorContactSchema,
  linkVendorContactSchema,
  vendorContactParamsSchema,
  vendorContactListQuerySchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { AppError } from '../../lib/appError.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import { scrapeUrl } from './scrape.service.js'
import {
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  addContactLink,
  scrapedContactLink,
  deleteContactLink,
  getTodayRelances,
} from './contacts.service.js'

export async function contactsRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireRole('LIAISON', 'ADMIN')]

  fastify.get(
    '/',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Liste des contacts vendeurs avec filtres (statut, commune, recherche)',
        querystring: zodToFastify(vendorContactListQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listContacts(request.user.id, request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/relances',
    {
      schema: {
        tags: ['Contacts'],
        description: "Contacts a relancer aujourd'hui",
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await getTodayRelances()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/:id',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Detail d\'un contact',
        params: zodToFastify(vendorContactParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getContact(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Creer un nouveau contact vendeur',
        body: zodToFastify(createVendorContactSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createContact(request.user.id, request.body)
      request.log.info({
        event: 'CONTACT_CREATED',
        liaisonId: request.user.id,
        contactId: result.id,
        contactName: result.name,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'LIAISON',
        action: 'CONTACT_CREATED',
        targetType: 'VendorContact',
        targetId: result.id,
        payload: { name: result.name, phone: result.phone },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.patch(
    '/:id',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Modifier un contact',
        params: zodToFastify(vendorContactParamsSchema),
        body: zodToFastify(updateVendorContactSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await updateContact(request.user.id, id, request.body)
      request.log.info({
        event: 'CONTACT_UPDATED',
        liaisonId: request.user.id,
        contactId: result.id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'LIAISON',
        action: 'CONTACT_UPDATED',
        targetType: 'VendorContact',
        targetId: result.id,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.delete(
    '/:id',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Supprimer un contact',
        params: zodToFastify(vendorContactParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      await deleteContact(id)
      request.log.info({ event: 'CONTACT_DELETED', liaisonId: request.user.id, contactId: id })
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/:id/links',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Ajouter un lien (Facebook, WhatsApp, etc.) a un contact',
        params: zodToFastify(vendorContactParamsSchema),
        body: zodToFastify(linkVendorContactSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await addContactLink(id, request.body)
      return reply.status(201).send({ data: result })
    },
  )

  fastify.post(
    '/:id/links/scrape',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Ajouter un lien scrape (Facebook, WhatsApp) avec les donnees extraites',
        params: zodToFastify(vendorContactParamsSchema),
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
            type: { type: 'string' },
            rawData: {},
          },
          required: ['url', 'type'],
        },
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const { url, type, rawData } = request.body as { url: string; type: string; rawData?: unknown }
      const result = await scrapedContactLink(id, url, rawData ?? null, type)
      return reply.status(201).send({ data: result })
    },
  )

  fastify.delete(
    '/:id/links/:linkId',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Supprimer un lien d\'un contact',
        params: zodToFastify(
          vendorContactParamsSchema.extend({ linkId: vendorContactParamsSchema.shape.id }),
        ),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id, linkId } = request.params as { id: string; linkId: string }
      await deleteContactLink(id, linkId)
      return reply.status(204).send()
    },
  )

  fastify.post(
    '/scrape-url',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Scraper une URL (Facebook, WhatsApp) et extraire les infos',
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', format: 'uri' },
          },
          required: ['url'],
        },
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { url } = request.body as { url: string }
      const response = await fetch(url, {
        headers: { 'user-agent': 'pieces-ci/1.0 (compatible; +https://pieces.ci)' },
        redirect: 'follow',
      })
      if (!response.ok) {
        throw new AppError('SCRAPE_FAILED', 422, { message: `Impossible de lire l'URL : HTTP ${response.status}` })
      }
      const html = await response.text()
      const result = await scrapeUrl(html, url)
      return reply.status(200).send({ data: result })
    },
  )
}
