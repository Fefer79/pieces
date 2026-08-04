import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import {
  ERP_BADGES,
  hasCapability,
  type ErpBadgeKey,
  type ErpCapability,
  type StaffRoleKey,
  type BusinessUnitKey,
} from 'shared/constants'
import type {
  StaffListQuery,
  StaffCandidatesQuery,
  StaffCreateInput,
  StaffUpdateInput,
  ErpSearchQuery,
} from 'shared/validators'

// Services du socle ERP — lot 1 « Structure ».
//
// Ce module ne crée aucune donnée métier : il enrôle l'équipe, compte le
// travail en attente à partir des tables existantes, et cherche à travers les
// objets déjà produits par la plateforme. Le cockpit réutilise directement
// `getAdminOverview()` plutôt que de recalculer : deux écrans qui comptent
// différemment font perdre confiance aux deux.

// ---------------------------------------------------------------------------
// Identité
// ---------------------------------------------------------------------------

/**
 * Identité affichable dans la coquille ERP.
 *
 * `request.user` ne porte pas le nom (il n'est pas nécessaire à
 * l'authentification) ; la coquille en a besoin pour le bloc de contexte.
 */
export async function getErpIdentity(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, phone: true, email: true },
  })
  return (
    user ?? { id: userId, name: null, phone: null, email: null }
  )
}

// ---------------------------------------------------------------------------
// Équipe
// ---------------------------------------------------------------------------

const STAFF_SELECT = {
  id: true,
  staffRole: true,
  businessUnits: true,
  title: true,
  active: true,
  hiredAt: true,
  createdAt: true,
  user: { select: { id: true, name: true, phone: true, email: true, roles: true } },
} as const

export async function listStaff(query: StaffListQuery) {
  const q = query.q?.trim()
  const members = await prisma.staffMember.findMany({
    where: {
      ...(query.actif ? { active: query.actif === 'true' } : {}),
      ...(q
        ? {
            user: {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { phone: { contains: q } },
                { email: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          }
        : {}),
    },
    select: STAFF_SELECT,
    orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
  })

  return { members }
}

/**
 * Utilisateurs enrôlables : on n'enrôle jamais un inconnu, toujours un compte
 * Pièces existant. Les membres déjà enrôlés sont exclus des résultats.
 */
export async function listStaffCandidates(query: StaffCandidatesQuery) {
  const q = query.q.trim()
  const users = await prisma.user.findMany({
    where: {
      staffMember: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, phone: true, email: true, roles: true },
    take: 10,
    orderBy: { createdAt: 'desc' },
  })

  return { candidates: users }
}

export async function createStaff(input: StaffCreateInput) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, staffMember: { select: { id: true } } },
  })
  if (!user) {
    throw new AppError('USER_NOT_FOUND', 404, { message: 'Utilisateur introuvable' })
  }
  if (user.staffMember) {
    throw new AppError('STAFF_ALREADY_ENROLLED', 409, {
      message: 'Cet utilisateur fait déjà partie de l’équipe.',
    })
  }

  const member = await prisma.staffMember.create({
    data: {
      userId: input.userId,
      staffRole: input.staffRole,
      businessUnits: input.businessUnits,
      title: input.title ?? null,
      hiredAt: input.hiredAt ? new Date(input.hiredAt) : null,
    },
    select: STAFF_SELECT,
  })

  return { member }
}

export async function updateStaff(id: string, input: StaffUpdateInput) {
  const existing = await prisma.staffMember.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new AppError('STAFF_NOT_FOUND', 404, { message: 'Membre introuvable' })
  }

  const member = await prisma.staffMember.update({
    where: { id },
    data: {
      ...(input.staffRole !== undefined && { staffRole: input.staffRole }),
      ...(input.businessUnits !== undefined && { businessUnits: input.businessUnits }),
      ...(input.title !== undefined && { title: input.title }),
      ...(input.active !== undefined && { active: input.active }),
      ...(input.hiredAt !== undefined && {
        hiredAt: input.hiredAt ? new Date(input.hiredAt) : null,
      }),
    },
    select: STAFF_SELECT,
  })

  return { member }
}

// ---------------------------------------------------------------------------
// Compteurs de navigation
// ---------------------------------------------------------------------------

/** Prospects encore travaillables : une relance échue sur eux appelle un geste. */
const OPEN_CONTACT_STATUSES = ['A_CONTACTER', 'APPELE', 'VISITE', 'RELANCE', 'A_REVOIR'] as const

/**
 * Compteurs de travail en attente, un par entrée de navigation concernée.
 *
 * Chaque compteur est gardé par sa propre capacité : un comptable n'obtient pas
 * le nombre de fiches à modérer, il n'a pas accès au catalogue. Un compteur
 * refusé est absent de la réponse, pas à zéro — zéro voudrait dire « rien à
 * faire », ce qui est faux.
 */
