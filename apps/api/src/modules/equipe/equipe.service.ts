import type { AgentObjectiveMetric, Prisma } from '@prisma/client'
import {
  equipeMembersQuerySchema,
  upsertTeamProfileSchema,
  objectivesQuerySchema,
  setObjectiveSchema,
  agentCommissionsQuerySchema,
  generateCommissionsSchema,
  updateAgentCommissionSchema,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

const DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * DAY_MS

// Même convention d'arrondi que le module stock (et le moteur d'arbitrage) :
// les montants de commissions sont arrondis à la centaine de FCFA.
const roundTo100 = (n: number) => Math.round(n / 100) * 100

// Filtre « commandes terminées » : repris EXACTEMENT de getAdminOverview
// (modules/admin/admin.service.ts, COMPLETED_STATUS) — statut COMPLETED seul,
// période sur order.createdAt, commission = Σ OrderItem.commissionAmount.
const COMPLETED_STATUS = 'COMPLETED' as const

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

// ---------------------------------------------------------------------------
// Périodes mensuelles 'YYYY-MM' — bornes UTC, cohérentes avec la ventilation
// mensuelle de getAdminOverview (clé toISOString().slice(0, 7)).
// ---------------------------------------------------------------------------

export function currentPeriode(now = new Date()): string {
  return now.toISOString().slice(0, 7)
}

export function periodeBounds(periode: string): { start: Date; end: Date } {
  const [y, m] = periode.split('-').map(Number)
  const start = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, 1))
  const end = new Date(Date.UTC(y ?? 0, m ?? 1, 1))
  return { start, end }
}

// ---------------------------------------------------------------------------
// Commissions — estimation de base
// ---------------------------------------------------------------------------

/**
 * Base de commission d'un agent pour une période : Σ OrderItem.commissionAmount
 * des commandes COMPLETED de la période (sur order.createdAt) dont le vendeur
 * est ACTUELLEMENT géré par l'agent (Vendor.managedByLiaisonId).
 * OrderItem n'a pas de relation vendor en base : on résout d'abord les ids des
 * vendeurs gérés, puis on agrège les lignes de commande.
 */
export async function estimateCommissionBase(agentId: string, periode: string): Promise<number> {
  const vendors = await prisma.vendor.findMany({
    where: { managedByLiaisonId: agentId },
    select: { id: true },
  })
  if (vendors.length === 0) return 0
  const { start, end } = periodeBounds(periode)
  const agg = await prisma.orderItem.aggregate({
    where: {
      vendorId: { in: vendors.map((v) => v.id) },
      order: { status: COMPLETED_STATUS, createdAt: { gte: start, lt: end } },
    },
    _sum: { commissionAmount: true },
  })
  return agg._sum.commissionAmount ?? 0
}

/** Montant de la commission terrain : taux % de la base, arrondi aux 100 F. */
export function computeCommissionAmount(baseFcfa: number, tauxPct: number): number {
  return roundTo100((baseFcfa * tauxPct) / 100)
}

// ---------------------------------------------------------------------------
// Progression des objectifs (requêtes live par métrique)
// ---------------------------------------------------------------------------

export async function computeObjectiveProgress(
  agentId: string,
  periode: string,
  metrique: AgentObjectiveMetric,
): Promise<number> {
  const { start, end } = periodeBounds(periode)
  switch (metrique) {
    case 'VENDEURS_GERES':
      return prisma.vendor.count({ where: { managedByLiaisonId: agentId } })
    case 'NOUVEAUX_VENDEURS':
      return prisma.vendor.count({
        where: { managedByLiaisonId: agentId, createdAt: { gte: start, lt: end } },
      })
    case 'PROSPECTS_CONCLUS':
      return prisma.vendorContact.count({
        where: { liaisonId: agentId, statut: 'CONCLU', updatedAt: { gte: start, lt: end } },
      })
    case 'PIECES_AJOUTEES':
      return prisma.catalogItem.count({
        where: { createdByLiaisonId: agentId, createdAt: { gte: start, lt: end } },
      })
    case 'INTERACTIONS_CRM':
      return prisma.crmInteraction.count({
        where: { authorId: agentId, createdAt: { gte: start, lt: end } },
      })
    case 'TACHES_FAITES':
      return prisma.crmTask.count({
        where: { assigneeId: agentId, faitAt: { gte: start, lt: end } },
      })
    case 'VISITES_TERRAIN':
      return prisma.contactActivity.count({
        where: { authorId: agentId, type: 'VISITE', createdAt: { gte: start, lt: end } },
      })
  }
}

