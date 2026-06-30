import { dequeue, enqueue } from './queueService.js'
import { prisma } from '../../lib/prisma.js'
import { handleImageProcess, handleAiIdentify } from './handlers/imageProcess.js'
import { handleMaintenanceReminderScan } from './handlers/maintenanceReminder.js'
import { handleBufferStockReplenishScan } from './handlers/bufferStockReplenish.js'
import { handleVendorRelanceScan } from './handlers/vendorRelance.js'
import type { Job } from '@prisma/client'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
  error: (obj: Record<string, unknown>, msg: string) => void
}

const POLL_INTERVAL = 30_000 // 30 seconds
const JOB_TYPES = ['IMAGE_PROCESS_VARIANTS', 'CATALOG_AI_IDENTIFY', 'MAINTENANCE_REMINDER_SCAN', 'BUFFER_STOCK_REPLENISH_SCAN', 'RELANCE_INCOMPLETE_VENDORS_SCAN'] as const

const handlers: Record<string, (job: Job, logger: Logger) => Promise<void>> = {
  IMAGE_PROCESS_VARIANTS: handleImageProcess,
  CATALOG_AI_IDENTIFY: handleAiIdentify,
  MAINTENANCE_REMINDER_SCAN: handleMaintenanceReminderScan,
  BUFFER_STOCK_REPLENISH_SCAN: handleBufferStockReplenishScan,
  RELANCE_INCOMPLETE_VENDORS_SCAN: handleVendorRelanceScan,
}

/**
 * Garantit qu'un scan de rappels d'entretien est planifié. Idempotent : ne crée
 * un job que si aucun n'est déjà PENDING/PROCESSING (sinon chaque déploiement en
 * empilerait un). Premier scan dans ~1 min, puis le handler se replanifie à +24h.
 */
export async function ensureMaintenanceReminderScheduled(logger: Logger) {
  try {
    const existing = await prisma.job.findFirst({
      where: { type: 'MAINTENANCE_REMINDER_SCAN', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    })
    if (existing) return
    await enqueue('MAINTENANCE_REMINDER_SCAN', {}, { scheduledAt: new Date(Date.now() + 60_000) })
    logger.info({ event: 'MAINTENANCE_REMINDER_SCHEDULED' }, 'Maintenance reminder scan scheduled')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'MAINTENANCE_REMINDER_SCHEDULE_ERROR', error: message }, 'Failed to schedule maintenance reminder')
  }
}

/**
 * Idem pour le scan de réapprovisionnement du stock tampon. Idempotent : un seul
 * job PENDING/PROCESSING à la fois. Premier scan dans ~2 min, puis le handler se
 * replanifie à +24h.
 */
export async function ensureBufferReplenishScheduled(logger: Logger) {
  try {
    const existing = await prisma.job.findFirst({
      where: { type: 'BUFFER_STOCK_REPLENISH_SCAN', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    })
    if (existing) return
    await enqueue('BUFFER_STOCK_REPLENISH_SCAN', {}, { scheduledAt: new Date(Date.now() + 120_000) })
    logger.info({ event: 'BUFFER_STOCK_REPLENISH_SCHEDULED' }, 'Buffer stock replenish scan scheduled')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'BUFFER_STOCK_REPLENISH_SCHEDULE_ERROR', error: message }, 'Failed to schedule buffer stock replenish')
  }
}

/**
 * Idem pour le scan de relance des fiches vendeurs incomplètes. Idempotent : un
 * seul job PENDING/PROCESSING à la fois. Premier scan dans ~3 min, puis le
 * handler se replanifie à +24h.
 */
export async function ensureVendorRelanceScheduled(logger: Logger) {
  try {
    const existing = await prisma.job.findFirst({
      where: { type: 'RELANCE_INCOMPLETE_VENDORS_SCAN', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    })
    if (existing) return
    await enqueue('RELANCE_INCOMPLETE_VENDORS_SCAN', {}, { scheduledAt: new Date(Date.now() + 180_000) })
    logger.info({ event: 'VENDOR_RELANCE_SCHEDULED' }, 'Vendor relance scan scheduled')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'VENDOR_RELANCE_SCHEDULE_ERROR', error: message }, 'Failed to schedule vendor relance')
  }
}

let running = false
let timer: ReturnType<typeof setInterval> | null = null

export function startWorker(logger: Logger) {
  if (running) return
  running = true

  logger.info({ event: 'WORKER_STARTED', pollInterval: POLL_INTERVAL }, 'Queue worker started')

  timer = setInterval(async () => {
    try {
      const job = await dequeue([...JOB_TYPES])
      if (!job) return

      const handler = handlers[job.type]
      if (handler) {
        logger.info({ event: 'JOB_PROCESSING', jobId: job.id, type: job.type }, `Processing job ${job.type}`)
        await handler(job, logger)
      } else {
        logger.warn({ event: 'JOB_UNKNOWN_TYPE', jobId: job.id, type: job.type }, `Unknown job type: ${job.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      logger.error({ event: 'WORKER_ERROR', error: message }, 'Queue worker error')
    }
  }, POLL_INTERVAL)
}

export function stopWorker() {
  running = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
