import Fastify from 'fastify'
import { apiEnvSchema } from 'shared/env'
import { helmet } from './plugins/helmet.js'
import { cors } from './plugins/cors.js'
import { rateLimit } from './plugins/rateLimit.js'
import { swagger } from './plugins/swagger.js'
import { setupErrorHandler } from './plugins/errorHandler.js'

// Fail-fast: validate environment variables at startup
const env = apiEnvSchema.parse(process.env)

export function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.PINO_LOG_LEVEL,
      redact: {
        paths: ['req.headers.authorization', 'phone', 'email'],
        censor: '[REDACTED]',
      },
    },
  })

  // Register plugins
  fastify.register(helmet)
  fastify.register(cors)
  fastify.register(rateLimit)
  fastify.register(swagger)
  setupErrorHandler(fastify)

  // Health check
  fastify.get('/healthz', async () => ({ status: 'ok' }))

  return fastify
}

// Start server
const start = async () => {
  const fastify = buildApp()
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
