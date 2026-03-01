import Fastify from 'fastify'
import { apiEnvSchema } from 'shared/env'
import { helmet } from './plugins/helmet.js'
import { cors } from './plugins/cors.js'
import { rateLimit } from './plugins/rateLimit.js'
import { swagger } from './plugins/swagger.js'
import { setupErrorHandler } from './plugins/errorHandler.js'
import { auth } from './plugins/auth.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { userRoutes } from './modules/user/user.routes.js'

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
  fastify.register(auth)
  setupErrorHandler(fastify)

  // Health check
  fastify.get('/healthz', async () => ({ status: 'ok' }))

  // Routes
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(userRoutes, { prefix: '/api/v1/users' })

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

if (process.env.NODE_ENV !== 'test') {
  start()
}
