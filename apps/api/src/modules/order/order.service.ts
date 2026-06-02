import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { canTransition } from './order.stateMachine.js'
import { recomputeVendorScore } from '../vendor/vendorScore.service.js'
import { getOrCreateInvoiceForOrder } from '../enterprise/invoice.service.js'

const DELIVERED_STATUSES = new Set(['DELIVERED', 'CONFIRMED', 'COMPLETED'])

// Fire-and-forget rescore for every vendor referenced by an order's items.
// Errors are swallowed: a scoring miss should never break the parent flow.
function rescoreOrderVendors(orderId: string) {
  void (async () => {
    try {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        select: { vendorId: true },
        distinct: ['vendorId'],
      })
      await Promise.all(items.map((i) => recomputeVendorScore(i.vendorId)))
    } catch {
      // Swallow — scoring is best-effort.
    }
  })()
}

const COD_MAX_AMOUNT = 75_000

function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

// Somme des quantités par pièce (un même catalogItemId peut apparaître plusieurs fois).
function qtyMapFromItems(items: { catalogItemId: string; quantity?: number }[]): Map<string, number> {
  const qtyById = new Map<string, number>()
  for (const i of items) {
    const qty = i.quantity && i.quantity > 0 ? i.quantity : 1
    qtyById.set(i.catalogItemId, (qtyById.get(i.catalogItemId) ?? 0) + qty)
  }
  return qtyById
}

// Verrouille les prix depuis le catalogue (pièces publiées + en stock) et
// construit le payload OrderItem + le total. Partagé entre createOrder et upsertDraft.
async function buildOrderItems(qtyById: Map<string, number>) {
  const catalogItems = await prisma.catalogItem.findMany({
    where: {
      id: { in: [...qtyById.keys()] },
      status: 'PUBLISHED',
      inStock: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      price: true,
      imageThumbUrl: true,
      vendorId: true,
      commissionAmount: true,
      vendor: { select: { id: true, shopName: true, status: true } },
    },
  })

  if (catalogItems.length === 0) {
    throw new AppError('ORDER_NO_VALID_ITEMS', 400, { message: 'Aucun article valide trouvé' })
  }

  const totalAmount = catalogItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * (qtyById.get(item.id) ?? 1),
    0,
  )

  const create = catalogItems.map((item) => ({
    catalogItemId: item.id,
    vendorId: item.vendorId,
    vendorShopName: item.vendor.shopName,
    name: item.name ?? 'Pièce',
    category: item.category,
    priceSnapshot: item.price ?? 0,
    quantity: qtyById.get(item.id) ?? 1,
    commissionAmount: item.commissionAmount,
    imageThumbUrl: item.imageThumbUrl,
  }))

  return { create, totalAmount }
}

export async function createOrder(
  initiatorId: string,
  items: { catalogItemId: string; quantity?: number }[],
  options: { ownerPhone?: string; laborCost?: number; vehicleId?: string } = {},
) {
  const qtyById = qtyMapFromItems(items)

  // Validate vehicle access if a vehicleId is provided
  let vehicleId: string | undefined
  let enterpriseId: string | undefined
  if (options.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: options.vehicleId },
      select: { id: true, userId: true, enterpriseId: true },
    })
    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 404, { message: 'Véhicule introuvable' })
    }

    const ownsDirectly = vehicle.userId === initiatorId
    let memberOfEnterprise = false
    if (vehicle.enterpriseId) {
      const membership = await prisma.enterpriseMember.findUnique({
        where: { uq_enterprise_member: { enterpriseId: vehicle.enterpriseId, userId: initiatorId } },
        select: { id: true },
      })
      memberOfEnterprise = membership !== null
    }
    if (!ownsDirectly && !memberOfEnterprise) {
      throw new AppError('VEHICLE_FORBIDDEN', 403, {
        message: 'Vous n\'avez pas accès à ce véhicule',
      })
    }

    vehicleId = vehicle.id
    enterpriseId = vehicle.enterpriseId ?? undefined
  }

  const { create, totalAmount } = await buildOrderItems(qtyById)
  const shareToken = generateShareToken()

  const order = await prisma.order.create({
    data: {
      initiatorId,
      ownerPhone: options.ownerPhone,
      shareToken,
      totalAmount,
      laborCost: options.laborCost,
      vehicleId,
      enterpriseId,
      items: { create },
      events: {
        create: {
          toStatus: 'DRAFT',
          actor: initiatorId,
          note: 'Commande créée',
        },
      },
    },
    include: {
      items: true,
    },
  })

  return order
}

// Note d'événement qui distingue un brouillon-panier d'une commande envoyée au
// propriétaire (note 'Commande créée'). Les deux sont en statut DRAFT — seul ce
// marqueur permet à getOpenDraft de ne réhydrater que le panier, pas une commande.
const CART_DRAFT_NOTE = 'Brouillon panier'

function cartDraftWhere(userId: string) {
  return {
    initiatorId: userId,
    status: 'DRAFT' as const,
    events: { some: { note: CART_DRAFT_NOTE } },
  }
}

