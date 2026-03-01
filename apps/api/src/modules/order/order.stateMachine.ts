type Status = 'DRAFT' | 'PENDING_PAYMENT' | 'PAID' | 'VENDOR_CONFIRMED' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'

const VALID_TRANSITIONS: Record<Status, Status[]> = {
  DRAFT: ['PENDING_PAYMENT', 'PAID', 'CANCELLED'], // PAID directly for COD
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['VENDOR_CONFIRMED', 'CANCELLED'],
  VENDOR_CONFIRMED: ['DISPATCHED', 'CANCELLED'],
  DISPATCHED: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: ['CONFIRMED', 'COMPLETED'], // COMPLETED via 48h auto-release
  CONFIRMED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
}

export function canTransition(from: Status, to: Status): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function getValidTransitions(from: Status): Status[] {
  return VALID_TRANSITIONS[from] ?? []
}
