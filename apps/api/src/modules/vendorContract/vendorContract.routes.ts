import type { FastifyInstance } from 'fastify'
import {
  createVendorContractSchema,
  acceptVendorContractSchema,
  vendorContractTokenParamsSchema,
} from 'shared/validators'
import type { CreateVendorContractInput, AcceptVendorContractInput } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { requireAuth, requireRole } from '../../plugins/auth.js'
import {
  createVendorContract,
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
      preHandler: [requireAuth, requireRole('ADMIN', 'LIAISON')],
    },
    async (request, reply) => {
      const result = await createVendorContract(
        request.user.id,
        request.body as CreateVendorContractInput,
      )
      request.log.info({
        event: 'VENDOR_CONTRACT_CREATED',
        userId: request.user.id,
        token: result.token,
      })
      return reply.status(201).send({ data: result })
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
      request.log.info({ event: 'VENDOR_CONTRACT_ACCEPTED', token })
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
