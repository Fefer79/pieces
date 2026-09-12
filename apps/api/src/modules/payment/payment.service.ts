import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import type { EscrowKind } from '@prisma/client'
import { resolveEscrowKind } from './escrowKind.js'

/**
 * Une commande locale n'a qu'une écriture de séquestre (`FULL`). Une précommande
 * d'import en a deux : `DEPOSIT` à la commande (50 % des pièces + fret + douane)
 * puis `BALANCE` à l'arrivée. Le `kind` par défaut préserve tout l'existant :
 * aucun appelant du flux local n'a à le passer.
 */
const DEFAULT_KIND: EscrowKind = 'FULL'

function escrowWhere(orderId: string, kind: EscrowKind) {
  return { uq_escrow_order_kind: { orderId, kind } }
}

export async function createEscrow(orderId: string, amount: number, kind: EscrowKind = DEFAULT_KIND) {
  return prisma.escrowTransaction.create({
    data: {
      orderId,
      kind,
      amount,
      status: 'HELD',
    },
  })
}

/** Montant attendu pour une échéance donnée. */
function expectedAmount(
  order: { totalAmount: number; depositAmount: number; balanceAmount: number },
  kind: EscrowKind,
): number {
  if (kind === 'DEPOSIT') return order.depositAmount
  if (kind === 'BALANCE') return order.balanceAmount
  return order.totalAmount
}

/**
 * Confirme le paiement d'une commande à partir d'un montant déjà VÉRIFIÉ auprès
 * de CinetPay. Valide l'existence de la commande, que le montant payé couvre
 * l'échéance appelée, et reste idempotent (un 2e webhook pour la même échéance
 * ne duplique pas le séquestre).
 */
export async function confirmOrderPayment(orderId: string, verifiedAmount: number) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderType: true,
      status: true,
      totalAmount: true,
      depositAmount: true,
      balanceAmount: true,
    },
  })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  // L'échéance appelée se déduit de la commande elle-même, jamais du payload
  // du webhook : acompte tant que la précommande n'est pas arrivée, solde
  // ensuite, paiement unique pour tout le reste du catalogue.
  const kind = resolveEscrowKind(order)

  // Idempotence : si cette échéance a déjà son séquestre, ne rien dupliquer.
  const existing = await prisma.escrowTransaction.findUnique({ where: escrowWhere(orderId, kind) })
  if (existing) return existing

  if (verifiedAmount < expectedAmount(order, kind)) {
    throw new AppError('PAYMENT_AMOUNT_MISMATCH', 400, {
      message: 'Montant payé insuffisant pour cette commande',
    })
  }

  return createEscrow(orderId, verifiedAmount, kind)
}

async function heldEscrow(orderId: string, kind: EscrowKind) {
  const escrow = await prisma.escrowTransaction.findUnique({ where: escrowWhere(orderId, kind) })

  if (!escrow) {
    throw new AppError('ESCROW_NOT_FOUND', 404, { message: 'Séquestre introuvable' })
  }

  if (escrow.status !== 'HELD') {
    throw new AppError('ESCROW_ALREADY_PROCESSED', 400, { message: 'Séquestre déjà traité' })
  }

  return escrow
}

export async function releaseEscrow(orderId: string, kind: EscrowKind = DEFAULT_KIND) {
  await heldEscrow(orderId, kind)

  return prisma.escrowTransaction.update({
    where: escrowWhere(orderId, kind),
    data: {
      status: 'RELEASED',
      releasedAt: new Date(),
    },
  })
}

export async function refundEscrow(orderId: string, kind: EscrowKind = DEFAULT_KIND) {
  await heldEscrow(orderId, kind)

  return prisma.escrowTransaction.update({
    where: escrowWhere(orderId, kind),
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  })
}

export async function getEscrowByOrderId(orderId: string, kind: EscrowKind = DEFAULT_KIND) {
  return prisma.escrowTransaction.findUnique({ where: escrowWhere(orderId, kind) })
}

/**
 * Toutes les écritures d'une commande, dans l'ordre où elles ont été appelées.
 * Une précommande d'import en a deux ; le reste du catalogue, une seule.
 */
export async function getEscrowsByOrderId(orderId: string) {
  return prisma.escrowTransaction.findMany({
    where: { orderId },
    orderBy: { heldAt: 'asc' },
  })
}

/**
 * Rembourse INTÉGRALEMENT ce qui est encore sous séquestre sur une commande.
 *
 * Sert à l'annulation d'une précommande dont le partenaire ne peut finalement
 * pas fournir la pièce : c'est la promesse affichée sur la fiche produit, et
 * elle porte sur tout ce qui a été encaissé, pas seulement sur l'acompte.
 */
export async function refundAllHeldEscrows(orderId: string) {
  const held = await prisma.escrowTransaction.findMany({
    where: { orderId, status: 'HELD' },
    select: { kind: true },
  })
  const refunded = []
  for (const { kind } of held) {
    refunded.push(await refundEscrow(orderId, kind))
  }
  return refunded
}