async function objectivesWithProgress(agentId: string, periode: string) {
  const objectives = await prisma.agentObjective.findMany({
    where: { agentId, periode },
    orderBy: { metrique: 'asc' },
  })
  return Promise.all(
    objectives.map(async (o) => ({
      ...o,
      progression: await computeObjectiveProgress(agentId, periode, o.metrique),
    })),
  )
}

// ---------------------------------------------------------------------------
// Membres
// ---------------------------------------------------------------------------

// Filtre « membre actif » : pas de profil (taux par défaut, actif par défaut)
// ou profil actif. Le filtre « inactif » = profil explicitement désactivé.
const MEMBRE_ACTIF_WHERE: Prisma.UserWhereInput = {
  OR: [{ teamProfile: null }, { teamProfile: { actif: true } }],
}

export async function listMembers(rawQuery: unknown) {
  const query = equipeMembersQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.UserWhereInput = { roles: { has: 'LIAISON' } }
  if (query.actif === 'true') Object.assign(where, MEMBRE_ACTIF_WHERE)
  if (query.actif === 'false') where.teamProfile = { actif: false }
  if (query.q) {
    where.AND = [
      {
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q, mode: 'insensitive' } },
        ],
      },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        createdAt: true,
        teamProfile: true,
        _count: { select: { managedVendors: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const periode = currentPeriode()
  const since7j = new Date(Date.now() - SEVEN_DAYS_MS)
  const now = new Date()

  const members = await Promise.all(
    users.map(async (u) => {
      const [activite7j, tachesEnRetard, baseFcfa, objectifs] = await Promise.all([
        prisma.activityLog.count({ where: { actorId: u.id, createdAt: { gte: since7j } } }),
        prisma.crmTask.count({
          where: { assigneeId: u.id, statut: 'A_FAIRE', echeanceLe: { lt: now } },
        }),
        estimateCommissionBase(u.id, periode),
        objectivesWithProgress(u.id, periode),
      ])
      const tauxPct = u.teamProfile?.tauxCommissionPct ?? 10
      const atteints = objectifs.filter((o) => o.progression >= o.cible).length
      return {
        id: u.id,
        name: u.name,
        phone: u.phone,
        email: u.email,
        createdAt: u.createdAt,
        profil: u.teamProfile,
        vendeursGeres: u._count.managedVendors,
        activite7j,
        tachesEnRetard,
        commissionMois: {
          periode,
          baseFcfa,
          tauxPct,
          montantFcfa: computeCommissionAmount(baseFcfa, tauxPct),
        },
        objectifsMois: { atteints, total: objectifs.length },
      }
    }),
  )

  return { members, total, page, limit }
}

export async function upsertProfile(userId: string, body: unknown) {
  const parsed = upsertTeamProfileSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
  if (!user) {
    throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }

  return prisma.teamMemberProfile.upsert({
    where: { userId },
    create: {
      userId,
      fonction: parsed.data.fonction ?? null,
      ...(parsed.data.staffRole !== undefined && { staffRole: parsed.data.staffRole }),
      ...(parsed.data.businessUnits !== undefined && {
        businessUnits: parsed.data.businessUnits,
      }),
      ...(parsed.data.tauxCommissionPct !== undefined && {
        tauxCommissionPct: parsed.data.tauxCommissionPct,
      }),
      ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
      ...(parsed.data.embaucheLe !== undefined && {
        embaucheLe: parsed.data.embaucheLe ? new Date(parsed.data.embaucheLe) : null,
      }),
    },
    update: {
      ...(parsed.data.fonction !== undefined && { fonction: parsed.data.fonction }),
      ...(parsed.data.staffRole !== undefined && { staffRole: parsed.data.staffRole }),
      ...(parsed.data.businessUnits !== undefined && {
        businessUnits: parsed.data.businessUnits,
      }),
      ...(parsed.data.tauxCommissionPct !== undefined && {
        tauxCommissionPct: parsed.data.tauxCommissionPct,
      }),
      ...(parsed.data.actif !== undefined && { actif: parsed.data.actif }),
      ...(parsed.data.embaucheLe !== undefined && {
        embaucheLe: parsed.data.embaucheLe ? new Date(parsed.data.embaucheLe) : null,
      }),
    },
  })
}

export async function getMember(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      roles: true,
      createdAt: true,
      teamProfile: true,
    },
  })
  if (!user) {
    throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }

  const periode = currentPeriode()
  const { start, end } = periodeBounds(periode)

  const [vendeurs, objectifs, commissions, activites, interactions] = await Promise.all([
    prisma.vendor.findMany({
      where: { managedByLiaisonId: id },
      orderBy: { shopName: 'asc' },
      select: { id: true, shopName: true, commune: true, status: true },
    }),
    objectivesWithProgress(id, periode),
    prisma.agentCommission.findMany({
      where: { agentId: id },
      orderBy: { periode: 'desc' },
      take: 12,
    }),
    prisma.activityLog.findMany({
      where: { actorId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, action: true, targetType: true, createdAt: true },
    }),
    prisma.crmInteraction.findMany({
      where: { authorId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, subject: true, subjectId: true, createdAt: true },
    }),
  ])

  // Commissions plateforme du mois par vendeur géré (même filtre que la base).
  const vendeursAvecCommissions = await Promise.all(
    vendeurs.map(async (v) => {
      const agg = await prisma.orderItem.aggregate({
        where: {
          vendorId: v.id,
          order: { status: COMPLETED_STATUS, createdAt: { gte: start, lt: end } },
        },
        _sum: { commissionAmount: true },
      })
      return { ...v, commissionsMoisFcfa: agg._sum.commissionAmount ?? 0 }
    }),
  )

  // Activité fusionnée (journal d'activité + interactions CRM), 50 dernières.
  const activite = [
    ...activites.map((a) => ({
      kind: 'action' as const,
      id: a.id,
      label: a.action,
      cible: a.targetType,
      createdAt: a.createdAt,
    })),
    ...interactions.map((i) => ({
      kind: 'interaction' as const,
      id: i.id,
      label: i.type,
      cible: `${i.subject}`,
      createdAt: i.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 50)

  return { ...user, vendeursGeres: vendeursAvecCommissions, objectifs, commissions, activite }
}

// ---------------------------------------------------------------------------
// Objectifs
// ---------------------------------------------------------------------------

export async function listObjectives(agentId: string, rawQuery: unknown) {
  const query = objectivesQuerySchema.parse(rawQuery)
  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { id: true } })
  if (!agent) {
    throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }
  return objectivesWithProgress(agentId, query.periode)
}

