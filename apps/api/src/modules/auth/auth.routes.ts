import type { FastifyInstance } from 'fastify'
import { sendOtp, verifyOtp } from './auth.service.js'

const otpBodySchema = {
  type: 'object',
  required: ['phone'],
  properties: {
    phone: { type: 'string' },
  },
} as const

const verifyBodySchema = {
  type: 'object',
  required: ['phone', 'token'],
  properties: {
    phone: { type: 'string' },
    token: { type: 'string' },
  },
} as const

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/otp',
    {
      schema: { body: otpBodySchema },
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
      schema: { body: verifyBodySchema },
    },
    async (request, reply) => {
      const { phone, token } = request.body as { phone: string; token: string }
      const result = await verifyOtp(phone, token)
      return reply.status(200).send({ data: result })
    },
  )
}
