import type { Job } from '@prisma/client'
import { enqueue, markCompleted, markFailed } from '../queueService.js'
import { scanAndSendReminders } from '../../enterprise/maintenance.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Scan quotidien des entretiens dus → rappels WhatsApp. Le job se re-planifie
 * lui-même à +24h, de sorte que la boucle tourne sans cron externe (le service
 * API Render reste up en continu). Le backstop au démarrage (server.ts) recrée
 * un job si la chaîne s'est interrompue (échec définitif).
 */
export async function handleMaintenanceReminderScan(job: Job, logger: Logger) {
  try {
    const summary = await scanAndSendReminders()
    logger.info(
      { event: 'MAINTENANCE_REMINDERS_SENT', ...summary },
      'Maintenance reminders scan complete',
    )
    // Replanifie le prochain scan avant de clore celui-ci.
    await enqueue('MAINTENANCE_REMINDER_SCAN', {}, { scheduledAt: new Date(Date.now() + ONE_DAY_MS) })
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn({ event: 'MAINTENANCE_REMINDERS_FAILED', error: message }, 'Maintenance reminders scan failed')
    await markFailed(job.id, message)
  }
}
