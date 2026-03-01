import type { FastifyInstance } from 'fastify'
import { AppError } from '../lib/appError.js'

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details,
        },
      })
    }

    fastify.log.error(error)

    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        statusCode: 500,
      },
    })
  })
}
