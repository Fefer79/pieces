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
