import type { ChipVariant } from '@/components/ui/chip'
import type { AudienceType, CampaignStatus } from '@/lib/marketing-api'

// ---------------------------------------------------------------------------
// Libellés et variantes de chips — miroir des enums de l'API marketing
// ---------------------------------------------------------------------------

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  BROUILLON: 'Brouillon',
  PLANIFIEE: 'Planifiée',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

export const CAMPAIGN_STATUS_VARIANTS: Record<CampaignStatus, ChipVariant> = {
  BROUILLON: 'plain',
  PLANIFIEE: 'status-warn',
  EN_COURS: 'status-warn',
  TERMINEE: 'status-ok',
  ANNULEE: 'status-err',
}

export const AUDIENCE_TYPE_LABELS: Record<AudienceType, string> = {
  SEGMENT_CLIENT: 'Segment clients',
  SEGMENT_VENDEUR: 'Segment vendeurs',
  TAG: 'Tag CRM',
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
