import { prisma } from '../../../lib/prisma.js'
import { AppError } from '../../../lib/appError.js'
import { requireStaffId, type ErpStaffContext } from '../../../plugins/erpAuth.js'
import type { CreateTaskInput, TaskListQuery, UpdateTaskInput } from 'shared/validators'

const TASK_SELECT = {
  id: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueAt: true,
  businessUnit: true,
  relatedType: true,
  relatedId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
  assignee: {
    select: {
      id: true,
      staffRole: true,
      user: { select: { name: true, phone: true } },
    },
  },
  createdBy: {
    select: { id: true, user: { select: { name: true } } },
  },
} as const

/** Statuts considérés comme clôturés — une tâche clôturée n'est jamais en retard. */
const CLOSED_STATUSES = ['DONE', 'CANCELLED'] as const

export async function listTasks(query: TaskListQuery, staff: ErpStaffContext) {
  // `mine` prime sur `assigneeStaffId` : le raccourci de l'utilisateur gagne
  // toujours sur un filtre laissé dans l'URL.
  const assigneeStaffId = query.mine ? staff.staffId : query.assigneeStaffId

  // `mine` sans fiche staff (ADMIN plateforme non enrôlé) ne peut rien matcher.
  if (query.mine && !staff.staffId) {
    return { items: [], total: 0, page: query.page, pageSize: query.pageSize }
  }

  const where = {
    ...(query.status && { status: query.status }),
    ...(query.priority && { priority: query.priority }),
    ...(query.businessUnit && { businessUnit: query.businessUnit }),
    ...(assigneeStaffId && { assigneeStaffId }),
    ...(query.relatedType && { relatedType: query.relatedType }),
    ...(query.relatedId && { relatedId: query.relatedId }),
    ...(query.overdue && {
      dueAt: { lt: new Date() },
      status: { notIn: [...CLOSED_STATUSES] },
    }),
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      // Les urgences d'abord, puis l'échéance la plus proche. `nulls: 'last'`
      // pour que les tâches sans échéance ne squattent pas le haut de liste.
      orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: TASK_SELECT,
    }),
    prisma.task.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function createTask(input: CreateTaskInput, staff: ErpStaffContext) {
  const createdByStaffId = requireStaffId(staff)

  // Rattachement polymorphe : les deux champs vont ensemble ou aucun.
  // Règle composite → revalidée ici, `zodToFastify` perd les `.refine()`.
  if ((input.relatedType && !input.relatedId) || (!input.relatedType && input.relatedId)) {
    throw new AppError('VALIDATION_ERROR', 422, {
      message: 'Le rattachement exige à la fois un type et un identifiant',
    })
  }

  if (input.assigneeStaffId) {
    await assertStaffExists(input.assigneeStaffId)
  }

  return prisma.task.create({
    data: {
      title: input.title,
      ...(input.description !== undefined && { description: input.description }),
      priority: input.priority,
      ...(input.dueAt !== undefined && { dueAt: new Date(input.dueAt) }),
      ...(input.businessUnit !== undefined && { businessUnit: input.businessUnit }),
      // Par défaut la tâche revient à celui qui la crée : une tâche sans
      // propriétaire n'est jamais faite.
      assigneeStaffId: input.assigneeStaffId ?? createdByStaffId,
      createdByStaffId,
      ...(input.relatedType !== undefined && { relatedType: input.relatedType }),
      ...(input.relatedId !== undefined && { relatedId: input.relatedId }),
    },
    select: TASK_SELECT,
  })
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  if (Object.keys(input).length === 0) {
    throw new AppError('VALIDATION_ERROR', 422, { message: 'Aucune modification fournie' })
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true },
  })
  if (!existing) {
    throw new AppError('ERP_TASK_NOT_FOUND', 404, { message: 'Tâche introuvable' })
  }

  if (input.assigneeStaffId) {
    await assertStaffExists(input.assigneeStaffId)
  }

  // `completedAt` est dérivé du statut, jamais fourni par le client : la date de
  // clôture doit être celle du serveur.
  const closing = input.status !== undefined && CLOSED_STATUSES.includes(input.status as 'DONE')
  const reopening =
    input.status !== undefined &&
    !CLOSED_STATUSES.includes(input.status as 'DONE') &&
    CLOSED_STATUSES.includes(existing.status as 'DONE')

  return prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.dueAt !== undefined && {
        dueAt: input.dueAt === null ? null : new Date(input.dueAt),
      }),
      ...(input.businessUnit !== undefined && { businessUnit: input.businessUnit }),
      ...(input.assigneeStaffId !== undefined && { assigneeStaffId: input.assigneeStaffId }),
      ...(closing && { completedAt: new Date() }),
      ...(reopening && { completedAt: null }),
    },
    select: TASK_SELECT,
  })
}

async function assertStaffExists(staffId: string) {
  const member = await prisma.staffMember.findUnique({
    where: { id: staffId },
    select: { id: true, active: true },
  })
  if (!member) {
    throw new AppError('ERP_STAFF_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }
  if (!member.active) {
    throw new AppError('ERP_STAFF_INACTIVE', 409, {
      message: 'Impossible d’attribuer une tâche à un membre désactivé',
    })
  }
}

/** Compteurs pour le cockpit : à faire / en retard, pour le membre courant. */
export async function countTasksForStaff(staffId: string | null) {
  if (!staffId) return { open: 0, overdue: 0 }
  const [open, overdue] = await Promise.all([
    prisma.task.count({
      where: { assigneeStaffId: staffId, status: { notIn: [...CLOSED_STATUSES] } },
    }),
    prisma.task.count({
      where: {
        assigneeStaffId: staffId,
        status: { notIn: [...CLOSED_STATUSES] },
        dueAt: { lt: new Date() },
      },
    }),
  ])
  return { open, overdue }
}
