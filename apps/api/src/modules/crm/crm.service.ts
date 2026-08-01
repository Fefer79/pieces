import type { Prisma } from '@prisma/client'
import {
  createCrmInteractionSchema,
  createCrmTaskSchema,
  updateCrmTaskSchema,
  crmTasksQuerySchema,
  createCrmTagSchema,
  crmTagAssignSchema,
  crmRelanceWhatsAppSchema,
  crmTimelineQuerySchema,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { countClientSegments } from '../../lib/crmSegments.js'
import { notifyWhatsAppUser } from '../whatsapp/whatsapp.service.js'

const DAY_MS = 24 * 60 * 60 * 1000

// Nombre d'événements récupérés par source avant fusion en mémoire.
const TIMELINE_SOURCE_LIMIT = 100

const INTERACTION_LABELS: Record<string, string> = {
  NOTE: 'Note',
  APPEL: 'Appel',
  WHATSAPP: 'Message WhatsApp',
  VISITE: 'Visite',
  EMAIL: 'Email',
  RELANCE: 'Relance WhatsApp',
}

function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

async function assertCrmTargetExists(subject: 'USER' | 'VENDOR', subjectId: string) {
  const exists =
    subject === 'USER'
      ? await prisma.user.findUnique({ where: { id: subjectId }, select: { id: true } })
      : await prisma.vendor.findUnique({ where: { id: subjectId }, select: { id: true } })
  if (!exists) {
    throw new AppError('CRM_TARGET_NOT_FOUND', 404, { message: 'Fiche introuvable' })
  }
}

// Un assigné de tâche est forcément un membre de l'équipe Pièces.
async function assertValidAssignee(assigneeId: string) {
  const assignee = await prisma.user.findUnique({
    where: { id: assigneeId },
    select: { id: true, roles: true },
  })
  if (!assignee || (!assignee.roles.includes('ADMIN') && !assignee.roles.includes('LIAISON'))) {
    throw new AppError('CRM_INVALID_ASSIGNEE', 422, {
      message: 'Assigné invalide (équipe Pièces uniquement)',
    })
  }
}

// Résout en batch les libellés des cibles (pas de N+1) : nom/téléphone pour
// les utilisateurs, nom de boutique pour les vendeurs.
async function resolveSubjectLabels(
  refs: { subject: string; subjectId: string }[],
): Promise<Map<string, string>> {
  const userIds = [...new Set(refs.filter((r) => r.subject === 'USER').map((r) => r.subjectId))]
  const vendorIds = [...new Set(refs.filter((r) => r.subject === 'VENDOR').map((r) => r.subjectId))]
  const [users, vendors] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, phone: true },
        })
      : [],
    vendorIds.length
      ? prisma.vendor.findMany({
          where: { id: { in: vendorIds } },
          select: { id: true, shopName: true },
        })
      : [],
  ])
  const labels = new Map<string, string>()
  for (const u of users) labels.set(`USER:${u.id}`, u.name ?? u.phone ?? u.id)
  for (const v of vendors) labels.set(`VENDOR:${v.id}`, v.shopName)
  return labels
}

// ---------------------------------------------------------------------------
// Vue d'ensemble
// ---------------------------------------------------------------------------

export async function getCrmOverview() {
  const today = startOfToday()
  const tomorrow = new Date(today.getTime() + DAY_MS)
  const sevenDaysAgo = new Date(Date.now() - 7 * DAY_MS)

  const [tachesDuJour, tachesEnRetard, interactions7j, relances7j, segmentsClients] =
    await Promise.all([
      prisma.crmTask.count({
        where: { statut: 'A_FAIRE', echeanceLe: { gte: today, lt: tomorrow } },
      }),
      prisma.crmTask.count({
        where: { statut: 'A_FAIRE', echeanceLe: { lt: today } },
      }),
      prisma.crmInteraction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.crmInteraction.count({
        where: { createdAt: { gte: sevenDaysAgo }, type: 'RELANCE' },
      }),
      countClientSegments(),
    ])

  return { tachesDuJour, tachesEnRetard, interactions7j, relances7j, segmentsClients }
}

// ---------------------------------------------------------------------------
// Timeline fusionnée
// ---------------------------------------------------------------------------

