export const statusLabels: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente de paiement',
  PAID: 'Payée',
  VENDOR_CONFIRMED: 'Confirmée vendeur',
  DISPATCHED: 'Expédiée',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livrée',
  CONFIRMED: 'Confirmée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

export const statusColors: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800' },
  PAID: { bg: 'bg-blue-100', text: 'text-blue-800' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  CONFIRMED: { bg: 'bg-teal-100', text: 'text-teal-800' },
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600' },
  PENDING_PAYMENT: { bg: 'bg-amber-100', text: 'text-amber-800' },
  VENDOR_CONFIRMED: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  DISPATCHED: { bg: 'bg-purple-100', text: 'text-purple-800' },
  IN_TRANSIT: { bg: 'bg-orange-100', text: 'text-orange-800' },
}

export function getStatusColor(status: string) {
  return statusColors[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
}
