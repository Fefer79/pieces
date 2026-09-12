type Status =
  | 'DRAFT'
  | 'PENDING_PAYMENT'
  | 'DEPOSIT_PAID'
  | 'IN_IMPORT'
  | 'AWAITING_BALANCE'
  | 'PAID'
  | 'VENDOR_CONFIRMED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  DRAFT: ['PENDING_PAYMENT', 'PAID', 'DEPOSIT_PAID', 'CANCELLED'], // PAID directly for COD
  PENDING_PAYMENT: ['PAID', 'DEPOSIT_PAID', 'CANCELLED'],
  // Précommande d'import : l'acompte lance l'achat chez le partenaire, la
  // marchandise voyage, puis le solde est appelé à l'arrivée. Une fois payée en
  // entier, la commande rejoint le flux commun à VENDOR_CONFIRMED — pour un
  // import, c'est l'ops qui confirme avoir la pièce en main à Abidjan.
  DEPOSIT_PAID: ['IN_IMPORT', 'CANCELLED'],
  IN_IMPORT: ['AWAITING_BALANCE', 'CANCELLED'],
  AWAITING_BALANCE: ['PAID', 'CANCELLED'],
  PAID: ['VENDOR_CONFIRMED', 'CANCELLED'],
  VENDOR_CONFIRMED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: ['CONFIRMED', 'COMPLETED'], // COMPLETED via 48h auto-release
  CONFIRMED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

/**
 * États réservés à la précommande d'import. Une commande STANDARD ne doit
 * jamais y entrer : ils supposent un acompte et un solde, que son échéancier
 * n'a pas.
 */
export const IMPORT_ONLY_STATUSES: Status[] = ['DEPOSIT_PAID', 'IN_IMPORT', 'AWAITING_BALANCE']

export function isImportOnlyStatus(status: string): boolean {
  return (IMPORT_ONLY_STATUSES as string[]).includes(status)
}

export function canTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidTransitions(from: Status): Status[] {
  return VALID_TRANSITIONS[from] ?? []
}