export async function setObjective(agentId: string, body: unknown) {
  const parsed = setObjectiveSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)

  const agent = await prisma.user.findUnique({ where: { id: agentId }, select: { id: true } })
  if (!agent) {
    throw new AppError('TEAM_MEMBER_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }

  const objective = await prisma.agentObjective.upsert({
    where: {
      agentId_periode_metrique: {
        agentId,
        periode: parsed.data.periode,
        metrique: parsed.data.metrique,
      },
    },
    create: {
      agentId,
      periode: parsed.data.periode,
      metrique: parsed.data.metrique,
      cible: parsed.data.cible,
    },
    update: { cible: parsed.data.cible },
  })
  const progression = await computeObjectiveProgress(
    agentId,
    parsed.data.periode,
    parsed.data.metrique,
  )
  return { ...objective, progression }
}

export async function deleteObjective(id: string) {
  const existing = await prisma.agentObjective.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new AppError('OBJECTIVE_NOT_FOUND', 404, { message: 'Objectif introuvable' })
  }
  return prisma.agentObjective.delete({ where: { id } })
}

// ---------------------------------------------------------------------------
// Commissions
// ---------------------------------------------------------------------------

export async function listCommissions(rawQuery: unknown) {
  const query = agentCommissionsQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.AgentCommissionWhereInput = {}
  if (query.periode) where.periode = query.periode
  if (query.statut) where.statut = query.statut

  const [commissions, total] = await Promise.all([
    prisma.agentCommission.findMany({
      where,
      orderBy: [{ periode: 'desc' }, { montantFcfa: 'desc' }],
      skip,
      take: limit,
      include: { agent: { select: { id: true, name: true, phone: true } } },
    }),
    prisma.agentCommission.count({ where }),
  ])

  return { commissions, total, page, limit }
}

