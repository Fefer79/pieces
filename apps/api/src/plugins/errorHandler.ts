import type { FastifyInstance } from 'fastify'
import { AppError } from '../lib/appError.js'

interface FastifyValidationError {
  statusCode?: number
  code?: string
  message?: string
  validation?: { keyword: string; instancePath: string; message?: string; params?: Record<string, unknown> }[]
  validationContext?: string
}

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((err, _request, reply) => {
    const error = err as Error & FastifyValidationError & { details?: Record<string, unknown> }

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

    // Fastify schema validation errors → 422
    if (error.validation && error.statusCode === 400) {
      const details = error.validation.map((v) => ({
        field: v.instancePath?.replace(/^\//, '') || v.params?.missingProperty || 'unknown',
        message: v.message ?? 'Invalid value',
      }))

      return reply.status(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          statusCode: 422,
          details,
        },
      })
    }

    // Other Fastify built-in errors (404, rate limit 429, etc.)
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
