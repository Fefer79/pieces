import type { FastifyInstance } from 'fastify'
import { getVerifyToken, parseIncomingMessage, sendWhatsAppMessage, verifyWebhookSignature } from './whatsapp.service.js'
import { AppError } from '../../lib/appError.js'

export async function whatsappRoutes(fastify: FastifyInstance) {
  // Webhook verification (GET)
  fastify.get(
    '/webhook',
    {
      schema: {
        tags: ['WhatsApp'],
        description: 'Vérification du webhook WhatsApp (Meta)',
      },
    },
    async (request, reply) => {
      const query = request.query as { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string }

      if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === getVerifyToken()) {
        return reply.status(200).send(query['hub.challenge'])
      }

      return reply.status(403).send('Forbidden')
    },
  )

  // Webhook incoming messages (POST) — HMAC verified
  fastify.post(
    '/webhook',
    {
      schema: {
        tags: ['WhatsApp'],
        description: 'Réception des messages WhatsApp entrants',
      },
    },
    async (request, reply) => {
      // H1 fix: Verify HMAC signature from Meta
      const signature = request.headers['x-hub-signature-256'] as string | undefined
      const rawBody = JSON.stringify(request.body)
      if (!verifyWebhookSignature(rawBody, signature)) {
        throw new AppError('WHATSAPP_INVALID_SIGNATURE', 401, { message: 'Invalid webhook signature' })
      }

      const body = request.body as Record<string, unknown>
      const { from, text, imageId } = parseIncomingMessage(body)

      if (!from) {
        return reply.status(200).send({ status: 'ignored' })
      }

      if (text) {
        const command = text.trim().toLowerCase()

        if (command === 'aide' || command === 'help') {
          await sendWhatsAppMessage(from, 'Bienvenue sur Pièces! Envoyez une photo de votre pièce auto pour l\'identifier, ou tapez "recherche [nom]" pour chercher.')
        } else if (command.startsWith('recherche ')) {
          const query = text.slice(10).trim()
          await sendWhatsAppMessage(from, `Recherche "${query}" — consultez les résultats sur pieces.ci/browse`)
        } else {
          await sendWhatsAppMessage(from, 'Commande non reconnue. Tapez "aide" pour les options disponibles.')
        }
      }

      if (imageId) {
        await sendWhatsAppMessage(from, 'Photo reçue! Identification en cours... Vous recevrez les résultats sous peu.')
      }

      return reply.status(200).send({ status: 'ok' })
    },
  )
}
