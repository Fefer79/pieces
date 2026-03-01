import { dequeue } from './queueService.js'
import { handleImageProcess, handleAiIdentify } from './handlers/imageProcess.js'
import type { Job } from '@prisma/client'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
  error: (obj: Record<string, unknown>, msg: string) => void
}

const POLL_INTERVAL = 30_000 // 30 seconds
const JOB_TYPES = ['IMAGE_PROCESS_VARIANTS', 'CATALOG_AI_IDENTIFY'] as const

const handlers: Record<string, (job: Job, logger: Logger) => Promise<void>> = {
  IMAGE_PROCESS_VARIANTS: handleImageProcess,
  CATALOG_AI_IDENTIFY: handleAiIdentify,
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
