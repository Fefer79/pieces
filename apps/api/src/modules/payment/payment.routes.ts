import type { FastifyInstance } from 'fastify'
import { confirmOrderPayment, getEscrowByOrderId } from './payment.service.js'
import { verifyCinetPayTransaction } from '../../lib/cinetpay.js'
import { getOrderById } from '../order/order.service.js'
import { requireAuth } from '../../plugins/auth.js'

export async function paymentRoutes(fastify: FastifyInstance) {
  // Webhook for CinetPay payment confirmation.
  // SÉCURITÉ : on ne fait jamais confiance au payload. On rappelle CinetPay pour
  // vérifier la transaction (statut + montant réels) avant toute écriture.
  fastify.post(
    '/webhooks/cinetpay',
    {
      schema: {
        tags: ['Payments'],
        description: 'Webhook CinetPay — confirmation de paiement',
      },
    },
    async (request, reply) => {
      const body = request.body as { cpm_trans_id?: string; cpm_trans_status?: string }

      if (!body.cpm_trans_id) {
        return reply.status(400).send({ error: { code: 'INVALID_WEBHOOK', message: 'Transaction ID manquant' } })
      }

      // Vérification d'authenticité auprès de CinetPay (source de vérité).
      const verification = await verifyCinetPayTransaction(body.cpm_trans_id)
      if (!verification) {
        request.log.warn({ event: 'CINETPAY_WEBHOOK_UNVERIFIED', transId: body.cpm_trans_id })
        return reply
          .status(401)
          .send({ error: { code: 'WEBHOOK_UNVERIFIED', message: 'Transaction non vérifiable' } })
      }

      // Transaction non acceptée : on acquitte sans rien écrire.
      if (verification.status !== 'ACCEPTED') {
        return reply.status(200).send({ status: 'ignored' })
      }

      // Format du transaction_id : pieces_{orderId}_{timestamp}
      const orderId = body.cpm_trans_id.split('_')[1]
      if (!orderId) {
        return reply.status(400).send({ error: { code: 'INVALID_WEBHOOK', message: 'Référence commande invalide' } })
      }

      // On utilise le montant VÉRIFIÉ, jamais celui du payload.
      await confirmOrderPayment(orderId, verification.amount)
      return reply.status(200).send({ status: 'ok' })
    },
  )

  // Get escrow status for an order (réservé aux personnes autorisées sur la commande)
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
      // Réutilise le contrôle d'accès commande (initiateur / vendeur / membre
      // entreprise / admin) — lève 403/404 si non autorisé. Empêche l'IDOR.
      await getOrderById(orderId, { id: request.user.id, roles: request.user.roles })
      const escrow = await getEscrowByOrderId(orderId)
      return reply.status(200).send({ data: escrow })
    },
  )
}
