import type { Job } from '@prisma/client'
import { markCompleted, markFailed } from '../queueService.js'
import { AppError } from '../../../lib/appError.js'
import { runExtraction } from '../../prospection/prospection.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

/**
 * Extraction IA des réponses d'un entretien de démarchage à partir de sa
 * transcription. Job à la demande, créé par `POST /prospection/interviews/:id/extract`.
 */
export async function handleProspectionExtract(job: Job, logger: Logger) {
  const { interviewId } = job.payload as { interviewId?: string }
  try {
    if (!interviewId) {
      throw new AppError('PROSPECTION_JOB_PAYLOAD', 500, { message: 'interviewId manquant dans le payload' })
    }
    await runExtraction(interviewId, logger)
    await markCompleted(job.id)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.warn(
      { event: 'PROSPECTION_EXTRACT_FAILED', interviewId, error: message },
      'Extraction d’entretien en échec',
    )
    await markFailed(job.id, message)
  }
}
