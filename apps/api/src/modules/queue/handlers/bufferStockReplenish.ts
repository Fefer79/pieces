import type { Job } from '@prisma/client'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { scanAndReplenish } from '../../enterprise/bufferStock.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Scan quotidien des stocks tampons sous le seuil en autoReplenish → génère les
 * bons de réapprovisionnement et prévient les gestionnaires. Le job se
 * re-planifie lui-même à +24h (pas de cron externe ; le service API reste up).
 * Le backstop au démarrage (server.ts) recrée un job si la chaîne s'est rompue.
 */
export async function handleBufferStockReplenishScan(job: Job, logger: Logger) {
  try {
    const summary = await scanAndReplenish()
    logger.info(
      { event: 'BUFFER_STOCK_REPLENISHED', ...summary },
      'Buffer stock replenish scan complete',
    )
    await enqueue('BUFFER_STOCK_REPLENISH_SCAN', {}, { scheduledAt: new Date(Date.now() + ONE_DAY_MS) })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'BUFFER_STOCK_REPLENISH_FAILED', error: message }, 'Buffer stock replenish scan failed')
    await markFailed(job.id, message)
  }
}
