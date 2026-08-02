import type { ChipVariant } from '@/components/ui/chip'
import type { DisputeStatus, ReturnReason, ReturnStatus } from '@/lib/support-api'

// ---------------------------------------------------------------------------
// Libellés et variantes de chips — miroir des enums de l'API support
// ---------------------------------------------------------------------------

export const DISPUTE_STATUS_LABELS: Record<DisputeStatus, string> = {
  OPEN: 'Ouvert',
  UNDER_REVIEW: "En cours d'examen",
  RESOLVED_BUYER: 'Résolu (client)',
  RESOLVED_SELLER: 'Résolu (vendeur)',
  CLOSED: 'Clôturé',
}

export const DISPUTE_STATUS_VARIANTS: Record<DisputeStatus, ChipVariant> = {
  OPEN: 'status-err',
  UNDER_REVIEW: 'status-warn',
  RESOLVED_BUYER: 'status-ok',
  RESOLVED_SELLER: 'status-ok',
  CLOSED: 'plain',
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  REQUESTED: 'Demandé',
  ACCEPTED: 'Accepté',
  PICKED_UP: 'Récupéré',
  INSPECTED: 'Inspecté',
  REFUNDED: 'Remboursé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
}

export const RETURN_STATUS_VARIANTS: Record<ReturnStatus, ChipVariant> = {
  REQUESTED: 'status-err',
  ACCEPTED: 'status-warn',
  PICKED_UP: 'status-warn',
  INSPECTED: 'status-warn',
  REFUNDED: 'status-ok',
  REJECTED: 'plain',
  CANCELLED: 'plain',
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  DEFECTIVE: 'Défectueux',
  WRONG_PART: 'Mauvaise pièce',
  NOT_AS_DESCRIBED: 'Non conforme',
  NO_LONGER_NEEDED: 'Plus besoin',
  OTHER: 'Autre',
}

// Miroir exact de la machine à états des retours (TRANSITIONS de
// apps/api/src/modules/returns/return.service.ts, dupliquée dans
// support.service.ts) : sert à limiter le select « Faire avancer ».
export const NEXT_RETURN_STATUSES: Record<ReturnStatus, ReturnStatus[]> = {
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['INSPECTED'],
  INSPECTED: ['REFUNDED', 'REJECTED'],
  REFUNDED: [],
  REJECTED: [],
  CANCELLED: [],
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** Date ISO → date courte fr-FR (« 02/08/2026 »), tiret si absente. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR')
}

/** Date ISO → date et heure fr-FR, tiret si absente. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR')
}