interface TimelineEntry {
  at: Date
  kind: string
  titre: string
  detail?: string | null
  refId?: string
  type?: string
  meta?: unknown
  auteur?: string | null
}

function orderEntry(o: { id: string; status: string; totalAmount: number; createdAt: Date }) {
  return {
    at: o.createdAt,
    kind: 'commande',
    titre: `Commande #${o.id.slice(0, 6)} · ${formatFcfa(o.totalAmount)} · ${o.status}`,
    refId: o.id,
  }
}

function disputeEntry(d: { id: string; status: string; reason: string; createdAt: Date }) {
  return {
    at: d.createdAt,
    kind: 'litige',
    titre: `Litige · ${d.status}`,
    detail: d.reason,
    refId: d.id,
  }
}

function reviewEntry(
  r: { id: string; rating: number; comment: string | null; createdAt: Date },
  titre: string,
) {
  return { at: r.createdAt, kind: 'avis', titre, detail: r.comment, refId: r.id }
}

async function collectUserTimelineEntries(subjectId: string): Promise<TimelineEntry[]> {
  const [orders, disputes, returns, reviews, partRequests] = await Promise.all([
    prisma.order.findMany({
      where: { initiatorId: subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, totalAmount: true, createdAt: true },
    }),
    prisma.dispute.findMany({
      where: { openedBy: subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, reason: true, createdAt: true },
    }),
    prisma.returnOrder.findMany({
      where: { requestedById: subjectId },
      orderBy: { requestedAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, reason: true, description: true, requestedAt: true },
    }),
    prisma.sellerReview.findMany({
      where: { reviewerId: subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
    prisma.partRequest.findMany({
      where: { createdByUserId: subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, partName: true, description: true, createdAt: true },
    }),
  ])

  return [
    ...orders.map(orderEntry),
    ...disputes.map(disputeEntry),
    ...returns.map((r) => ({
      at: r.requestedAt,
      kind: 'retour',
      titre: `Retour · ${r.status}`,
      detail: r.description ?? r.reason,
      refId: r.id,
    })),
    ...reviews.map((r) => reviewEntry(r, `Avis laissé · ${r.rating}/5`)),
    ...partRequests.map((p) => ({
      at: p.createdAt,
      kind: 'demande',
      titre: `Demande de pièce · ${p.status}`,
      detail: p.partName ?? p.description,
      refId: p.id,
    })),
  ]
}

async function collectVendorTimelineEntries(subjectId: string): Promise<TimelineEntry[]> {
  const [orders, disputes, reviews] = await Promise.all([
    prisma.order.findMany({
      where: { items: { some: { vendorId: subjectId } } },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, totalAmount: true, createdAt: true },
    }),
    prisma.dispute.findMany({
      where: { order: { items: { some: { vendorId: subjectId } } } },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, status: true, reason: true, createdAt: true },
    }),
    prisma.sellerReview.findMany({
      where: { vendorId: subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
  ])

  return [
    ...orders.map(orderEntry),
    ...disputes.map(disputeEntry),
    ...reviews.map((r) => reviewEntry(r, `Avis reçu · ${r.rating}/5`)),
  ]
}

export async function getCrmTimeline(
  subject: 'USER' | 'VENDOR',
  subjectId: string,
  rawQuery: unknown,
) {
  const query = crmTimelineQuerySchema.parse(rawQuery)
  await assertCrmTargetExists(subject, subjectId)

  const [interactions, activityEntries] = await Promise.all([
    prisma.crmInteraction.findMany({
      where: { subject, subjectId },
      orderBy: { createdAt: 'desc' },
      take: TIMELINE_SOURCE_LIMIT,
      include: { author: { select: { name: true } } },
    }),
    subject === 'USER'
      ? collectUserTimelineEntries(subjectId)
      : collectVendorTimelineEntries(subjectId),
  ])

  const interactionEntries: TimelineEntry[] = interactions.map((i) => ({
    at: i.createdAt,
    kind: 'interaction',
    type: i.type,
    titre: INTERACTION_LABELS[i.type] ?? i.type,
    detail: i.details,
    meta: i.meta,
    auteur: i.author.name,
    refId: i.id,
  }))

  const entries = [...interactionEntries, ...activityEntries].sort(
    (a, b) => b.at.getTime() - a.at.getTime(),
  )

  return {
    entries: entries.slice(query.offset, query.offset + query.limit),
    total: entries.length,
    limit: query.limit,
    offset: query.offset,
  }
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export async function addCrmInteraction(authorId: string, body: unknown) {
  const parsed = createCrmInteractionSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  await assertCrmTargetExists(data.subject, data.subjectId)

  return prisma.crmInteraction.create({
    data: {
      subject: data.subject,
      subjectId: data.subjectId,
      type: data.type,
      details: data.details ?? null,
      authorId,
    },
    include: { author: { select: { id: true, name: true } } },
  })
}

// ---------------------------------------------------------------------------
// Tâches
// ---------------------------------------------------------------------------

export async function listCrmTasks(rawQuery: unknown) {
  const query = crmTasksQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.CrmTaskWhereInput = {}
  if (query.statut) where.statut = query.statut
  if (query.assigneeId) where.assigneeId = query.assigneeId
  if (query.subject) where.subject = query.subject
  if (query.subjectId) where.subjectId = query.subjectId

  if (query.due) {
    const today = startOfToday()
    const tomorrow = new Date(today.getTime() + DAY_MS)
    if (query.due === 'today') {
      where.echeanceLe = { gte: today, lt: tomorrow }
    } else if (query.due === 'overdue') {
      where.echeanceLe = { lt: new Date() }
      where.statut = 'A_FAIRE'
    } else {
      where.echeanceLe = { gte: tomorrow }
    }
  }

  const [tasks, total] = await Promise.all([
    prisma.crmTask.findMany({
      where,
      orderBy: [{ echeanceLe: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }],
      skip,
      take: limit,
      include: { assignee: { select: { id: true, name: true } } },
    }),
    prisma.crmTask.count({ where }),
  ])

  const labels = await resolveSubjectLabels(tasks)

  return {
    tasks: tasks.map((t) => ({
      ...t,
      subjectLabel: labels.get(`${t.subject}:${t.subjectId}`) ?? null,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}

export async function createCrmTask(authorId: string, body: unknown) {
  const parsed = createCrmTaskSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  await assertCrmTargetExists(data.subject, data.subjectId)
  if (data.assigneeId) await assertValidAssignee(data.assigneeId)

  return prisma.crmTask.create({
    data: {
      subject: data.subject,
      subjectId: data.subjectId,
      titre: data.titre,
      notes: data.notes ?? null,
      echeanceLe: data.echeanceLe ? new Date(data.echeanceLe) : null,
      assigneeId: data.assigneeId ?? null,
      createdById: authorId,
    },
    include: { assignee: { select: { id: true, name: true } } },
  })
}

export async function updateCrmTask(taskId: string, body: unknown) {
  const parsed = updateCrmTaskSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  const existing = await prisma.crmTask.findUnique({
    where: { id: taskId },
    select: { id: true, statut: true },
  })
  if (!existing) {
    throw new AppError('CRM_TASK_NOT_FOUND', 404, { message: 'Tâche introuvable' })
  }
  if (data.assigneeId) await assertValidAssignee(data.assigneeId)

  const update: Prisma.CrmTaskUncheckedUpdateInput = {}
  if (data.titre !== undefined) update.titre = data.titre
  if (data.notes !== undefined) update.notes = data.notes
  if (data.assigneeId !== undefined) update.assigneeId = data.assigneeId
  if (data.statut !== undefined) {
    update.statut = data.statut
    if (data.statut === 'FAIT' && existing.statut !== 'FAIT') update.faitAt = new Date()
    if (data.statut === 'A_FAIRE') update.faitAt = null
  }
  if (data.echeanceLe !== undefined) {
    update.echeanceLe = data.echeanceLe ? new Date(data.echeanceLe) : null
    // Échéance déplacée : le rappel WhatsApp repart à zéro.
    update.rappelEnvoyeAt = null
  }

  return prisma.crmTask.update({
    where: { id: taskId },
    data: update,
    include: { assignee: { select: { id: true, name: true } } },
  })
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export async function listCrmTags() {
  return prisma.crmTag.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { assignments: true } } },
  })
}

export async function createCrmTag(body: unknown) {
  const parsed = createCrmTagSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)

  try {
    return await prisma.crmTag.create({
      data: { nom: parsed.data.nom, couleur: parsed.data.couleur ?? null },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'P2002') {
      throw new AppError('CRM_TAG_EXISTS', 409, { message: 'Un tag avec ce nom existe déjà' })
    }
    throw err
  }
}

export async function deleteCrmTag(tagId: string) {
  const existing = await prisma.crmTag.findUnique({ where: { id: tagId }, select: { id: true } })
  if (!existing) {
    throw new AppError('CRM_TAG_NOT_FOUND', 404, { message: 'Tag introuvable' })
  }
  await prisma.crmTag.delete({ where: { id: tagId } })
}

export async function getCrmTagsOn(subject: 'USER' | 'VENDOR', subjectId: string) {
  const assignments = await prisma.crmTagAssignment.findMany({
    where: { subject, subjectId },
    include: { tag: true },
    orderBy: { createdAt: 'asc' },
  })
  return assignments.map((a) => a.tag)
}

export async function assignCrmTag(tagId: string, body: unknown) {
  const parsed = crmTagAssignSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const { subject, subjectId } = parsed.data

  const tag = await prisma.crmTag.findUnique({ where: { id: tagId }, select: { id: true } })
  if (!tag) throw new AppError('CRM_TAG_NOT_FOUND', 404, { message: 'Tag introuvable' })
  await assertCrmTargetExists(subject, subjectId)

  // Upsert sur l'id composite : l'assignation est idempotente.
  return prisma.crmTagAssignment.upsert({
    where: { tagId_subject_subjectId: { tagId, subject, subjectId } },
    create: { tagId, subject, subjectId },
    update: {},
    include: { tag: true },
  })
}

export async function unassignCrmTag(tagId: string, body: unknown) {
  const parsed = crmTagAssignSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const { subject, subjectId } = parsed.data

  const tag = await prisma.crmTag.findUnique({ where: { id: tagId }, select: { id: true } })
  if (!tag) throw new AppError('CRM_TAG_NOT_FOUND', 404, { message: 'Tag introuvable' })
  await assertCrmTargetExists(subject, subjectId)

  await prisma.crmTagAssignment.deleteMany({ where: { tagId, subject, subjectId } })
}

// ---------------------------------------------------------------------------
// Relance WhatsApp manuelle
// ---------------------------------------------------------------------------

export async function sendCrmRelance(authorId: string, body: unknown) {
  const parsed = crmRelanceWhatsAppSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const { subject, subjectId, message } = parsed.data

  let phone: string | null
  let optedOut: boolean

  if (subject === 'USER') {
    const user = await prisma.user.findUnique({
      where: { id: subjectId },
      select: {
        phone: true,
        notificationPreference: { select: { whatsapp: true } },
      },
    })
    if (!user) throw new AppError('CRM_TARGET_NOT_FOUND', 404, { message: 'Fiche introuvable' })
    phone = user.phone
    optedOut = user.notificationPreference?.whatsapp === false
  } else {
    const vendor = await prisma.vendor.findUnique({
      where: { id: subjectId },
      select: {
        phone: true,
        userId: true,
        user: { select: { notificationPreference: { select: { whatsapp: true } } } },
      },
    })
    if (!vendor) {
      throw new AppError('CRM_TARGET_NOT_FOUND', 404, { message: 'Fiche introuvable' })
    }
    phone = vendor.phone
    // L'opt-out se vérifie sur le compte utilisateur lié, s'il existe.
    optedOut = vendor.userId ? vendor.user?.notificationPreference?.whatsapp === false : false
  }

  if (!phone) {
    throw new AppError('CRM_NO_PHONE', 422, {
      message: 'Aucun numéro de téléphone sur cette fiche',
    })
  }
  if (optedOut) {
    throw new AppError('CRM_OPTOUT', 422, {
      message: 'Cette personne a désactivé les notifications WhatsApp',
    })
  }

  const { sent, channel } = await notifyWhatsAppUser(phone, message)

  // L'interaction est tracée même en cas d'échec d'envoi (meta.sent = false).
  await prisma.crmInteraction.create({
    data: {
      subject,
      subjectId,
      type: 'RELANCE',
      details: message,
      meta: { sent, channel },
      authorId,
    },
  })

  return { sent, channel }
}
