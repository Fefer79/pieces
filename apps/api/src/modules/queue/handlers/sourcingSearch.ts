import type { Job } from '@prisma/client'
import { markCompleted, markFailed } from '../queueService.js'
import { AppError } from '../../../lib/appError.js'
import { runSourcingSearch } from '../../sourcing/sourcing.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/**
 * Exécution d'une recherche d'offres (30-90 s) : la route se contente
 * d'enfiler le job, ce handler appelle l'agent et écrit les SourcingOffer.
 *
 * Job à la demande, jamais récurrent : contrairement aux scans, il ne se
 * replanifie pas.
 */
export async function handleSourcingSearchRun(job: Job, logger: Logger) {
  const { searchId } = job.payload as { searchId?: string }
  try {
    if (!searchId) {
      throw new AppError('SOURCING_JOB_PAYLOAD', 500, {
        message: 'searchId manquant dans le payload',
      })
    }
    const count = await runSourcingSearch(searchId, logger)
    logger.info({ event: 'SOURCING_SEARCH_DONE', searchId, offers: count }, 'Recherche d\'offres terminée')
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'SOURCING_SEARCH_FAILED', searchId, error: message }, 'Recherche d\'offres en échec')
    await markFailed(job.id, message)
  }
}
