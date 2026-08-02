import type { Prisma, ReturnReason, ReturnStatus } from '@prisma/client'
import {
  supportDisputesQuerySchema,
  supportReturnsQuerySchema,
  supportResolveDisputeSchema,
  supportTransitionReturnSchema,
} from 'shared/validators'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { notifyWhatsAppUser } from '../whatsapp/whatsapp.service.js'
import { refundEscrow } from '../payment/payment.service.js'

const DAY_MS = 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * DAY_MS

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

// ---------------------------------------------------------------------------
// Machine à états des retours — DUPLIQUÉE de modules/returns/return.service.ts
// (convention du repo : on duplique les helpers plutôt que de coupler les
// modules, cf. periodeBounds dans equipe.service). Toute évolution de la
// machine doit être reportée dans les deux fichiers.
// Le code d'erreur diffère volontairement : RETURN_INVALID_TRANSITION ici
// (périmètre admin), INVALID_RETURN_TRANSITION dans le module returns.
// ---------------------------------------------------------------------------

const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['INSPECTED'],
  INSPECTED: ['REFUNDED', 'REJECTED'],
  REFUNDED: [],
  REJECTED: [],
  CANCELLED: [],
}

const TIMESTAMP_FIELD: Record<ReturnStatus, string | null> = {
  REQUESTED: null,
  ACCEPTED: 'acceptedAt',
  PICKED_UP: 'pickedUpAt',
  INSPECTED: 'inspectedAt',
  REFUNDED: 'refundedAt',
  REJECTED: 'rejectedAt',
  CANCELLED: 'cancelledAt',
}

const RETURN_REASONS: ReturnReason[] = [
  'DEFECTIVE',
  'WRONG_PART',
  'NOT_AS_DESCRIBED',
  'NO_LONGER_NEEDED',
  'OTHER',
]

// Notification WhatsApp best-effort : un échec d'envoi ne doit jamais faire
// échouer l'action admin en cours.
function notifyBestEffort(phone: string | null | undefined, text: string) {
  if (!phone) return
  void notifyWhatsAppUser(phone, text).catch(() => {})
}

// ---------------------------------------------------------------------------
// Cockpit
// ---------------------------------------------------------------------------

export async function getSupportOverview() {
  const since30j = new Date(Date.now() - THIRTY_DAYS_MS)
  const refundedWhere: Prisma.ReturnOrderWhereInput = {
    status: 'REFUNDED',
    refundedAt: { gte: since30j },
  }
  const [
    litigesOuverts,
    litigesEnCours,
    litigesResolus30j,
    retoursDemandes,
    retoursEnCours,
    rembourses30j,
    montantAgg,
  ] = await Promise.all([
    prisma.dispute.count({ where: { status: 'OPEN' } }),
    prisma.dispute.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.dispute.count({ where: { resolvedAt: { gte: since30j } } }),
    prisma.returnOrder.count({ where: { status: 'REQUESTED' } }),
    prisma.returnOrder.count({ where: { status: { in: ['ACCEPTED', 'PICKED_UP', 'INSPECTED'] } } }),
    prisma.returnOrder.count({ where: refundedWhere }),
    prisma.returnOrder.aggregate({ where: refundedWhere, _sum: { refundAmount: true } }),
  ])
  return {
    litigesOuverts,
    litigesEnCours,
    litigesResolus30j,
    retoursDemandes,
    retoursEnCours,
    rembourses30j,
    montantRembourse30j: montantAgg._sum.refundAmount ?? 0,
  }
}

// ---------------------------------------------------------------------------
// Litiges
// ---------------------------------------------------------------------------

