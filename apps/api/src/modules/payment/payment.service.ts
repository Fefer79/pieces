import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

export async function createEscrow(orderId: string, amount: number) {
  return prisma.escrowTransaction.create({
    data: {
      orderId,
      amount,
      status: 'HELD',
    },
  })
}

/**
 * Confirme le paiement d'une commande à partir d'un montant déjà VÉRIFIÉ auprès
 * de CinetPay. Valide l'existence de la commande, que le montant payé couvre le
 * total, et reste idempotent (un 2e webhook pour la même commande ne duplique
 * pas le séquestre).
 */
export async function confirmOrderPayment(orderId: string, verifiedAmount: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, totalAmount: true },
  })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  // Idempotence : si un séquestre existe déjà, ne rien dupliquer.
  const existing = await prisma.escrowTransaction.findUnique({ where: { orderId } })
  if (existing) return existing

  if (verifiedAmount < order.totalAmount) {
    throw new AppError('PAYMENT_AMOUNT_MISMATCH', 400, {
      message: 'Montant payé insuffisant pour cette commande',
    })
  }

  return createEscrow(orderId, verifiedAmount)
}

export async function releaseEscrow(orderId: string) {
  const escrow = await prisma.escrowTransaction.findUnique({
    where: { orderId },
  })

  if (!escrow) {
    throw new AppError('ESCROW_NOT_FOUND', 404, { message: 'Séquestre introuvable' })
  }

  if (escrow.status !== 'HELD') {
    throw new AppError('ESCROW_ALREADY_PROCESSED', 400, { message: 'Séquestre déjà traité' })
  }

  return prisma.escrowTransaction.update({
    where: { orderId },
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
    },
  })
}

export async function refundEscrow(orderId: string) {
  const escrow = await prisma.escrowTransaction.findUnique({
    where: { orderId },
  })

  if (!escrow) {
    throw new AppError('ESCROW_NOT_FOUND', 404, { message: 'Séquestre introuvable' })
  }

  if (escrow.status !== 'HELD') {
    throw new AppError('ESCROW_ALREADY_PROCESSED', 400, { message: 'Séquestre déjà traité' })
  }

  return prisma.escrowTransaction.update({
    where: { orderId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  })
}

export async function getEscrowByOrderId(orderId: string) {
  return prisma.escrowTransaction.findUnique({
    where: { orderId },
  })
}
