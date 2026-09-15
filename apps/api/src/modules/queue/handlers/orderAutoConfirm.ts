import type { Job } from '@prisma/client'
import { prisma } from '../../../lib/prisma.js'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { transitionOrder } from '../../order/order.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

const ONE_HOUR_MS = 60 * 60 * 1000
const RETURN_WINDOW_MS = 24 * 60 * 60 * 1000 // socle de reprise, contrat v1.3 article 7

/**
 * Scan horaire : bascule en COMPLETED toute commande DELIVERED depuis plus de
 * 24h sans litige ouvert ou en cours d'examen — l'acheteur avait le socle de
 * reprise pour signaler une non-conformité, il ne l'a pas fait. Se replanifie
 * lui-même (pas de cron externe). Idempotent par construction : une commande
 * déjà CONFIRMED/COMPLETED ne repasse plus par status = 'DELIVERED'.
 */
export async function handleOrderAutoConfirmScan(job: Job, logger: Logger) {
  try {
    const cutoff = new Date(Date.now() - RETURN_WINDOW_MS)

    const candidates = await prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        disputes: { none: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } },
        events: { some: { toStatus: 'DELIVERED', createdAt: { lte: cutoff } } },
      },
      select: { id: true },
    })

    let completed = 0
    let failed = 0
    for (const { id } of candidates) {
      try {
        await transitionOrder(id, 'COMPLETED', 'system', 'Auto-confirmation après 24h sans litige')
        completed += 1
      } catch (err) {
        failed += 1
        const message = err instanceof Error ? err.message : 'Unknown error'
        logger.warn(
          { event: 'ORDER_AUTO_CONFIRM_ITEM_FAILED', orderId: id, error: message },
          'Order auto-confirm failed for one order',
        )
      }
    }

    logger.info(
      { event: 'ORDER_AUTO_CONFIRM_SCAN_DONE', candidates: candidates.length, completed, failed },
      'Order auto-confirm scan complete',
    )
    await enqueue('ORDER_AUTO_CONFIRM_SCAN', {}, { scheduledAt: new Date(Date.now() + ONE_HOUR_MS) })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'ORDER_AUTO_CONFIRM_SCAN_FAILED', error: message }, 'Order auto-confirm scan failed')
    await markFailed(job.id, message)
  }
}
