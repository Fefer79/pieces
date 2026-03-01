import type { FastifyInstance } from 'fastify'
import { createEscrow, getEscrowByOrderId } from './payment.service.js'
import { requireAuth } from '../../plugins/auth.js'

export async function paymentRoutes(fastify: FastifyInstance) {
  // Webhook for CinetPay payment confirmation
  fastify.post(
    '/webhooks/cinetpay',
    {
      schema: {
        tags: ['Payments'],
        description: 'Webhook CinetPay — confirmation de paiement',
      },
    },
    async (request, reply) => {
      const body = request.body as { cpm_trans_id?: string; cpm_trans_status?: string; cpm_amount?: string; cpm_site_id?: string }

      if (!body.cpm_trans_id) {
        return reply.status(400).send({ error: { code: 'INVALID_WEBHOOK', message: 'Transaction ID manquant' } })
      }

      // Extract orderId from transaction ID (format: pieces_{orderId}_{timestamp})
      const parts = body.cpm_trans_id.split('_')
      const orderId = parts[1]

      if (orderId && body.cpm_trans_status === 'ACCEPTED') {
        const amount = parseInt(body.cpm_amount ?? '0', 10)
        await createEscrow(orderId, amount)
      }

      return reply.status(200).send({ status: 'ok' })
    },
  )

  // Get escrow status for an order
  fastify.get(
    '/orders/:orderId/escrow',
    {
      preHandler: [requireAuth],
      schema: {
        tags: ['Payments'],
        description: 'Statut du séquestre pour une commande',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { orderId } = request.params as { orderId: string }
      const escrow = await getEscrowByOrderId(orderId)
      return reply.status(200).send({ data: escrow })
    },
  )
}