export async function listDisputes(rawQuery: unknown) {
  const parsed = supportDisputesQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    throw new AppError('SUPPORT_INVALID_QUERY', 400, {
      message: parsed.error.issues[0]?.message ?? 'Paramètres de recherche invalides',
    })
  }
  const query = parsed.data
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.DisputeWhereInput = {}
  if (query.statut) where.status = query.statut
  if (query.search) {
    where.OR = [
      { reason: { contains: query.search, mode: 'insensitive' } },
      { orderId: { contains: query.search, mode: 'insensitive' } },
    ]
  }

  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: { select: { id: true, status: true, totalAmount: true } },
        opener: { select: { name: true, phone: true } },
      },
    }),
    prisma.dispute.count({ where }),
  ])
  return { disputes, total, page, limit }
}

export async function getDispute(id: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      opener: { select: { name: true, phone: true } },
      order: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          deliveryFee: true,
          laborCost: true,
          createdAt: true,
          initiator: { select: { name: true, phone: true } },
          items: {
            select: {
              id: true,
              name: true,
              vendorShopName: true,
              priceSnapshot: true,
              quantity: true,
              condition: true,
              imageThumbUrl: true,
            },
          },
          escrow: { select: { status: true, amount: true } },
        },
      },
    },
  })
  if (!dispute) throw new AppError('DISPUTE_NOT_FOUND', 404)
  return dispute
}

export async function reviewDispute(id: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!dispute) throw new AppError('DISPUTE_NOT_FOUND', 404)
  if (dispute.status !== 'OPEN') {
    throw new AppError('DISPUTE_INVALID_STATUS', 409, {
      message: `Seul un litige ouvert peut être pris en charge (statut actuel : ${dispute.status})`,
    })
  }
  return prisma.dispute.update({ where: { id }, data: { status: 'UNDER_REVIEW' } })
}

export async function resolveDispute(id: string, rawBody: unknown) {
  const parsed = supportResolveDisputeSchema.safeParse(rawBody)
  if (!parsed.success) throw validationError(parsed.error)
  const { inFavorOf, resolution } = parsed.data

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { opener: { select: { name: true, phone: true } } },
  })
  if (!dispute) throw new AppError('DISPUTE_NOT_FOUND', 404)
  if (dispute.status !== 'OPEN' && dispute.status !== 'UNDER_REVIEW') {
    throw new AppError('DISPUTE_INVALID_STATUS', 409, {
      message: `Ce litige ne peut plus être résolu (statut actuel : ${dispute.status})`,
    })
  }

  // Même écriture que resolveDispute du module review (review.service.ts) :
  // statut RESOLVED_BUYER/RESOLVED_SELLER + resolution + resolvedAt. Le code
  // existant ne recalcule pas le score vendeur à la résolution (le rescoring
  // n'a lieu qu'à l'ouverture, via rescoreOrderVendors) — on s'aligne.
  const status = inFavorOf === 'buyer' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER'
  const updated = await prisma.dispute.update({
    where: { id },
    data: { status, resolution, resolvedAt: new Date() },
  })

  notifyBestEffort(
    dispute.opener?.phone,
    `Votre litige concernant la commande ${dispute.orderId} a été résolu : ${resolution}`,
  )
  return updated
}

export async function closeDispute(id: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!dispute) throw new AppError('DISPUTE_NOT_FOUND', 404)
  if (!['UNDER_REVIEW', 'RESOLVED_BUYER', 'RESOLVED_SELLER'].includes(dispute.status)) {
    throw new AppError('DISPUTE_INVALID_STATUS', 409, {
      message: `Ce litige ne peut pas être clôturé (statut actuel : ${dispute.status})`,
    })
  }
  return prisma.dispute.update({ where: { id }, data: { status: 'CLOSED' } })
}

// ---------------------------------------------------------------------------
// Retours
// ---------------------------------------------------------------------------

