import type { FastifyInstance } from 'fastify'
import { whatsappLoginStartSchema, whatsappLoginStatusSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { createLoginCode, getLoginStatus } from './whatsappLogin.service.js'

export async function authRoutes(fastify: FastifyInstance) {
  // Email/password auth is handled client-side by Supabase; Google OAuth via the
  // /auth/callback route. The only server-side auth flow here is WhatsApp reverse-OTP.

  // --- WhatsApp reverse-OTP login (free) ---

  fastify.post(
    '/whatsapp/start',
    {
      schema: {
        body: zodToFastify(whatsappLoginStartSchema),
        tags: ['Auth'],
        description: 'Démarrer la connexion WhatsApp (OTP inversé) : génère un code court à envoyer au numéro business',
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { phone } = request.body as { phone: string }
      const result = createLoginCode(phone)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.get(
    '/whatsapp/status',
    {
      schema: {
        querystring: zodToFastify(whatsappLoginStatusSchema),
        tags: ['Auth'],
        description: 'Interroger le statut d\'une connexion WhatsApp ; renvoie le jeton de session une fois vérifiée',
      },
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { code } = request.query as { code: string }
      const result = getLoginStatus(code)
      return reply.status(200).send({ data: result })
    },
  )
}
