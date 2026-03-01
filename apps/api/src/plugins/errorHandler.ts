import type { FastifyInstance } from 'fastify'
import { AppError } from '../lib/appError.js'

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((err, _request, reply) => {
    const error = err as Error & { statusCode?: number; code?: string; details?: Record<string, unknown> }

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

    // Preserve Fastify's built-in error status codes (validation, 404, rate limit, etc.)
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code ?? 'REQUEST_ERROR',
          message: error.message,
          statusCode: error.statusCode,
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
