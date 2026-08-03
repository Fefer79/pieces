import { dequeue, enqueue } from './queueService.js'
import { prisma } from '../../lib/prisma.js'
import { handleImageProcess, handleAiIdentify } from './handlers/imageProcess.js'
import { handleMaintenanceReminderScan } from './handlers/maintenanceReminder.js'
import { handleBufferStockReplenishScan } from './handlers/bufferStockReplenish.js'
import { handleVendorRelanceScan } from './handlers/vendorRelance.js'
import { handleCrmDueTasksScan } from './handlers/crmDueTasks.js'
import { handleMarketingCampaignSend } from './handlers/marketingCampaignSend.js'
import { handleSourcingSearchRun } from './handlers/sourcingSearch.js'
import {
  handleEnrichmentFitments,
  handleEnrichmentSourcingScan,
  handleEnrichmentSourcingCollect,
} from './handlers/enrichment.js'
import type { Job } from '@prisma/client'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
  error: (obj: Record<string, unknown>, msg: string) => void
}

const POLL_INTERVAL = 30_000 // 30 seconds
const JOB_TYPES = ['IMAGE_PROCESS_VARIANTS', 'CATALOG_AI_IDENTIFY', 'MAINTENANCE_REMINDER_SCAN', 'BUFFER_STOCK_REPLENISH_SCAN', 'RELANCE_INCOMPLETE_VENDORS_SCAN', 'ENRICHMENT_FITMENTS', 'ENRICHMENT_SOURCING_SCAN', 'ENRICHMENT_SOURCING_COLLECT', 'CRM_DUE_TASKS_SCAN', 'MARKETING_CAMPAIGN_SEND', 'SOURCING_SEARCH_RUN'] as const

const handlers: Record<string, (job: Job, logger: Logger) => Promise<void>> = {
  IMAGE_PROCESS_VARIANTS: handleImageProcess,
  CATALOG_AI_IDENTIFY: handleAiIdentify,
  MAINTENANCE_REMINDER_SCAN: handleMaintenanceReminderScan,
  BUFFER_STOCK_REPLENISH_SCAN: handleBufferStockReplenishScan,
  RELANCE_INCOMPLETE_VENDORS_SCAN: handleVendorRelanceScan,
  ENRICHMENT_FITMENTS: handleEnrichmentFitments,
  ENRICHMENT_SOURCING_SCAN: handleEnrichmentSourcingScan,
  ENRICHMENT_SOURCING_COLLECT: handleEnrichmentSourcingCollect,
  CRM_DUE_TASKS_SCAN: handleCrmDueTasksScan,
  MARKETING_CAMPAIGN_SEND: handleMarketingCampaignSend,
  SOURCING_SEARCH_RUN: handleSourcingSearchRun,
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

/**
 * Idem pour le scan nocturne de sourcing (Agent Fiche Terrain, phase 2).
 * Idempotent ; premier passage programmé à la prochaine occurrence de 2h du
 * matin, puis le handler se replanifie à +24h. Sans ANTHROPIC_API_KEY le
 * handler se contente de logger et de se replanifier.
 */
export async function ensureEnrichmentSourcingScheduled(logger: Logger) {
  try {
    const existing = await prisma.job.findFirst({
      where: { type: 'ENRICHMENT_SOURCING_SCAN', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    })
    if (existing) return
    const next2am = new Date()
    next2am.setHours(2, 0, 0, 0)
    if (next2am <= new Date()) next2am.setDate(next2am.getDate() + 1)
    await enqueue('ENRICHMENT_SOURCING_SCAN', {}, { scheduledAt: next2am })
    logger.info({ event: 'ENRICHMENT_SOURCING_SCHEDULED', scheduledAt: next2am.toISOString() }, 'Enrichment sourcing scan scheduled')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'ENRICHMENT_SOURCING_SCHEDULE_ERROR', error: message }, 'Failed to schedule enrichment sourcing')
  }
}

/**
 * Idem pour le rappel quotidien des tâches CRM dues. Idempotent : un seul job
 * PENDING/PROCESSING à la fois. Premier passage au prochain 7h00, puis le
 * handler se replanifie chaque jour à 7h00.
 */
export async function ensureCrmDueTasksScheduled(logger: Logger) {
  try {
    const existing = await prisma.job.findFirst({
      where: { type: 'CRM_DUE_TASKS_SCAN', status: { in: ['PENDING', 'PROCESSING'] } },
      select: { id: true },
    })
    if (existing) return
    const next7am = new Date()
    next7am.setHours(7, 0, 0, 0)
    if (next7am <= new Date()) next7am.setDate(next7am.getDate() + 1)
    await enqueue('CRM_DUE_TASKS_SCAN', {}, { scheduledAt: next7am })
    logger.info({ event: 'CRM_DUE_TASKS_SCHEDULED', scheduledAt: next7am.toISOString() }, 'CRM due tasks scan scheduled')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error({ event: 'CRM_DUE_TASKS_SCHEDULE_ERROR', error: message }, 'Failed to schedule CRM due tasks scan')
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
