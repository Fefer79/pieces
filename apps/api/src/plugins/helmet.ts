import type { FastifyInstance } from 'fastify'
import fastifyHelmet from '@fastify/helmet'

export async function helmet(fastify: FastifyInstance) {
  await fastify.register(fastifyHelmet)
}
