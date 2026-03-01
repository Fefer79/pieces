import type { FastifyInstance } from 'fastify'
import { sendOtp, verifyOtp } from './auth.service.js'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/otp',
    {
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

  fastify.post('/verify', async (request, reply) => {
    const { phone, token } = request.body as { phone: string; token: string }
    const result = await verifyOtp(phone, token)
    return reply.status(200).send({ data: result })
  })
}