/**
 * Génération des commissions d'une période : pour chaque profil ACTIF, la base
 * est recalculée et la ligne (agentId, periode) upsertée. Une commission PAYEE
 * n'est jamais réécrite ; une ANNULEE non plus (annulation = décision admin).
 * Base 0 → statut ESTIMEE (rien de dû, ligne informative), sinon DUE.
 */
export async function generateCommissions(rawBody: unknown) {
  const parsed = generateCommissionsSchema.safeParse(rawBody)
  if (!parsed.success) throw validationError(parsed.error)
  const periode = parsed.data.periode

  const profils = await prisma.teamMemberProfile.findMany({
    where: { actif: true },
    select: { userId: true, tauxCommissionPct: true },
  })

  let creees = 0
  let misesAJour = 0
  let sautees = 0

  for (const profil of profils) {
    const existing = await prisma.agentCommission.findUnique({
      where: { agentId_periode: { agentId: profil.userId, periode } },
    })
    if (existing && (existing.statut === 'PAYEE' || existing.statut === 'ANNULEE')) {
      sautees += 1
      continue
    }
    const baseFcfa = await estimateCommissionBase(profil.userId, periode)
    const montantFcfa = computeCommissionAmount(baseFcfa, profil.tauxCommissionPct)
    const statut = baseFcfa === 0 ? 'ESTIMEE' : 'DUE'
    await prisma.agentCommission.upsert({
      where: { agentId_periode: { agentId: profil.userId, periode } },
      create: {
        agentId: profil.userId,
        periode,
        baseFcfa,
        tauxPct: profil.tauxCommissionPct,
        montantFcfa,
        statut,
      },
      update: { baseFcfa, tauxPct: profil.tauxCommissionPct, montantFcfa, statut },
    })
    if (existing) misesAJour += 1
    else creees += 1
  }

  return { periode, creees, misesAJour, sautees, profilsActifs: profils.length }
}

export async function updateCommission(id: string, body: unknown) {
  const parsed = updateAgentCommissionSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)

  const existing = await prisma.agentCommission.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('COMMISSION_NOT_FOUND', 404, { message: 'Commission introuvable' })
  }
  if (existing.statut === 'PAYEE') {
    throw new AppError('COMMISSION_ALREADY_PAID', 409, {
      message: 'Commission déjà payée : montant et note ne sont plus modifiables',
    })
  }

  return prisma.agentCommission.update({
    where: { id },
    data: {
      ...(parsed.data.montantFcfa !== undefined && { montantFcfa: parsed.data.montantFcfa }),
      ...(parsed.data.note !== undefined && { note: parsed.data.note }),
    },
    include: { agent: { select: { id: true, name: true, phone: true } } },
  })
}

