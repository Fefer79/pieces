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
import { consentRoutes } from './modules/consent/consent.routes.js'
import { vendorRoutes } from './modules/vendor/vendor.routes.js'
import { catalogRoutes } from './modules/catalog/catalog.routes.js'
import { browseRoutes } from './modules/browse/browse.routes.js'
import { vehicleRoutes } from './modules/vehicle/vehicle.routes.js'
import { visionRoutes } from './modules/vision/vision.routes.js'
import { orderRoutes } from './modules/order/order.routes.js'
import multipart from '@fastify/multipart'

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
  fastify.register(multipart, { limits: { fileSize: 5 * 1024 * 1024 } })
  setupErrorHandler(fastify)

  // Health check
  fastify.get('/healthz', async () => ({ status: 'ok' }))

  // Routes
  fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  fastify.register(userRoutes, { prefix: '/api/v1/users' })
  fastify.register(consentRoutes, { prefix: '/api/v1/users' })
  fastify.register(vendorRoutes, { prefix: '/api/v1/vendors' })
  fastify.register(catalogRoutes, { prefix: '/api/v1/catalog' })
  fastify.register(browseRoutes, { prefix: '/api/v1/browse' })
  fastify.register(vehicleRoutes, { prefix: '/api/v1/users' })
  fastify.register(visionRoutes, { prefix: '/api/v1/vision' })
  fastify.register(orderRoutes, { prefix: '/api/v1/orders' })

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
