import type { FastifyInstance } from 'fastify'
import {
  marketingCampaignsQuerySchema,
  createCampaignSchema,
  marketingCampaignParamsSchema,
  previewAudienceQuerySchema,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { recordActivity } from '../../lib/activityLog.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireCapability } from '../../plugins/erpAuth.js'
import {
  getMarketingOverview,
  listAudiences,
  previewAudience,
  listCampaigns,
  createCampaign,
  getCampaign,
  launchCampaign,
  cancelCampaign,
} from './marketing.service.js'

export async function marketingRoutes(fastify: FastifyInstance) {
  const guard = [requireAuth, requireCapability('crm:read')]

  // -------------------------------------------------------------------------
  // Cockpit & audiences
  // -------------------------------------------------------------------------

  fastify.get(
    '/overview',
    {
      schema: {
        tags: ['Marketing'],
        description: 'Cockpit « Marketing » (campagnes par statut, messages envoyés sur 30 j)',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await getMarketingOverview()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/audiences',
    {
      schema: {
        tags: ['Marketing'],
        description:
          'Audiences disponibles : segments clients/vendeurs calculés et tags CRM, avec compteurs',
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (_request, reply) => {
      const result = await listAudiences()
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/audiences/preview',
    {
      schema: {
        tags: ['Marketing'],
        description:
          'Aperçu d’une audience : total, opt-outs exclus, sans téléphone, échantillon (≤ 10)',
        querystring: zodToFastify(previewAudienceQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await previewAudience(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  // -------------------------------------------------------------------------
  // Campagnes
  // -------------------------------------------------------------------------

  fastify.get(
    '/campaigns',
    {
      schema: {
        tags: ['Marketing'],
        description: 'Liste des campagnes (filtre statut), les plus récentes d’abord',
        querystring: zodToFastify(marketingCampaignsQuerySchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await listCampaigns(request.query)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/campaigns',
    {
      schema: {
        tags: ['Marketing'],
        description:
          'Créer une campagne (BROUILLON, ou PLANIFIEE si date d’envoi future). Le lancement est une action séparée.',
        body: zodToFastify(createCampaignSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const result = await createCampaign(request.body, request.user.id)
      request.log.info({
        event: 'CAMPAIGN_CREATED',
        adminId: request.user.id,
        campaignId: result.id,
        statut: result.statut,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CAMPAIGN_CREATED',
        targetType: 'MarketingCampaign',
        targetId: result.id,
        payload: request.body as Record<string, unknown>,
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/campaigns/:id',
    {
      schema: {
        tags: ['Marketing'],
        description: 'Fiche campagne : message, audience, compteurs d’envoi, dates',
        params: zodToFastify(marketingCampaignParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await getCampaign(id)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/campaigns/:id/launch',
    {
      schema: {
        tags: ['Marketing'],
        description:
          'Lancer une campagne : résout l’audience et enfile le job d’envoi (immédiat ou planifié)',
        params: zodToFastify(marketingCampaignParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await launchCampaign(id)
      request.log.info({
        event: 'CAMPAIGN_LAUNCHED',
        adminId: request.user.id,
        campaignId: id,
        statut: result.statut,
        totalCibles: result.totalCibles,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CAMPAIGN_LAUNCHED',
        targetType: 'MarketingCampaign',
        targetId: id,
        payload: { statut: result.statut, totalCibles: result.totalCibles },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/campaigns/:id/cancel',
    {
      schema: {
        tags: ['Marketing'],
        description: 'Annuler une campagne brouillon ou planifiée (409 sinon)',
        params: zodToFastify(marketingCampaignParamsSchema),
        security: [{ BearerAuth: [] }],
      },
      preHandler: guard,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await cancelCampaign(id)
      request.log.info({
        event: 'CAMPAIGN_CANCELLED',
        adminId: request.user.id,
        campaignId: id,
      })
      await recordActivity({
        actorId: request.user.id,
        actorRole: request.user.activeContext ?? 'ADMIN',
        action: 'CAMPAIGN_CANCELLED',
        targetType: 'MarketingCampaign',
        targetId: id,
        payload: { nom: result.nom },
      }).catch(() => {})
      return reply.status(200).send({ data: result })
    },
  )
}
