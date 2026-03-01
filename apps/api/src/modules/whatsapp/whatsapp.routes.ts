import type { FastifyInstance } from 'fastify'
import { getVerifyToken, parseIncomingMessage, sendWhatsAppMessage } from './whatsapp.service.js'

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

  // Webhook incoming messages (POST)
  fastify.post(
    '/webhook',
    {
      schema: {
        tags: ['WhatsApp'],
        description: 'Réception des messages WhatsApp entrants',
      },
    },
    async (request, reply) => {
      const body = request.body as Record<string, unknown>
      const { from, text, imageId } = parseIncomingMessage(body)

      if (!from) {
        return reply.status(200).send({ status: 'ignored' })
      }

      // Simple command handling for MVP
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
        // In production: download image via Graph API, call identifyPart, respond with results
      }

      return reply.status(200).send({ status: 'ok' })
    },
  )
}
