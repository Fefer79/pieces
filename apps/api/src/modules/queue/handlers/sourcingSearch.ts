import type { Job } from '@prisma/client'
import { markCompleted, markFailed } from '../queueService.js'
import { prisma } from '../../../lib/prisma.js'
import { isAnthropicConfigured } from '../../../lib/anthropic.js'
import { runOfferSearch, sourcingModel } from '../../sourcing/sourcing.agent.js'
// Import cross-module assumé : l'écriture des offres (conversion de devise,
// mapping de condition) vit dans le service de sourcing. La dupliquer ici
// ferait diverger les règles de prix.
import { persistSearchResults } from '../../sourcing/sourcing.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/**
 * Exécution d'une recherche d'offres (30–90 s : trop long pour une requête
 * HTTP, d'où le passage par la file). Job à la demande, `maxAttempts: 1` — un
 * retry relancerait des recherches web facturées sur une requête déjà connue
 * pour échouer, et créerait des offres en double.
 */
export async function handleSourcingSearchRun(job: Job, logger: Logger) {
  const payload = job.payload as { searchId?: string } | null
  const searchId = payload?.searchId

  try {
    if (!searchId) {
      logger.warn({ event: 'SOURCING_SEARCH_NO_ID', jobId: job.id }, 'Sourcing job without searchId')
      await markCompleted(job.id)
      return
    }

    const search = await prisma.sourcingSearch.findUnique({ where: { id: searchId } })
    if (!search || search.status === 'DONE' || search.status === 'FAILED') {
      await markCompleted(job.id)
      return
    }

    if (!isAnthropicConfigured()) {
      await prisma.sourcingSearch.update({
        where: { id: searchId },
        data: { status: 'FAILED', finishedAt: new Date(), error: 'ANTHROPIC_API_KEY absente' },
      })
      logger.warn({ event: 'SOURCING_SEARCH_NO_API_KEY', searchId }, 'Sourcing search skipped: no API key')
      await markCompleted(job.id)
      return
    }

    await prisma.sourcingSearch.update({
      where: { id: searchId },
      data: { status: 'RUNNING', startedAt: new Date(), model: sourcingModel() },
    })

    const output = await runOfferSearch(
      {
        partName: search.partName,
        oemReference: search.oemReference,
        vehicleBrand: search.vehicleBrand,
        vehicleModel: search.vehicleModel,
        vehicleYear: search.vehicleYear,
        quantity: search.quantity,
      },
      logger,
    )

    if (!output) {
      await prisma.sourcingSearch.update({
        where: { id: searchId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          error: 'Recherche indisponible (erreur API ou sortie invalide)',
        },
      })
      logger.warn({ event: 'SOURCING_SEARCH_FAILED', searchId }, 'Offer search returned nothing')
      await markCompleted(job.id)
      return
    }

    await persistSearchResults(searchId, output)
    logger.info(
      { event: 'SOURCING_SEARCH_DONE', searchId, offers: output.offers.length },
      'Offer search complete',
    )
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (searchId) {
      await prisma.sourcingSearch
        .update({
          where: { id: searchId },
          data: { status: 'FAILED', finishedAt: new Date(), error: message.slice(0, 500) },
        })
        .catch(() => {})
    }
    logger.warn({ event: 'SOURCING_SEARCH_ERROR', searchId, error: message }, 'Sourcing search failed')
    await markFailed(job.id, message)
  }
}
