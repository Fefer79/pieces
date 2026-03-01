import type { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'

export async function cors(fastify: FastifyInstance) {
  await fastify.register(fastifyCors, {
    origin: [
      'https://pieces.ci',
      'http://localhost:3000',
    ],
    credentials: true,
  })
}
