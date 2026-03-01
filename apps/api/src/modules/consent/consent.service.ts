import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { consentSchema } from 'shared/validators'

export async function recordConsent(userId: string, body: unknown) {
  const parsed = consentSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError('CONSENT_MUST_ACCEPT', 400, {
      message: 'Le consentement doit être explicitement accepté',
    })
  }

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!existing) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { consentedAt: new Date() },
    select: { consentedAt: true },
  })

  return { consentedAt: user.consentedAt }
}

export async function getUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      phone: true,
      roles: true,
      activeContext: true,
      consentedAt: true,
      createdAt: true,
    },
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  return user
}

export async function requestDeletion(userId: string) {
  const existing = await prisma.dataDeletionRequest.findFirst({
    where: { userId, status: 'PENDING' },
    select: { id: true, status: true, requestedAt: true },
  })

  if (existing) {
    return existing
  }

  const request = await prisma.dataDeletionRequest.create({
    data: { userId },
    select: { id: true, status: true, requestedAt: true },
  })

  return request
}
