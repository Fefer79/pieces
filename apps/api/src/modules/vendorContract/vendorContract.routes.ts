import type { FastifyInstance } from 'fastify'
import {
  createVendorContractSchema,
  listVendorContractsQuerySchema,
  acceptVendorContractSchema,
  vendorContractTokenParamsSchema,
} from 'shared/validators'
import type {
  CreateVendorContractInput,
  ListVendorContractsQuery,
  AcceptVendorContractInput,
} from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth } from '../../plugins/auth.js'
import { requireRoleOrCapability } from '../../plugins/erpAuth.js'
import {
  createVendorContract,
  listVendorContracts,
  getVendorContractByToken,
  acceptVendorContract,
} from './vendorContract.service.js'
import { generateVendorContractPdf } from './vendorContractPdf.service.js'

export async function vendorContractRoutes(fastify: FastifyInstance) {
  // Générer un lien de contrat (admin / liaison) — à envoyer au vendeur via WhatsApp
  fastify.post(
    '/',
    {
      schema: {
        body: zodToFastify(createVendorContractSchema),
        tags: ['VendorContracts'],
        description: 'Générer un lien de contrat d’adhésion pour un vendeur',
        security: [{ BearerAuth: [] }],
      },
      // Émettre un contrat est une écriture CRM : `crm:write`, pas `crm:read`
      // (lecture et écriture sont deux capacités distinctes). Le SUPPORT, en
      // lecture seule sur le CRM, ne peut donc pas émettre de contrat.
      preHandler: [requireAuth, requireRoleOrCapability(['LIAISON'], 'crm:write')],
    },
    async (request, reply) => {
      const result = await createVendorContract(
        request.user.id,
        request.body as CreateVendorContractInput,
        request.user.roles,
      )
      request.log.info({
        event: 'VENDOR_CONTRACT_CREATED',
        userId: request.user.id,
        token: result.token,
      })
      return reply.status(201).send({ data: result })
    },
  )

  // Suivi des contrats émis (admin / commercial / liaison).
  // Une liaison ne voit que les siens ; un membre d'équipe habilité voit tout.
  fastify.get(
    '/',
    {
      schema: {
        querystring: zodToFastify(listVendorContractsQuerySchema),
        tags: ['VendorContracts'],
        description: 'Lister les contrats d’adhésion émis',
        security: [{ BearerAuth: [] }],
      },
      preHandler: [requireAuth, requireRoleOrCapability(['LIAISON'], 'crm:read')],
    },
    async (request, reply) => {
      const { vendorId } = request.query as ListVendorContractsQuery
      // `request.staff` n'est chargé que si la garde est passée par la capacité :
      // une LIAISON entrée par son rôle plateforme reste cantonnée à ses contrats.
      const scopeToCreator = !request.staff?.capabilities?.includes('crm:read')
      const data = await listVendorContracts(request.user.id, { scopeToCreator, vendorId })
      return reply.status(200).send({ data })
    },
  )

  // Consulter un contrat via son lien (public)
  fastify.get(
    '/:token',
    {
      schema: {
        params: zodToFastify(vendorContractTokenParamsSchema),
        tags: ['VendorContracts'],
        description: 'Consulter un contrat d’adhésion via son lien partagé',
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const result = await getVendorContractByToken(token)
      return reply.status(200).send({ data: result })
    },
  )

  // Signer / accepter le contrat (public)
  fastify.post(
    '/:token/accept',
    {
      schema: {
        params: zodToFastify(vendorContractTokenParamsSchema),
        body: zodToFastify(acceptVendorContractSchema),
        tags: ['VendorContracts'],
        description: 'Accepter et signer électroniquement le contrat d’adhésion',
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      // Derrière Cloudflare/Render : privilégier l'IP cliente réelle (trustProxy
      // n'est pas activé globalement) pour la valeur probante du contrat.
      const fwd = request.headers['x-forwarded-for']
      const clientIp =
        (request.headers['cf-connecting-ip'] as string | undefined) ??
        (Array.isArray(fwd) ? fwd[0] : fwd?.split(',')[0]?.trim()) ??
        request.ip
      const result = await acceptVendorContract(
        token,
        request.body as AcceptVendorContractInput,
        { ip: clientIp, userAgent: request.headers['user-agent'] },
      )
      request.log.info({
        event: 'VENDOR_CONTRACT_ACCEPTED',
        token,
        vendorActivated: result.vendorActivated,
      })
      return reply.status(200).send({ data: result })
    },
  )

  // Télécharger le PDF du contrat (public — partageable via WhatsApp)
  fastify.get(
    '/:token/pdf',
    {
      schema: {
        params: zodToFastify(vendorContractTokenParamsSchema),
        tags: ['VendorContracts'],
        description: 'Télécharger le PDF du contrat d’adhésion vendeur',
      },
    },
    async (request, reply) => {
      const { token } = request.params as { token: string }
      const pdf = await generateVendorContractPdf(token)
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="contrat-vendeur-pieces-${token.slice(0, 8)}.pdf"`)
      return reply.send(pdf)
    },
  )
}