export async function payCommission(id: string) {
  const existing = await prisma.agentCommission.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('COMMISSION_NOT_FOUND', 404, { message: 'Commission introuvable' })
  }
  if (existing.statut === 'PAYEE') {
    throw new AppError('COMMISSION_ALREADY_PAID', 409, { message: 'Commission déjà payée' })
  }
  if (existing.statut === 'ANNULEE') {
    throw new AppError('COMMISSION_INVALID_TRANSITION', 422, {
      message: 'Une commission annulée ne peut pas être payée',
    })
  }

  return prisma.agentCommission.update({
    where: { id },
    data: { statut: 'PAYEE', paidAt: new Date() },
    include: { agent: { select: { id: true, name: true, phone: true } } },
  })
}

export async function cancelCommission(id: string) {
  const existing = await prisma.agentCommission.findUnique({ where: { id } })
  if (!existing) {
    throw new AppError('COMMISSION_NOT_FOUND', 404, { message: 'Commission introuvable' })
  }
  if (existing.statut === 'PAYEE') {
    throw new AppError('COMMISSION_ALREADY_PAID', 409, {
      message: 'Une commission payée ne peut pas être annulée',
    })
  }
  if (existing.statut === 'ANNULEE') return existing // idempotent

  return prisma.agentCommission.update({
    where: { id },
    data: { statut: 'ANNULEE', paidAt: null },
    include: { agent: { select: { id: true, name: true, phone: true } } },
  })
}

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

export async function getEquipeOverview() {
  const periode = currentPeriode()
  const now = new Date()
  const annee = now.getUTCFullYear()
  const since7j = new Date(Date.now() - SEVEN_DAYS_MS)
  const miMois = now.getUTCDate() >= 15

  const membresWhere: Prisma.UserWhereInput = {
    roles: { has: 'LIAISON' },
    ...MEMBRE_ACTIF_WHERE,
  }

  const [membresActifs, membres, commissionsDues, payeesAnnee] = await Promise.all([
    prisma.user.count({ where: membresWhere }),
    prisma.user.findMany({ where: membresWhere, select: { id: true } }),
    prisma.agentCommission.aggregate({
      where: { periode, statut: 'DUE' },
      _sum: { montantFcfa: true },
      _count: { _all: true },
    }),
    prisma.agentCommission.aggregate({
      where: { statut: 'PAYEE', paidAt: { gte: new Date(Date.UTC(annee, 0, 1)) } },
      _sum: { montantFcfa: true },
      _count: { _all: true },
    }),
  ])

  const membreIds = membres.map((m) => m.id)
  const activites7j =
    membreIds.length === 0
      ? 0
      : await prisma.activityLog.count({
          where: { actorId: { in: membreIds }, createdAt: { gte: since7j } },
        })

  // Objectifs du mois sous 50 % de progression — n'a de sens qu'à mi-mois.
  let objectifsSous50 = 0
  if (miMois && membreIds.length > 0) {
    const objectifs = await prisma.agentObjective.findMany({
      where: { periode, agentId: { in: membreIds } },
    })
    for (const o of objectifs) {
      const progression = await computeObjectiveProgress(o.agentId, o.periode, o.metrique)
      if (progression * 2 < o.cible) objectifsSous50 += 1
    }
  }

  return {
    periode,
    membresActifs,
    commissionsDues: {
      count: commissionsDues._count._all,
      montantFcfa: commissionsDues._sum.montantFcfa ?? 0,
    },
    commissionsPayeesAnnee: {
      count: payeesAnnee._count._all,
      montantFcfa: payeesAnnee._sum.montantFcfa ?? 0,
    },
    objectifsSous50,
    miMois,
    activites7j,
  }
}
