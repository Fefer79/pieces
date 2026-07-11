import type { Job } from '@prisma/client'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { AppError } from '../../../lib/appError.js'
import { runFitmentsForEnrichment } from '../../enrichment/enrichment.service.js'
import { scanAndSubmitSourcing, collectSourcingResults } from '../../enrichment/enrichment.sourcing.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const COLLECT_RETRY_MS = 10 * 60 * 1000
/** ~24h de relances de collecte : au-delà, le batch a expiré côté API. */
const COLLECT_MAX_POLLS = 150

/**
 * Passe 2 — compatibilités véhicules (recherche web). Déclenchée après la
 * passe 1 dès qu'une référence a une confiance ≥ 70 %. Le résultat rejoint la
 * fiche brouillon avant la fin de la saisie prix / stock.
 */
export async function handleEnrichmentFitments(job: Job, logger: Logger) {
  const { enrichmentId } = job.payload as { enrichmentId?: string }
  try {
    if (!enrichmentId) throw new AppError('ENRICHMENT_JOB_PAYLOAD', 500, { message: 'enrichmentId manquant dans le payload' })
    await runFitmentsForEnrichment(enrichmentId, logger)
    logger.info({ event: 'ENRICHMENT_FITMENTS_DONE', enrichmentId }, 'Compatibilités enrichies')
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'ENRICHMENT_FITMENTS_FAILED', enrichmentId, error: message }, 'Passe 2 en échec')
    await markFailed(job.id, message)
  }
}

/**
 * Phase 2 — scan nocturne de sourcing (Batch API). Se replanifie à +24h ; la
 * collecte des résultats est déléguée à ENRICHMENT_SOURCING_COLLECT qui se
 * replanifie toutes les 10 min tant que le batch tourne.
 */
export async function handleEnrichmentSourcingScan(job: Job, logger: Logger) {
  try {
    const batchId = await scanAndSubmitSourcing(logger)
    if (batchId) {
      await enqueue(
        'ENRICHMENT_SOURCING_COLLECT',
        { batchId, polls: 0 },
        { scheduledAt: new Date(Date.now() + COLLECT_RETRY_MS) },
      )
    }
    await enqueue('ENRICHMENT_SOURCING_SCAN', {}, { scheduledAt: new Date(Date.now() + ONE_DAY_MS) })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'ENRICHMENT_SOURCING_SCAN_FAILED', error: message }, 'Scan de sourcing en échec')
    await markFailed(job.id, message)
  }
}

export async function handleEnrichmentSourcingCollect(job: Job, logger: Logger) {
  const { batchId, polls = 0 } = job.payload as { batchId?: string; polls?: number }
  try {
    if (!batchId) throw new AppError('ENRICHMENT_JOB_PAYLOAD', 500, { message: 'batchId manquant dans le payload' })
    const outcome = await collectSourcingResults(batchId, logger)
    if (outcome === 'processing') {
      if (polls >= COLLECT_MAX_POLLS) {
        throw new AppError('ENRICHMENT_BATCH_TIMEOUT', 500, { message: `Batch ${batchId} toujours en cours après ${polls} relances` })
      }
      await enqueue(
        'ENRICHMENT_SOURCING_COLLECT',
        { batchId, polls: polls + 1 },
        { scheduledAt: new Date(Date.now() + COLLECT_RETRY_MS) },
      )
    }
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'ENRICHMENT_SOURCING_COLLECT_FAILED', batchId, error: message }, 'Collecte de sourcing en échec')
    await markFailed(job.id, message)
  }
}
