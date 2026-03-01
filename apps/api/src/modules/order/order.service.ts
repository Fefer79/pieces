import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { canTransition } from './order.stateMachine.js'

const COD_MAX_AMOUNT = 75_000

function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

export async function createOrder(
  initiatorId: string,
  items: { catalogItemId: string }[],
  options: { ownerPhone?: string; laborCost?: number } = {},
) {
  // Fetch catalog items with vendor info and lock prices
  const catalogItems = await prisma.catalogItem.findMany({
    where: {
      id: { in: items.map((i) => i.catalogItemId) },
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
      vendor: { select: { id: true, shopName: true, status: true } },
    },
  })

  if (catalogItems.length === 0) {
    throw new AppError('ORDER_NO_VALID_ITEMS', 400, { message: 'Aucun article valide trouvé' })
  }

  const totalAmount = catalogItems.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const shareToken = generateShareToken()

  const order = await prisma.order.create({
    data: {
      initiatorId,
      ownerPhone: options.ownerPhone,
      shareToken,
      totalAmount,
      laborCost: options.laborCost,
      items: {
        create: catalogItems.map((item) => ({
          catalogItemId: item.id,
          vendorId: item.vendorId,
          vendorShopName: item.vendor.shopName,
          name: item.name ?? 'Pièce',
          category: item.category,
          priceSnapshot: item.price ?? 0,
          imageThumbUrl: item.imageThumbUrl,
        })),
      },
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
