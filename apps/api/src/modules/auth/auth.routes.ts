import type { FastifyInstance } from 'fastify'
import { sendOtpSchema, verifyOtpSchema, whatsappLoginStartSchema, whatsappLoginStatusSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { sendOtp, verifyOtp } from './auth.service.js'
import { createLoginCode, getLoginStatus } from './whatsappLogin.service.js'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/otp',
    {
      schema: {
        body: zodToFastify(sendOtpSchema),
        tags: ['Auth'],
        description: 'Envoyer un code OTP par SMS ou email',
      },
      config: {
        rateLimit: {
          max: 5,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const { phone, email } = request.body as { phone?: string; email?: string }
      const result = await sendOtp({ phone, email })
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/verify',
    {
      schema: {
        body: zodToFastify(verifyOtpSchema),
        tags: ['Auth'],
        description: 'Vérifier le code OTP et obtenir un token JWT',
      },
    },
    async (request, reply) => {
      const { phone, email, token } = request.body as { phone?: string; email?: string; token: string }
      const result = await verifyOtp({ phone, email, token })
      return reply.status(200).send({ data: result })
    },
  )

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
