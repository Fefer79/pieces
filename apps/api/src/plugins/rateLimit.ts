import type { FastifyInstance } from 'fastify'
import fastifyRateLimit from '@fastify/rate-limit'

export async function rateLimit(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
}