export async function getNavCounts(capabilities: readonly ErpCapability[]) {
  const now = new Date()
  const allowed = (key: ErpBadgeKey) => hasCapability(capabilities, ERP_BADGES[key].capability)

  const [
    disputes,
    returns,
    moderation,
    sourcing,
    pipeline,
    prospection,
    remuneration,
  ] = await Promise.all([
    allowed('sav') ? prisma.dispute.count({ where: { status: 'OPEN' } }) : null,
    allowed('sav') ? prisma.returnOrder.count({ where: { status: 'REQUESTED' } }) : null,
    allowed('moderation')
      ? prisma.partEnrichment.count({ where: { statut: 'EN_MODERATION' } })
      : null,
    allowed('sourcing')
      ? prisma.sourcingOffer.count({ where: { status: 'SHORTLISTED', priceConfirmed: false } })
      : null,
    allowed('pipeline') ? prisma.logisticsQuoteRequest.count({ where: { status: 'NEW' } }) : null,
    allowed('prospection')
      ? prisma.vendorContact.count({
          where: { relanceLe: { lte: now }, statut: { in: [...OPEN_CONTACT_STATUSES] } },
        })
      : null,
    allowed('remuneration') ? prisma.agentCommission.count({ where: { statut: 'DUE' } }) : null,
  ])

  const counts: Partial<Record<ErpBadgeKey, number>> = {}
  if (disputes !== null && returns !== null) counts.sav = disputes + returns
  if (moderation !== null) counts.moderation = moderation
  if (sourcing !== null) counts.sourcing = sourcing
  if (pipeline !== null) counts.pipeline = pipeline
  if (prospection !== null) counts.prospection = prospection
  if (remuneration !== null) counts.remuneration = remuneration

  return { counts }
}

// ---------------------------------------------------------------------------
// Recherche globale
// ---------------------------------------------------------------------------

export interface ErpSearchHit {
  kind: 'compte' | 'vendeur' | 'entreprise' | 'piece' | 'commande' | 'sourcing' | 'expedition'
  id: string
  label: string
  hint: string | null
  href: string
}

/**
 * Recherche transverse — la sortie de secours qui rend une console à neuf
 * sections confortable : quand on sait ce qu'on cherche, on ne navigue pas.
 *
 * Chaque famille est gardée par la capacité de la section qui l'héberge, pour
 * que la recherche ne devienne pas un contournement des habilitations.
 */
export async function searchErp(query: ErpSearchQuery, capabilities: readonly ErpCapability[]) {
  const q = query.q.trim()
  const take = query.limit
  const can = (c: ErpCapability) => hasCapability(capabilities, c)
  const insensitive = { contains: q, mode: 'insensitive' as const }

  const [users, vendors, enterprises, parts, orders, searches, shipments] = await Promise.all([
    can('crm:read')
      ? prisma.user.findMany({
          where: { OR: [{ name: insensitive }, { phone: { contains: q } }, { email: insensitive }] },
          select: { id: true, name: true, phone: true },
          take,
        })
      : [],
    can('crm:read')
      ? prisma.vendor.findMany({
          where: { OR: [{ shopName: insensitive }, { phone: { contains: q } }] },
          select: { id: true, shopName: true, commune: true },
          take,
        })
      : [],
    can('crm:read')
      ? prisma.enterprise.findMany({
          where: { OR: [{ name: insensitive }, { rccm: insensitive }] },
          select: { id: true, name: true, commune: true },
          take,
        })
      : [],
    can('stock:read')
      ? prisma.catalogItem.findMany({
          where: { OR: [{ name: insensitive }, { oemReference: insensitive }] },
          select: { id: true, name: true, oemReference: true },
          take,
        })
      : [],
    // Une commande n'a pas de numéro lisible en base : elle se retrouve par son
    // jeton de partage (celui du lien de paiement) ou par le téléphone du
    // payeur — les deux seules chaînes qu'un opérateur a sous la main.
    can('sales:read')
      ? prisma.order.findMany({
          where: { OR: [{ shareToken: insensitive }, { ownerPhone: { contains: q } }] },
          select: { id: true, initiatorId: true, status: true, totalAmount: true },
          take,
        })
      : [],
    can('purchase:read')
      ? prisma.sourcingSearch.findMany({
          where: { OR: [{ partName: insensitive }, { oemReference: insensitive }] },
          select: { id: true, partName: true, oemReference: true },
          take,
        })
      : [],
    can('purchase:read')
      ? prisma.shipment.findMany({
          where: { OR: [{ reference: insensitive }, { trackingNumber: insensitive }] },
          select: { id: true, reference: true, status: true },
          take,
        })
      : [],
  ])

  const hits: ErpSearchHit[] = [
    ...users.map((u) => ({
      kind: 'compte' as const,
      id: u.id,
      label: u.name ?? u.phone ?? 'Compte sans nom',
      hint: u.phone,
      href: `/admin/clients/${u.id}`,
    })),
    ...vendors.map((v) => ({
      kind: 'vendeur' as const,
      id: v.id,
      label: v.shopName,
      hint: v.commune,
      href: `/admin/vendors/${v.id}`,
    })),
    ...enterprises.map((e) => ({
      kind: 'entreprise' as const,
      id: e.id,
      label: e.name,
      hint: e.commune,
      href: `/admin/enterprises/${e.id}`,
    })),
    ...parts.map((p) => ({
      kind: 'piece' as const,
      id: p.id,
      label: p.name ?? 'Pièce sans nom',
      hint: p.oemReference,
      href: `/admin/catalog/${p.id}`,
    })),
    ...orders.map((o) => ({
      kind: 'commande' as const,
      id: o.id,
      label: `Commande ${o.id.slice(0, 8)}`,
      hint: `${o.status} · ${o.totalAmount.toLocaleString('fr-FR')} FCFA`,
      // L'écran Commandes arrive au lot 4 : on mène à la fiche du client, seul
      // endroit d'où une commande est aujourd'hui consultable.
      href: `/admin/clients/${o.initiatorId}`,
    })),
    ...searches.map((s) => ({
      kind: 'sourcing' as const,
      id: s.id,
      label: s.partName,
      hint: s.oemReference,
      href: `/admin/sourcing/${s.id}`,
    })),
    ...shipments.map((s) => ({
      kind: 'expedition' as const,
      id: s.id,
      label: s.reference,
      hint: s.status,
      href: `/admin/expeditions/${s.id}`,
    })),
  ]

  return { hits }
}

export type { StaffRoleKey, BusinessUnitKey }
