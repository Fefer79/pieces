/**
 * Transporteurs et gabarits d'URL de suivi.
 *
 * C'est le remplaçant assumé d'une intégration API transporteur : l'ops saisit
 * un numéro, on construit le lien de suivi public. Le jour où une API alimente
 * `ShipmentEvent`, rien ici ne change.
 *
 * ⚠ Règle produit (lib/logistique-content.ts) : le partenaire transitaire n'est
 * JAMAIS nommé au client. `publicCarrierLabel()` est la seule fonction à
 * utiliser sur les surfaces publiques.
 */

export const SHIPMENT_CARRIERS = [
  'DHL',
  'FEDEX',
  'UPS',
  'TRANSITAIRE',
  'AIR_CARGO',
  'SEA_LCL',
  'POSTAL',
  'OTHER',
] as const

export type ShipmentCarrierKey = (typeof SHIPMENT_CARRIERS)[number]

export interface CarrierSpec {
  key: ShipmentCarrierKey
  /** Libellé interne (back-office). */
  label: string
  /** `{n}` est remplacé par le numéro de suivi. */
  trackingUrlTemplate?: string
  /** Nommable côté client : seuls les intégrateurs mondiaux le sont. */
  publicNamed: boolean
}

export const CARRIERS: Record<ShipmentCarrierKey, CarrierSpec> = {
  DHL: {
    key: 'DHL',
    label: 'DHL Express',
    trackingUrlTemplate: 'https://www.dhl.com/ci-fr/home/tracking/tracking-express.html?tracking-id={n}',
    publicNamed: true,
  },
  FEDEX: {
    key: 'FEDEX',
    label: 'FedEx',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={n}',
    publicNamed: true,
  },
  UPS: {
    key: 'UPS',
    label: 'UPS',
    trackingUrlTemplate: 'https://www.ups.com/track?loc=fr_FR&tracknum={n}',
    publicNamed: true,
  },
  TRANSITAIRE: {
    key: 'TRANSITAIRE',
    label: 'Transitaire partenaire',
    publicNamed: false,
  },
  AIR_CARGO: {
    key: 'AIR_CARGO',
    label: 'Fret aérien (LTA)',
    publicNamed: false,
  },
  SEA_LCL: {
    key: 'SEA_LCL',
    label: 'Maritime groupé (LCL)',
    publicNamed: false,
  },
  POSTAL: {
    key: 'POSTAL',
    label: 'Postal',
    publicNamed: false,
  },
  OTHER: {
    key: 'OTHER',
    label: 'Autre',
    publicNamed: false,
  },
}

/** Lien de suivi, ou `null` quand le transporteur n'en expose pas. */
export function buildTrackingUrl(
  carrier: ShipmentCarrierKey,
  trackingNumber: string | null | undefined,
): string | null {
  const template = CARRIERS[carrier]?.trackingUrlTemplate
  const number = trackingNumber?.trim()
  if (!template || !number) return null
  return template.replace('{n}', encodeURIComponent(number))
}

/**
 * Libellé affichable au client. Pour tout ce qui n'est pas un intégrateur
 * mondial, on parle de « notre partenaire logistique » — Pièces reste
 * l'opérateur de bout en bout.
 */
export function publicCarrierLabel(carrier: ShipmentCarrierKey): string {
  const spec = CARRIERS[carrier]
  return spec?.publicNamed ? spec.label : 'Notre partenaire logistique'
}

// ---------------------------------------------------------------------------
// Machine à états des expéditions (§4 de docs/logistique-as-a-service.md)
// ---------------------------------------------------------------------------

export const SHIPMENT_STATUSES = [
  'SOURCING',
  'COLLECTED',
  'IN_TRANSIT',
  'CUSTOMS',
  'LOCAL_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const

export type ShipmentStatusKey = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABEL: Record<ShipmentStatusKey, string> = {
  SOURCING: 'Recherche fournisseur',
  COLLECTED: 'Pièce collectée',
  IN_TRANSIT: 'En transit',
  CUSTOMS: 'Dédouanement',
  LOCAL_DELIVERY: 'Livraison Abidjan',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}

/**
 * Transitions autorisées. On peut sauter une étape en avant (un envoi DHL
 * dédouané en même temps qu'il arrive), jamais revenir en arrière — un client
 * qui voit son suivi reculer perd confiance. L'annulation reste possible tant
 * que la pièce n'est pas livrée.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatusKey, ShipmentStatusKey[]> = {
  SOURCING: ['COLLECTED', 'IN_TRANSIT', 'CANCELLED'],
  COLLECTED: ['IN_TRANSIT', 'CUSTOMS', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'LOCAL_DELIVERY', 'CANCELLED'],
  CUSTOMS: ['LOCAL_DELIVERY', 'DELIVERED', 'CANCELLED'],
  LOCAL_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransitionShipment(from: ShipmentStatusKey, to: ShipmentStatusKey): boolean {
  return SHIPMENT_TRANSITIONS[from]?.includes(to) ?? false
}
