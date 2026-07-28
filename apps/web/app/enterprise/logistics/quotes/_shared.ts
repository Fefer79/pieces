// Types et libellés partagés par les pages /enterprise/logistics/*.
//
// Le contenu du estimateJson (sérialisé en `Json?` côté Prisma) dépend du mode
// d'acheminement — c'est la sortie de computeArbitrageMatrix() de
// packages/shared/constants/logistics.ts. On ne le re-type pas ici pour ne pas
// dupliquer la source de vérité : la matrice est calculée par le serveur et
// on en extrait juste les colonnes utiles à l'affichage.

import type { ChipVariant } from '@/components/ui/chip'

export const LOGISTIQUE_SLUGS_VALUES = [
  '/',
  '/devis',
  '/devis/merci',
  '/calculateur',
  '/comment-ca-marche',
  '/faq',
] as const

export const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUOTING: 'En cours de cotation',
  QUOTED: 'Devis envoyé',
  WON: 'Gagné',
  LOST: 'Perdu',
  SPAM: 'Spam',
}

// Vue simplifiée du suivi pour l'écran détail — le statut de la cotation
// progresse dans cet ordre. On rend les étapes non encore franchies en gris.
export const TRANSPORT_STAGES_PUBLIC: Array<{ key: string; label: string; body: string }> = [
  { key: 'NEW', label: 'Demande créée', body: 'Votre demande est enregistrée.' },
  { key: 'CONTACTED', label: 'Prise en charge', body: 'Notre équipe vous a contacté pour confirmer les détails.' },
  { key: 'QUOTING', label: 'Cotation en cours', body: 'Vérification du poids réel et des tarifs fournisseur.' },
  { key: 'QUOTED', label: 'Devis envoyé', body: 'Vous avez reçu les options fermes par WhatsApp.' },
  { key: 'WON', label: 'Acheminement', body: 'Acheminement et suivi de bout en bout.' },
]

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
  energyType: 'ICE' | 'EV' | 'HYBRID' | null
  certaintyScore: number
  certaintyLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  downtimeCostPerDay: number | null
  estimateJson: unknown
  createdAt: string
  enterpriseId: string | null
  vehicleId: string | null
  partRequestId: string | null
  contactName: string
  phone: string
  whatsapp: string | null
  email: string | null
  commune: string | null
  companyName: string | null
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
}
