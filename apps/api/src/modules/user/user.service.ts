import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { switchContextSchema, updateRolesSchema } from 'shared/validators'
import type { Role } from 'shared/types'

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, roles: true, activeContext: true, consentedAt: true },
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  return user
}

export async function switchContext(userId: string, role: string) {
  const parsed = switchContextSchema.safeParse({ role })
  if (!parsed.success) {
    throw new AppError('USER_INVALID_ROLE', 400, { message: parsed.error.issues[0]?.message })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { roles: true },
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  if (!user.roles.includes(parsed.data.role)) {
    throw new AppError('USER_ROLE_NOT_ASSIGNED', 403, {
      message: `Le rôle ${parsed.data.role} n'est pas assigné à cet utilisateur`,
    })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { activeContext: parsed.data.role },
    select: { id: true, phone: true, roles: true, activeContext: true },
  })

  return updated
}

export async function updateRoles(targetUserId: string, roles: Role[]) {
  const parsed = updateRolesSchema.safeParse({ roles })
  if (!parsed.success) {
    throw new AppError('USER_INVALID_ROLES', 400, { message: parsed.error.issues[0]?.message })
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { activeContext: true },
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  const newActiveContext =
    user.activeContext && parsed.data.roles.includes(user.activeContext as Role)
      ? user.activeContext
      : parsed.data.roles[0]

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: {
      roles: parsed.data.roles,
      activeContext: newActiveContext,
    },
    select: { id: true, phone: true, roles: true, activeContext: true },
  })

  return updated
}
