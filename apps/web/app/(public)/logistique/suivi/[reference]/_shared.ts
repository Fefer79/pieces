// Partagé entre la page de suivi public et les pages flotte pour ne pas
// dupliquer la définition des libellés et variantes de chips.

import type { ChipVariant } from '@/components/ui/chip'
import type { PublicShipment } from '@/components/logistique/shipment-timeline'

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTING: 'En cours de cotation',
  QUOTED: 'Devis envoyé',
  WON: 'Accepté',
  LOST: 'Refusé',
  SPAM: 'Spam',
}

export const STATUS_CHIP: Record<string, ChipVariant> = {
  NEW: 'oem',
  CONTACTED: 'oem',
  QUOTING: 'status-warn',
  QUOTED: 'status-ok',
  WON: 'status-ok',
  LOST: 'plain',
  SPAM: 'plain',
}

export const CERTAINTY_CHIP: Record<string, ChipVariant> = {
  LOW: 'status-warn',
  MEDIUM: 'oem',
  HIGH: 'status-ok',
}

export interface FleetQuoteRow {
  id: string
  reference: string
  status: keyof typeof STATUS_LABELS
  partName: string
  partCategory: string | null
  oemReference: string | null
  quantity: number
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vin: string | null
  certaintyScore: number
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  downtimeCostPerDay: number | null
  estimateJson: unknown
  createdAt: string
  contactName: string
  phone: string
  partPriceHint: number | null
  vehicleImmobilized: boolean
  photos: {
    id: string
    kind: 'PART' | 'REGISTRATION_CARD' | 'OTHER'
    position: number
    url: string
    thumbUrl: string | null
  }[]
  events: {
    id: string
    fromStatus: string | null
    toStatus: string | null
    note: string | null
    createdAt: string
  }[]
  /** L'expédition rattachée, une fois la commande passée. `null` avant. */
  shipment?: PublicShipment | null
}