export async function listReturns(rawQuery: unknown) {
  const parsed = supportReturnsQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    throw new AppError('SUPPORT_INVALID_QUERY', 400, {
      message: parsed.error.issues[0]?.message ?? 'Paramètres de recherche invalides',
    })
  }
  const query = parsed.data
  const page = query.page ?? 1
  const limit = query.limit ?? 20
  const skip = (page - 1) * limit

  const where: Prisma.ReturnOrderWhereInput = {}
  if (query.statut) where.status = query.statut
  if (query.search) {
    const or: Prisma.ReturnOrderWhereInput[] = [
      { description: { contains: query.search, mode: 'insensitive' } },
      { orderId: { contains: query.search, mode: 'insensitive' } },
    ]
    // reason est un enum : pas de « contains » possible, égalité exacte seulement.
    const asReason = RETURN_REASONS.find((r) => r === query.search?.toUpperCase())
    if (asReason) or.push({ reason: asReason })
    where.OR = or
  }

  const [returns, total] = await Promise.all([
    prisma.returnOrder.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip,
      take: limit,
      include: {
        order: { select: { id: true, status: true, totalAmount: true } },
        requestedBy: { select: { name: true, phone: true } },
      },
    }),
    prisma.returnOrder.count({ where }),
  ])
  return { returns, total, page, limit }
}

export async function getReturn(id: string) {
  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true, phone: true } },
      order: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          deliveryFee: true,
          laborCost: true,
          createdAt: true,
          initiator: { select: { name: true, phone: true } },
          items: {
            select: {
              id: true,
              name: true,
              vendorShopName: true,
              priceSnapshot: true,
              quantity: true,
              condition: true,
              imageThumbUrl: true,
            },
          },
          escrow: { select: { status: true, amount: true } },
        },
      },
    },
  })
  if (!returnOrder) throw new AppError('RETURN_NOT_FOUND', 404)
  return returnOrder
}

export async function transitionReturn(id: string, rawBody: unknown) {
  const parsed = supportTransitionReturnSchema.safeParse(rawBody)
  if (!parsed.success) throw validationError(parsed.error)
  const { statut, refundAmount, note } = parsed.data

  const returnOrder = await prisma.returnOrder.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { phone: true } },
      order: { select: { escrow: { select: { status: true } } } },
    },
  })
  if (!returnOrder) throw new AppError('RETURN_NOT_FOUND', 404)

  if (!TRANSITIONS[returnOrder.status].includes(statut)) {
    throw new AppError('RETURN_INVALID_TRANSITION', 409, {
      message: `Transition ${returnOrder.status} → ${statut} non autorisée`,
    })
  }
  // Même règle que le module returns : REFUNDED exige un montant (422).
  if (statut === 'REFUNDED' && refundAmount == null) {
    throw new AppError('REFUND_AMOUNT_REQUIRED', 422)
  }

  // Câblage NOUVEAU : refundEscrow (module payment) n'était appelé par aucun
  // module jusqu'ici. Au statut REFUNDED, si le séquestre de la commande est
  // encore HELD, on le rembourse AVANT d'enregistrer le statut : si
  // refundEscrow lève, l'erreur remonte telle quelle (l'admin doit savoir que
  // le remboursement escrow a échoué) et le retour n'a pas changé de statut —
  // l'action peut être retentée proprement.
  if (statut === 'REFUNDED' && returnOrder.order.escrow?.status === 'HELD') {
    await refundEscrow(returnOrder.orderId)
  }

  const tsField = TIMESTAMP_FIELD[statut]
  const updated = await prisma.returnOrder.update({
    where: { id },
    data: {
      status: statut,
      ...(tsField ? { [tsField]: new Date() } : {}),
      ...(note !== undefined && { resolutionNote: note }),
      ...(refundAmount !== undefined && { refundAmount }),
    },
  })

  if (statut === 'REFUNDED') {
    notifyBestEffort(
      returnOrder.requestedBy.phone,
      `Votre retour pour la commande ${returnOrder.orderId} a été remboursé (${(refundAmount ?? 0).toLocaleString('fr-FR')} FCFA).`,
    )
  } else if (statut === 'REJECTED') {
    notifyBestEffort(
      returnOrder.requestedBy.phone,
      `Votre retour pour la commande ${returnOrder.orderId} a été rejeté.${note ? ` Motif : ${note}` : ''}`,
    )
  }
  return updated
}
