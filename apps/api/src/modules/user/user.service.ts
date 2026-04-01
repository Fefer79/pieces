import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { switchContextSchema, selectRoleSchema, updateRolesSchema } from 'shared/validators'
import type { Role } from 'shared/types'

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, name: true, email: true, roles: true, activeContext: true, consentedAt: true },
  })

  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  return user
}

export async function updateProfile(userId: string, data: { name?: string; email?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404)
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name || null }),
      ...(data.email !== undefined && { email: data.email || null }),
    },
    select: { id: true, phone: true, name: true, email: true, roles: true, activeContext: true },
  })

  return updated
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

export async function selectRole(userId: string, role: string) {
  const parsed = selectRoleSchema.safeParse({ role })
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

  const newRoles = user.roles.includes(parsed.data.role)
    ? user.roles
    : [...user.roles, parsed.data.role]

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      roles: newRoles,
      activeContext: parsed.data.role,
    },
    select: { id: true, phone: true, roles: true, activeContext: true, consentedAt: true },
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
