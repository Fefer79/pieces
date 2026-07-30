import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../lib/appError.js'
import { capabilitiesFor, type StaffRoleKey, type BusinessUnitKey } from 'shared/constants'
import type { CreateStaffMemberInput, StaffListQuery, UpdateStaffMemberInput } from 'shared/validators'

const STAFF_SELECT = {
  id: true,
  userId: true,
  staffRole: true,
  businessUnits: true,
  title: true,
  active: true,
  hiredAt: true,
  createdAt: true,
  user: { select: { id: true, name: true, phone: true, email: true, roles: true } },
} as const

export async function listStaffMembers(query: StaffListQuery) {
  const where = {
    ...(query.staffRole && { staffRole: query.staffRole }),
    ...(query.active !== undefined && { active: query.active }),
  }

  const [items, total] = await Promise.all([
    prisma.staffMember.findMany({
      where,
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: STAFF_SELECT,
    }),
    prisma.staffMember.count({ where }),
  ])

  return {
    items: items.map((m) => ({
      ...m,
      capabilities: capabilitiesFor({
        staffRole: m.staffRole as StaffRoleKey,
        active: m.active,
      }),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function createStaffMember(input: CreateStaffMemberInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true },
  })
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, { message: 'Utilisateur introuvable' })
  }

  const existing = await prisma.staffMember.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  })
  if (existing) {
    throw new AppError('ERP_STAFF_ALREADY_EXISTS', 409, {
      message: 'Cette personne fait déjà partie de l’équipe',
    })
  }

  return prisma.staffMember.create({
    data: {
      userId: input.userId,
      staffRole: input.staffRole,
      businessUnits: input.businessUnits,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.hiredAt !== undefined && { hiredAt: new Date(input.hiredAt) }),
    },
    select: STAFF_SELECT,
  })
}

export async function updateStaffMember(staffId: string, input: UpdateStaffMemberInput) {
  // `zodToFastify` perd les `.refine()` : on revalide ici que le PATCH n'est
  // pas vide, sinon Prisma ferait un update à blanc silencieux.
  if (Object.keys(input).length === 0) {
    throw new AppError('VALIDATION_ERROR', 422, { message: 'Aucune modification fournie' })
  }

  const existing = await prisma.staffMember.findUnique({
    where: { id: staffId },
    select: { id: true },
  })
  if (!existing) {
    throw new AppError('ERP_STAFF_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }

  return prisma.staffMember.update({
    where: { id: staffId },
    data: {
      ...(input.staffRole !== undefined && { staffRole: input.staffRole }),
      ...(input.businessUnits !== undefined && { businessUnits: input.businessUnits }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.hiredAt !== undefined && {
        hiredAt: input.hiredAt === null ? null : new Date(input.hiredAt),
      }),
    },
    select: STAFF_SELECT,
  })
}

/**
 * Candidats à l'ajout dans l'équipe : utilisateurs sans fiche staff.
 * Recherche par nom, téléphone ou e-mail — l'équipe interne se connaît, une
 * liste complète n'aurait aucun intérêt.
 */
export async function searchStaffCandidates(q: string, limit = 10) {
  if (q.trim().length < 2) return []
  return prisma.user.findMany({
    where: {
      staffMember: { is: null },
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, name: true, phone: true, email: true, roles: true },
  })
}

export type StaffMemberSummary = {
  id: string
  staffRole: StaffRoleKey
  businessUnits: BusinessUnitKey[]
  active: boolean
}
