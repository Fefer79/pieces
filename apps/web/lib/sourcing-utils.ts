import type { ChipVariant } from '@/components/ui/chip'
import type {
  ShipmentStatus,
  SourcingOfferStatus,
  SourcingSearchStatus,
} from '@/lib/sourcing-api'

// Correspondances statut → variante de chip, partagées entre les pages
// Sourcing / Expéditions et les encarts montés ailleurs.
//
// ⚠ Ces tables vivent ici et non dans les `page.tsx` : Next.js n'autorise que
// des exports précis depuis un fichier de page (le build échoue sinon).

export const SEARCH_STATUS_CHIP: Record<SourcingSearchStatus, ChipVariant> = {
  PENDING: 'plain',
  RUNNING: 'status-warn',
  DONE: 'status-ok',
  FAILED: 'status-err',
}

export const OFFER_STATUS_CHIP: Record<SourcingOfferStatus, ChipVariant> = {
  CANDIDATE: 'plain',
  SHORTLISTED: 'status-ok',
  CONTACTED: 'oem',
  REJECTED: 'status-err',
  ORDERED: 'status-ok',
}

export const SHIPMENT_STATUS_CHIP: Record<ShipmentStatus, ChipVariant> = {
  SOURCING: 'plain',
  COLLECTED: 'oem',
  IN_TRANSIT: 'status-warn',
  CUSTOMS: 'status-warn',
  LOCAL_DELIVERY: 'oem',
  DELIVERED: 'status-ok',
  CANCELLED: 'status-err',
}

/**
 * Transitions autorisées — miroir de SHIPMENT_TRANSITIONS
 * (packages/shared/constants/carriers.ts). Le serveur reste l'autorité : ici on
 * évite seulement de proposer un bouton qui serait refusé.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  SOURCING: ['COLLECTED', 'IN_TRANSIT', 'CANCELLED'],
  COLLECTED: ['IN_TRANSIT', 'SOURCING', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'LOCAL_DELIVERY', 'COLLECTED', 'CANCELLED'],
  CUSTOMS: ['LOCAL_DELIVERY', 'IN_TRANSIT', 'CANCELLED'],
  LOCAL_DELIVERY: ['DELIVERED', 'CUSTOMS', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

/** Délai lisible : « 6 h » sous la journée, « 5 j » au-delà. */
export const formatDelay = (days: number) =>
  days < 1 ? `${Math.round(days * 24)} h` : `${days} j`
