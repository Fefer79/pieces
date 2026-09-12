import type { EscrowKind } from '@prisma/client'

/**
 * Quelle échéance un paiement entrant solde-t-il ?
 *
 * La référence CinetPay ne porte que l'identifiant de commande : c'est l'ÉTAT de
 * la commande au moment du retour qui tranche. Une commande locale n'a qu'une
 * échéance (`FULL`). Une précommande d'import appelle son acompte tant qu'elle
 * n'est pas arrivée, puis son solde une fois dédouanée à Abidjan.
 */
export function resolveEscrowKind(order: {
  orderType?: string | null
  status?: string | null
}): EscrowKind {
  if (order.orderType !== 'IMPORT_PREORDER') return 'FULL'
  return order.status === 'AWAITING_BALANCE' ? 'BALANCE' : 'DEPOSIT'
}
