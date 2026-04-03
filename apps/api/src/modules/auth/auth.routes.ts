import type { FastifyInstance } from 'fastify'
import { sendOtpSchema, verifyOtpSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { sendOtp, verifyOtp } from './auth.service.js'

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
}
