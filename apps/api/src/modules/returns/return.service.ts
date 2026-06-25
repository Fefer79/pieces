import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import type { ReturnReason, ReturnStatus } from '@prisma/client'

export interface CreateReturnInput {
  orderId: string
  orderItemId?: string | null
  reason: ReturnReason
  description?: string | null
  pickupAddress?: string | null
  pickupContactName?: string | null
  pickupContactPhone?: string | null
  evidence?: string[]
}

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

export function canTransition(from: ReturnStatus, to: ReturnStatus): boolean {
  return TRANSITIONS[from].includes(to)
}

// Identité du demandeur pour les contrôles d'accès retours.
export type ReturnRequester = { id: string; roles: string[] }

async function isEnterpriseMember(enterpriseId: string, userId: string): Promise<boolean> {
  const member = await prisma.enterpriseMember.findUnique({
    where: { uq_enterprise_member: { enterpriseId, userId } },
    select: { id: true },
  })
  return member !== null
}

// Le user possède-t-il un des vendeurs présents sur la commande ?
async function userOwnsVendorOnOrder(userId: string, orderId: string): Promise<boolean> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { vendorId: true },
    distinct: ['vendorId'],
  })
  const vendorIds = items.map((i) => i.vendorId)
  if (vendorIds.length === 0) return false
  const vendor = await prisma.vendor.findFirst({
    where: { userId, id: { in: vendorIds } },
    select: { id: true },
  })
  return vendor !== null
}

export async function createReturn(userId: string, data: CreateReturnInput) {
  // Verify the order exists; capture enterpriseId for indexing.
  const order = await prisma.order.findUnique({
    where: { id: data.orderId },
    select: { id: true, enterpriseId: true, initiatorId: true, status: true },
  })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
  // Seul l'initiateur, ou un membre de l'entreprise rattachée, peut demander un
  // retour. (Bug corrigé : l'ancienne condition laissait passer n'importe qui
  // dès que la commande avait un enterpriseId.)
  if (order.initiatorId !== userId) {
    const allowed = order.enterpriseId
      ? await isEnterpriseMember(order.enterpriseId, userId)
      : false
    if (!allowed) {
      throw new AppError('NOT_AUTHORIZED', 403, {
        message: 'Vous ne pouvez pas demander de retour sur cette commande',
      })
    }
  }
  // Optional orderItem must belong to this order.
  if (data.orderItemId) {
    const item = await prisma.orderItem.findUnique({
      where: { id: data.orderItemId },
      select: { orderId: true },
    })
    if (!item || item.orderId !== data.orderId) {
      throw new AppError('ORDER_ITEM_NOT_IN_ORDER', 422)
    }
  }

  return prisma.returnOrder.create({
    data: {
      orderId: data.orderId,
      orderItemId: data.orderItemId ?? null,
      enterpriseId: order.enterpriseId,
      requestedById: userId,
      reason: data.reason,
      description: data.description ?? null,
      pickupAddress: data.pickupAddress ?? null,
      pickupContactName: data.pickupContactName ?? null,
      pickupContactPhone: data.pickupContactPhone ?? null,
      evidence: data.evidence ?? [],
    },
  })
}

export async function listReturnsForEnterprise(enterpriseId: string, requester: ReturnRequester) {
  // Empêche l'énumération cross-tenant : il faut être membre de l'entreprise
  // (ou admin) pour lister ses retours.
  if (!requester.roles.includes('ADMIN') && !(await isEnterpriseMember(enterpriseId, requester.id))) {
    throw new AppError('NOT_AUTHORIZED', 403, {
      message: 'Accès réservé aux membres de cette entreprise',
    })
  }
  return prisma.returnOrder.findMany({
    where: { enterpriseId },
    orderBy: { requestedAt: 'desc' },
    take: 100,
  })
}

export async function listReturnsForUser(userId: string) {
  return prisma.returnOrder.findMany({
    where: { requestedById: userId },
    orderBy: { requestedAt: 'desc' },
    take: 100,
  })
}

export async function getReturn(returnId: string, requester: ReturnRequester) {
  const r = await prisma.returnOrder.findUnique({
    where: { id: returnId },
    include: {
      order: { select: { id: true, totalAmount: true, status: true, enterpriseId: true } },
    },
  })
  if (!r) throw new AppError('RETURN_NOT_FOUND', 404)

  // Lecture autorisée : demandeur, admin, membre de l'entreprise, ou vendeur
  // d'un article de la commande. Sinon 403 (anti-IDOR).
  const isAdmin = requester.roles.includes('ADMIN')
  const isOwner = r.requestedById === requester.id
  let allowed = isAdmin || isOwner
  if (!allowed && r.order.enterpriseId) {
    allowed = await isEnterpriseMember(r.order.enterpriseId, requester.id)
  }
  if (!allowed) {
    allowed = await userOwnsVendorOnOrder(requester.id, r.orderId)
  }
  if (!allowed) {
    throw new AppError('NOT_AUTHORIZED', 403, { message: 'Accès refusé à ce retour' })
  }

  return r
}

export async function transitionReturn(
  returnId: string,
  toStatus: ReturnStatus,
  requester: ReturnRequester,
  options: { resolutionNote?: string | null; refundAmount?: number | null } = {},
) {
  const r = await prisma.returnOrder.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, orderId: true },
  })
  if (!r) throw new AppError('RETURN_NOT_FOUND', 404)

  // Seul un admin ou un vendeur d'un article de la commande peut faire avancer
  // le retour (accepter / inspecter / rembourser). Empêche tout vendeur tiers
  // d'agir sur le retour d'une commande qui n'est pas la sienne.
  const isAdmin = requester.roles.includes('ADMIN')
  if (!isAdmin && !(await userOwnsVendorOnOrder(requester.id, r.orderId))) {
    throw new AppError('NOT_AUTHORIZED', 403, {
      message: 'Seul le vendeur de la commande peut traiter ce retour',
    })
  }

  if (!canTransition(r.status, toStatus)) {
    throw new AppError('INVALID_RETURN_TRANSITION', 409, {
      message: `Transition ${r.status} → ${toStatus} non autorisée`,
    })
  }
  if (toStatus === 'REFUNDED' && options.refundAmount == null) {
    throw new AppError('REFUND_AMOUNT_REQUIRED', 422)
  }
  const tsField = TIMESTAMP_FIELD[toStatus]
  return prisma.returnOrder.update({
    where: { id: returnId },
    data: {
      status: toStatus,
      ...(tsField ? { [tsField]: new Date() } : {}),
      ...(options.resolutionNote !== undefined && { resolutionNote: options.resolutionNote }),
      ...(options.refundAmount !== undefined && { refundAmount: options.refundAmount }),
    },
  })
}

export async function cancelReturn(userId: string, returnId: string) {
  const r = await prisma.returnOrder.findUnique({
    where: { id: returnId },
    select: { id: true, status: true, requestedById: true },
  })
  if (!r) throw new AppError('RETURN_NOT_FOUND', 404)
  if (r.requestedById !== userId) {
    throw new AppError('NOT_AUTHORIZED', 403)
  }
  if (!canTransition(r.status, 'CANCELLED')) {
    throw new AppError('INVALID_RETURN_TRANSITION', 409, {
      message: `Impossible d'annuler une demande en statut ${r.status}`,
    })
  }
  return prisma.returnOrder.update({
    where: { id: returnId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  })
}
