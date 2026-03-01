import { prisma } from '../../lib/prisma.js'
import type { Prisma, JobType } from '@prisma/client'

export interface EnqueueOptions {
  maxAttempts?: number
  scheduledAt?: Date
}

export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  options?: EnqueueOptions,
) {
  return prisma.job.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      maxAttempts: options?.maxAttempts ?? 3,
      scheduledAt: options?.scheduledAt ?? null,
    },
  })
}

export async function dequeue(types: JobType[]) {
  // SELECT FOR UPDATE SKIP LOCKED pattern
  const jobs = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id FROM jobs
     WHERE status = 'PENDING'
     AND type = ANY($1::"JobType"[])
     AND (scheduled_at IS NULL OR scheduled_at <= NOW())
     AND attempts < max_attempts
     ORDER BY created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    types,
  )

  const firstJob = jobs[0]
  if (!firstJob) return null

  const job = await prisma.job.update({
    where: { id: firstJob.id },
    data: {
      status: 'PROCESSING',
      attempts: { increment: 1 },
    },
  })

  return job
}

export async function markCompleted(jobId: string) {
  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  })
}

export async function markFailed(jobId: string, error: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return null

  const newStatus = job.attempts >= job.maxAttempts ? 'FAILED' : 'PENDING'

  return prisma.job.update({
    where: { id: jobId },
    data: {
      status: newStatus,
      error,
    },
  })
}
