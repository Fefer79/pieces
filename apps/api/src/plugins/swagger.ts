import type { FastifyInstance } from 'fastify'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

export async function swagger(fastify: FastifyInstance) {
  await fastify.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Pièces API',
        description: 'API Marketplace pièces auto — Côte d\'Ivoire',
        version: '1.0.0',
      },
      servers: [
        { url: 'http://localhost:3001', description: 'Development' },
      ],
    },
  })

  await fastify.register(fastifySwaggerUi, {
    routePrefix: '/api/v1/docs',
  })
}
