import type { FastifyInstance } from 'fastify'
import {
  createVendorContactSchema,
  updateVendorContactSchema,
  linkVendorContactSchema,
  vendorContactParamsSchema,
  vendorContactListQuerySchema,
  createContactActivitySchema,
  assignContactSchema,
  convertContactSchema,
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
  listActivities,
  addActivity,
  assignContact,
  convertContactToVendor,
  getProspectionStats,
} from './contacts.service.js'
import { runRadarImport } from './radar.service.js'

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
      const isAdmin = request.user.activeContext === 'ADMIN'
      const result = await getTodayRelances(isAdmin ? undefined : request.user.id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/radar/preview',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Prévisualise les leads importables depuis les sources internes (OSM, marketplaces)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (_request, reply) => {
      const result = await runRadarImport({ dryRun: true })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/radar/import',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Importe les nouveaux leads (OSM, marketplaces) comme prospects dédupliqués',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (request, reply) => {
      const result = await runRadarImport({ dryRun: false })
      request.log.info({ event: 'RADAR_IMPORT', adminId: request.user.id, totalImported: result.totalImported })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Statistiques de prospection (funnel par statut, liaison, commune)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (_request, reply) => {
      const result = await getProspectionStats()
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

  fastify.get(
    '/:id/activities',
    {
      schema: {
        tags: ['Contacts'],
        description: "Journal d'activités d'un contact",
        params: zodToFastify(vendorContactParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await listActivities(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/:id/activities',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Enregistrer une action (appel, WhatsApp, visite, note) avec statut et relance optionnels',
        params: zodToFastify(vendorContactParamsSchema),
        body: zodToFastify(createContactActivitySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await addActivity(request.user.id, id, request.body)
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'LIAISON',
        action: 'CONTACT_ACTIVITY_LOGGED',
        targetType: 'VendorContact',
        targetId: id,
        payload: { type: (request.body as { type: string }).type },
      }).catch(() => {})
      return reply.status(201).send({ data: result })
    },
  )

  fastify.post(
    '/:id/assign',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Assigner un contact à une liaison (admin)',
        params: zodToFastify(vendorContactParamsSchema),
        body: zodToFastify(assignContactSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRole('ADMIN')],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await assignContact(id, request.body)
      await recordActivity({
        actorId: request.user.id,
        actorRole: 'ADMIN',
        action: 'CONTACT_ASSIGNED',
        targetType: 'VendorContact',
        targetId: id,
        payload: { liaisonId: (request.body as { liaisonId: string | null }).liaisonId },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/:id/convert',
    {
      schema: {
        tags: ['Contacts'],
        description: 'Convertir un contact en vendeur (crée le Vendor ou lie un vendeur existant par téléphone)',
        params: zodToFastify(vendorContactParamsSchema),
        body: zodToFastify(convertContactSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await convertContactToVendor(request.user.id, id, request.body)
      request.log.info({ event: 'CONTACT_CONVERTED', userId: request.user.id, contactId: id, vendorId: result.vendorId })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'LIAISON',
        action: 'CONTACT_CONVERTED',
        targetType: 'VendorContact',
        targetId: id,
        payload: { vendorId: result.vendorId },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
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