/**
 * Récupère le brouillon (panier serveur) ouvert de l'utilisateur — le plus
 * récent. Ne renvoie que les paniers (marqueur CART_DRAFT_NOTE), jamais une
 * commande déjà envoyée au propriétaire. Sert à réhydrater le panier.
 */
export async function getOpenDraft(userId: string) {
  return prisma.order.findFirst({
    where: cartDraftWhere(userId),
    orderBy: { updatedAt: 'desc' },
    include: { items: true },
  })
}

/**
 * Upsert idempotent du brouillon ouvert de l'utilisateur : remplace les items
 * et quantités à partir du payload panier. Reste en statut DRAFT. Sans items,
 * supprime le brouillon ouvert (panier vidé).
 */
export async function upsertDraft(
  userId: string,
  items: { catalogItemId: string; quantity?: number }[],
) {
  const existing = await prisma.order.findFirst({
    where: cartDraftWhere(userId),
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (items.length === 0) {
    if (existing) {
      // OrderItem et OrderEvent n'ont pas onDelete:Cascade → supprimer les
      // enfants avant l'Order, sinon violation de clé étrangère.
      await prisma.orderItem.deleteMany({ where: { orderId: existing.id } })
      await prisma.orderEvent.deleteMany({ where: { orderId: existing.id } })
      await prisma.order.delete({ where: { id: existing.id } })
    }
    return null
  }

  const qtyById = qtyMapFromItems(items)
  const { create, totalAmount } = await buildOrderItems(qtyById)

  if (existing) {
    await prisma.orderItem.deleteMany({ where: { orderId: existing.id } })
    return prisma.order.update({
      where: { id: existing.id },
      data: { totalAmount, items: { create } },
      include: { items: true },
    })
  }

  return prisma.order.create({
    data: {
      initiatorId: userId,
      shareToken: generateShareToken(),
      totalAmount,
      items: { create },
      events: { create: { toStatus: 'DRAFT', actor: userId, note: 'Brouillon panier' } },
    },
    include: { items: true },
  })
}

export async function getOrderByShareToken(shareToken: string) {
  const order = await prisma.order.findUnique({
    where: { shareToken },
    include: {
      items: true,
      initiator: { select: { id: true, phone: true } },
    },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  return order
}

export async function getOrderById(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      events: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  return order
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { initiatorId: userId },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  })
}

export async function transitionOrder(
  orderId: string,
  toStatus: string,
  actor: string,
  note?: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  const fromStatus = order.status
  if (!canTransition(fromStatus, toStatus as typeof fromStatus)) {
    throw new AppError('ORDER_INVALID_TRANSITION', 409, {
      message: `Transition invalide : ${fromStatus} → ${toStatus}`,
    })
  }

  const updateData: Record<string, unknown> = { status: toStatus }

  if (toStatus === 'PAID') updateData.paidAt = new Date()
  if (toStatus === 'VENDOR_CONFIRMED') updateData.vendorConfirmedAt = new Date()
  if (toStatus === 'CANCELLED') updateData.cancelledAt = new Date()

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...updateData,
      events: {
        create: {
          fromStatus,
          toStatus: toStatus as typeof fromStatus,
          actor,
          note,
        },
      },
    },
    include: { items: true },
  })

  if (DELIVERED_STATUSES.has(toStatus)) {
    rescoreOrderVendors(orderId)
  }

  if (toStatus === 'PAID') {
    // Fire-and-forget invoice issuance. Idempotent — getOrCreate returns
    // existing invoice if already issued.
    void getOrCreateInvoiceForOrder(orderId).catch((err) => {
      // log only; never let invoice failure rollback the order transition
      // eslint-disable-next-line no-console
      console.error('[invoice] failed to issue', orderId, err)
    })
  }

  return updated
}

export async function selectPaymentMethod(
  orderId: string,
  paymentMethod: string,
  actor: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  if (order.status !== 'DRAFT') {
    throw new AppError('ORDER_INVALID_STATUS', 400, { message: 'La commande n\'est plus en brouillon' })
  }

  if (paymentMethod === 'COD' && order.totalAmount > COD_MAX_AMOUNT) {
    throw new AppError('ORDER_COD_LIMIT', 400, {
      message: `Le paiement à la livraison est limité à ${COD_MAX_AMOUNT.toLocaleString()} FCFA`,
    })
  }

  const toStatus = paymentMethod === 'COD' ? 'PAID' : 'PENDING_PAYMENT'

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: paymentMethod as 'ORANGE_MONEY' | 'MTN_MOMO' | 'WAVE' | 'COD',
      status: toStatus,
      paidAt: paymentMethod === 'COD' ? new Date() : undefined,
      events: {
        create: {
          fromStatus: order.status,
          toStatus,
          actor,
          note: `Paiement sélectionné : ${paymentMethod}`,
        },
      },
    },
    include: { items: true },
  })

  return updated
}

export async function cancelOrder(orderId: string, actor: string, reason?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  const cancellableStatuses = ['DRAFT', 'PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED']
  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError('ORDER_CANNOT_CANCEL', 400, {
      message: 'La commande ne peut plus être annulée (livraison en cours)',
    })
  }

  return transitionOrder(orderId, 'CANCELLED', actor, reason ?? 'Annulation demandée')
}
