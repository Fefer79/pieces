import type { Job } from '@prisma/client'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { scanAndSendVendorRelances } from '../../liaison/vendorRelance.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Scan quotidien des fiches vendeurs incomplètes → relance WhatsApp au liaison.
 * Le job se re-planifie lui-même à +24h (pas de cron externe ; l'API Render
 * reste up). Le backstop au démarrage (server.ts) recrée un job si la chaîne
 * s'est interrompue.
 */
export async function handleVendorRelanceScan(job: Job, logger: Logger) {
  try {
    const summary = await scanAndSendVendorRelances()
    logger.info(
      { event: 'VENDOR_RELANCES_SENT', ...summary },
      'Vendor relance scan complete',
    )
    await enqueue('RELANCE_INCOMPLETE_VENDORS_SCAN', {}, { scheduledAt: new Date(Date.now() + ONE_DAY_MS) })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'VENDOR_RELANCES_FAILED', error: message }, 'Vendor relance scan failed')
    await markFailed(job.id, message)
  }
}
