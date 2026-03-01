import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { phoneSchema, otpSchema } from 'shared/validators'
import { zodToFastify } from '../../lib/zodSchema.js'
import { sendOtp, verifyOtp } from './auth.service.js'

const otpBodySchema = z.object({ phone: phoneSchema })
const verifyBodySchema = z.object({ phone: phoneSchema, token: otpSchema })

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/otp',
    {
      schema: {
        body: zodToFastify(otpBodySchema),
        tags: ['Auth'],
        description: 'Envoyer un code OTP par SMS',
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
      const result = await sendOtp(phone)
      return reply.status(200).send({ data: result })
    },
  )

  fastify.post(
    '/verify',
    {
      schema: {
        body: zodToFastify(verifyBodySchema),
        tags: ['Auth'],
        description: 'Vérifier le code OTP et obtenir un token JWT',
      },
    },
    async (request, reply) => {
      const { phone, token } = request.body as { phone: string; token: string }
      const result = await verifyOtp(phone, token)
      return reply.status(200).send({ data: result })
    },
  )
}
