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
import { paymentRoutes } from './modules/payment/payment.routes.js'
import { deliveryRoutes } from './modules/delivery/delivery.routes.js'
import { whatsappRoutes } from './modules/whatsapp/whatsapp.routes.js'
import { reviewRoutes } from './modules/review/review.routes.js'
import { notificationRoutes } from './modules/notification/notification.routes.js'
import { adminRoutes } from './modules/admin/admin.routes.js'
import { liaisonRoutes } from './modules/liaison/liaison.routes.js'
import { enterpriseRoutes } from './modules/enterprise/enterprise.routes.js'
import { driverRoutes } from './modules/driver/driver.routes.js'
import { returnRoutes } from './modules/returns/return.routes.js'
import { vendorContractRoutes } from './modules/vendorContract/vendorContract.routes.js'
import { enrichmentRoutes } from './modules/enrichment/enrichment.routes.js'
import { contactsRoutes } from './modules/contacts/contacts.routes.js'
import { crmRoutes } from './modules/crm/crm.routes.js'
import { stockRoutes } from './modules/stock/stock.routes.js'
import { equipeRoutes } from './modules/equipe/equipe.routes.js'
import { financeRoutes } from './modules/finance/finance.routes.js'
import { marketingRoutes } from './modules/marketing/marketing.routes.js'
import { supportRoutes } from './modules/support/support.routes.js'
import {
  logisticsRoutes,
  enterpriseLogisticsRoutes,
  adminLogisticsRoutes,
} from './modules/logistics/logistics.routes.js'
import { sourcingRoutes } from './modules/sourcing/sourcing.routes.js'
import {
  shipmentRoutes,
  publicShipmentRoutes,
} from './modules/sourcing/shipment.routes.js'
import multipart from '@fastify/multipart'
import {
  startWorker,
  ensureMaintenanceReminderScheduled,
  ensureBufferReplenishScheduled,
  ensureVendorRelanceScheduled,
  ensureEnrichmentSourcingScheduled,
  ensureCrmDueTasksScheduled,
} from './modules/queue/worker.js'

// Fail-fast: validate environment variables at startup
const env = apiEnvSchema.parse(process.env)

export function buildApp() {
  const fastify = Fastify({
    // Sans ceci, `request.ip` est l'IP du proxy (Render / Cloudflare) et non
    // celle du visiteur : le rate limit devient un seau unique partagé par tout
    // le trafic, et tout anti-abus par IP sur un formulaire public est
    // inopérant — un seul bot bloquerait alors tous les utilisateurs réels.
    trustProxy: true,
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
  fastify.register(paymentRoutes, { prefix: '/api/v1' })
  fastify.register(deliveryRoutes, { prefix: '/api/v1/deliveries' })
  fastify.register(whatsappRoutes, { prefix: '/api/v1/whatsapp' })
  fastify.register(reviewRoutes, { prefix: '/api/v1/reviews' })
  fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' })
  fastify.register(adminRoutes, { prefix: '/api/v1/admin' })
  fastify.register(liaisonRoutes, { prefix: '/api/v1/liaison' })
  fastify.register(enterpriseRoutes, { prefix: '/api/v1/enterprises' })
  fastify.register(driverRoutes, { prefix: '/api/v1/driver' })
  fastify.register(returnRoutes, { prefix: '/api/v1' })
  fastify.register(vendorContractRoutes, { prefix: '/api/v1/vendor-contracts' })
  fastify.register(enrichmentRoutes, { prefix: '/api/v1/enrichments' })
  fastify.register(contactsRoutes, { prefix: '/api/v1/contacts' })
  fastify.register(crmRoutes, { prefix: '/api/v1/admin/crm' })
  fastify.register(stockRoutes, { prefix: '/api/v1/admin/stock' })
  fastify.register(equipeRoutes, { prefix: '/api/v1/admin/equipe' })
  fastify.register(financeRoutes, { prefix: '/api/v1/admin/finance' })
  fastify.register(marketingRoutes, { prefix: '/api/v1/admin/marketing' })
  fastify.register(supportRoutes, { prefix: '/api/v1/admin/support' })
  fastify.register(logisticsRoutes, { prefix: '/api/v1/logistics' })
  // Cotations logistique scopées flotte — servies par le module logistics mais
  // montées sous le préfixe entreprise pour rester cohérentes avec le reste.
  fastify.register(enterpriseLogisticsRoutes, { prefix: '/api/v1/enterprises' })
  fastify.register(adminLogisticsRoutes, { prefix: '/api/v1/admin/logistics' })
  fastify.register(sourcingRoutes, { prefix: '/api/v1/admin/sourcing' })
  fastify.register(shipmentRoutes, { prefix: '/api/v1/admin/shipments' })
  // Suivi client d'une expédition — même hôte public que le suivi de cotation.
  fastify.register(publicShipmentRoutes, { prefix: '/api/v1/logistics' })

  return fastify
}

// Start server
const start = async () => {
  const fastify = buildApp()
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    fastify.log.info(`Server listening on port ${env.PORT}`)
    startWorker(fastify.log)
    if (env.WHATSAPP_PROVIDER === 'baileys') {
      // Dynamic import keeps baileys out of the process when the Cloud API webhook is used.
      const { startBaileysGateway } = await import('./modules/whatsapp/baileys.gateway.js')
      startBaileysGateway(fastify.log).catch((err) =>
        fastify.log.error({ err }, 'Baileys gateway failed to start'),
      )
    }
    void ensureMaintenanceReminderScheduled(fastify.log)
    void ensureBufferReplenishScheduled(fastify.log)
    void ensureVendorRelanceScheduled(fastify.log)
    void ensureEnrichmentSourcingScheduled(fastify.log)
    void ensureCrmDueTasksScheduled(fastify.log)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

if (process.env.NODE_ENV !== 'test') {
  start()
}
