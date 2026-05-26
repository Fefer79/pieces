import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import type { EnterpriseMemberRole } from '@prisma/client'

function slugify(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || 'enterprise'
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`
    const taken = await prisma.enterprise.findUnique({ where: { slug: candidate } })
    if (!taken) return candidate
  }
  return `${base}-${Date.now()}`
}

export async function createEnterprise(
  ownerUserId: string,
  data: { name: string; address?: string; rccm?: string },
) {
  const slug = await uniqueSlug(data.name)
  const enterprise = await prisma.enterprise.create({
    data: {
      name: data.name,
      slug,
      address: data.address,
      rccm: data.rccm,
      members: {
        create: {
          userId: ownerUserId,
          role: 'OWNER',
          joinedAt: new Date(),
        },
      },
    },
    select: { id: true, name: true, slug: true, address: true, rccm: true, createdAt: true },
  })
  return enterprise
}

export async function listEnterprisesForUser(userId: string) {
  const memberships = await prisma.enterpriseMember.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      role: true,
      joinedAt: true,
      enterprise: {
        select: { id: true, name: true, slug: true, address: true, rccm: true, createdAt: true },
      },
    },
  })
  return memberships.map((m) => ({ ...m.enterprise, memberRole: m.role, joinedAt: m.joinedAt }))
}

export async function assertMember(
  enterpriseId: string,
  userId: string,
  minRoles?: EnterpriseMemberRole[],
) {
  const member = await prisma.enterpriseMember.findUnique({
    where: { uq_enterprise_member: { enterpriseId, userId } },
    select: { role: true },
  })
  if (!member) {
    throw new AppError('ENTERPRISE_FORBIDDEN', 403, { message: 'Accès refusé à cette entreprise' })
  }
  if (minRoles && !minRoles.includes(member.role)) {
    throw new AppError('ENTERPRISE_INSUFFICIENT_ROLE', 403, {
      message: 'Rôle insuffisant pour cette action',
    })
  }
  return member
}

export async function getEnterprise(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)
  const enterprise = await prisma.enterprise.findUnique({
    where: { id: enterpriseId },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      rccm: true,
      createdAt: true,
      _count: { select: { vehicles: true, members: true } },
    },
  })
  if (!enterprise) throw new AppError('ENTERPRISE_NOT_FOUND', 404)
  return enterprise
}

export async function inviteMember(
  enterpriseId: string,
  invitedBy: string,
  data: { phone?: string; email?: string; role: EnterpriseMemberRole },
) {
  await assertMember(enterpriseId, invitedBy, ['OWNER', 'MANAGER'])

  const target = await prisma.user.findFirst({
    where: data.phone ? { phone: data.phone } : { email: data.email },
    select: { id: true, name: true, phone: true, email: true },
  })
  if (!target) {
    throw new AppError('USER_NOT_FOUND', 404, {
      message: 'Aucun utilisateur Pièces avec ce contact. Demandez-lui de créer un compte d\'abord.',
    })
  }

  const existing = await prisma.enterpriseMember.findUnique({
    where: { uq_enterprise_member: { enterpriseId, userId: target.id } },
  })
  if (existing) {
    throw new AppError('MEMBER_ALREADY_EXISTS', 409, { message: 'Cet utilisateur est déjà membre' })
  }

  const member = await prisma.enterpriseMember.create({
    data: {
      enterpriseId,
      userId: target.id,
      role: data.role,
      invitedAt: new Date(),
      joinedAt: new Date(),
    },
    select: {
      id: true,
      role: true,
      invitedAt: true,
      joinedAt: true,
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  })
  return member
}

export async function listMembers(enterpriseId: string, userId: string) {
  await assertMember(enterpriseId, userId)
  return prisma.enterpriseMember.findMany({
    where: { enterpriseId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      invitedAt: true,
      joinedAt: true,
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
  })
}

export async function removeMember(
  enterpriseId: string,
  actorUserId: string,
  memberId: string,
) {
  await assertMember(enterpriseId, actorUserId, ['OWNER', 'MANAGER'])
  const target = await prisma.enterpriseMember.findUnique({
    where: { id: memberId },
    select: { enterpriseId: true, userId: true, role: true },
  })
  if (!target || target.enterpriseId !== enterpriseId) {
    throw new AppError('MEMBER_NOT_FOUND', 404)
  }
  if (target.role === 'OWNER') {
    const ownerCount = await prisma.enterpriseMember.count({
      where: { enterpriseId, role: 'OWNER' },
    })
    if (ownerCount <= 1) {
      throw new AppError('LAST_OWNER', 400, {
        message: 'Impossible de retirer le dernier propriétaire',
      })
    }
  }
  await prisma.enterpriseMember.delete({ where: { id: memberId } })
}
