import type { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import fastifyRateLimit from '@fastify/rate-limit'

async function rateLimitPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })
}

export const rateLimit = fp(rateLimitPlugin, { name: 'rate-limit' })
