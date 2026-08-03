// Transporteurs et suivi d'expédition.
//
// Choix assumé (docs/sourcing-expeditions-plan-2026-08.md) : aucune intégration
// API transporteur. L'ops saisit le numéro de suivi, on construit l'URL de la
// page publique du transporteur. Une API pourra plus tard alimenter
// ShipmentEvent sans rien changer à ce modèle.
//
// ⚠ Règle produit (apps/web/lib/logistique-content.ts) : le partenaire
// transitaire n'est JAMAIS nommé côté client. `publicLabel` est ce qu'on montre
// au client, `label` ce que voit l'ops.

export type ShipmentCarrierKey =
  | 'DHL'
  | 'FEDEX'
  | 'UPS'
  | 'TRANSITAIRE'
  | 'AIR_CARGO'
  | 'SEA_LCL'
  | 'POSTAL'
  | 'OTHER'

export interface CarrierSpec {
  key: ShipmentCarrierKey
  /** Libellé back-office. */
  label: string
  /** Libellé client — anonymisé pour tout ce qui n'est pas un intégrateur mondial. */
  publicLabel: string
  /** `{n}` est remplacé par le numéro de suivi. `null` = pas de page publique. */
  trackingUrlTemplate: string | null
  /** Vrai si le client peut voir le nom et suivre lui-même chez le transporteur. */
  publiclyNamed: boolean
}

export const SHIPMENT_CARRIERS: Record<ShipmentCarrierKey, CarrierSpec> = {
  DHL: {
    key: 'DHL',
    label: 'DHL Express',
    publicLabel: 'DHL Express',
    trackingUrlTemplate: 'https://www.dhl.com/ci-fr/home/tracking/tracking-express.html?tracking-id={n}',
    publiclyNamed: true,
  },
  FEDEX: {
    key: 'FEDEX',
    label: 'FedEx',
    publicLabel: 'FedEx',
    trackingUrlTemplate: 'https://www.fedex.com/fedextrack/?trknbr={n}',
    publiclyNamed: true,
  },
  UPS: {
    key: 'UPS',
    label: 'UPS',
    publicLabel: 'UPS',
    trackingUrlTemplate: 'https://www.ups.com/track?loc=fr_CI&tracknum={n}',
    publiclyNamed: true,
  },
  TRANSITAIRE: {
    key: 'TRANSITAIRE',
    label: 'Transitaire partenaire',
    publicLabel: 'Notre partenaire logistique',
    trackingUrlTemplate: null,
    publiclyNamed: false,
  },
  AIR_CARGO: {
    key: 'AIR_CARGO',
    label: 'Fret aérien (LTA)',
    publicLabel: 'Fret aérien',
    trackingUrlTemplate: null,
    publiclyNamed: false,
  },
  SEA_LCL: {
    key: 'SEA_LCL',
    label: 'Maritime groupage (LCL)',
    publicLabel: 'Fret maritime',
    trackingUrlTemplate: null,
    publiclyNamed: false,
  },
  POSTAL: {
    key: 'POSTAL',
    label: 'Poste / colis suivi',
    publicLabel: 'Colis suivi',
    trackingUrlTemplate: 'https://parcelsapp.com/en/tracking/{n}',
    publiclyNamed: true,
  },
  OTHER: {
    key: 'OTHER',
    label: 'Autre',
    publicLabel: 'Notre partenaire logistique',
    trackingUrlTemplate: null,
    publiclyNamed: false,
  },
}

export const SHIPMENT_CARRIER_KEYS = Object.keys(SHIPMENT_CARRIERS) as ShipmentCarrierKey[]

/**
 * URL de suivi chez le transporteur. `null` si le transporteur n'expose pas de
 * page publique ou si aucun numéro n'est saisi — le suivi repose alors sur les
 * ShipmentEvent saisis par l'ops.
 */
export function buildTrackingUrl(
  carrier: ShipmentCarrierKey,
  trackingNumber: string | null | undefined,
): string | null {
  const spec = SHIPMENT_CARRIERS[carrier]
  if (!spec?.trackingUrlTemplate || !trackingNumber?.trim()) return null
  return spec.trackingUrlTemplate.replace('{n}', encodeURIComponent(trackingNumber.trim()))
}

/**
 * Ce qu'on affiche au client. `carrierOther` n'est repris que pour les
 * transporteurs nommables : jamais pour le transitaire partenaire.
 */
export function publicCarrierLabel(
  carrier: ShipmentCarrierKey,
  carrierOther?: string | null,
): string {
  const spec = SHIPMENT_CARRIERS[carrier] ?? SHIPMENT_CARRIERS.OTHER
  if (spec.publiclyNamed && carrierOther?.trim()) return carrierOther.trim()
  return spec.publicLabel
}

// ---------------------------------------------------------------------------
// Étapes d'expédition (docs/logistique-as-a-service.md §4)
// ---------------------------------------------------------------------------

export type ShipmentStatusKey =
  | 'SOURCING'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'CUSTOMS'
  | 'LOCAL_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export interface ShipmentStatusSpec {
  key: ShipmentStatusKey
  label: string
  /** Formulation orientée client, à la voix active. */
  publicLabel: string
  /** Champ horodaté sur Shipment au passage dans cet état. */
  timestampField: 'departedAt' | 'customsClearedAt' | 'arrivedAt' | 'deliveredAt' | null
}

/** Ordre d'affichage de la frise. CANCELLED est hors frise. */
export const SHIPMENT_FLOW: ShipmentStatusKey[] = [
  'SOURCING',
  'COLLECTED',
  'IN_TRANSIT',
  'CUSTOMS',
  'LOCAL_DELIVERY',
  'DELIVERED',
]

export const SHIPMENT_STATUSES: Record<ShipmentStatusKey, ShipmentStatusSpec> = {
  SOURCING: {
    key: 'SOURCING',
    label: 'Sourcing',
    publicLabel: 'Recherche de la pièce',
    timestampField: null,
  },
  COLLECTED: {
    key: 'COLLECTED',
    label: 'Pièce collectée',
    publicLabel: 'Pièce récupérée chez le fournisseur',
    timestampField: null,
  },
  IN_TRANSIT: {
    key: 'IN_TRANSIT',
    label: 'En transit',
    publicLabel: 'En route vers Abidjan',
    timestampField: 'departedAt',
  },
  CUSTOMS: {
    key: 'CUSTOMS',
    label: 'Dédouanement',
    publicLabel: 'Formalités douanières à Abidjan',
    timestampField: 'customsClearedAt',
  },
  LOCAL_DELIVERY: {
    key: 'LOCAL_DELIVERY',
    label: 'Livraison locale',
    publicLabel: 'En cours de livraison',
    timestampField: 'arrivedAt',
  },
  DELIVERED: {
    key: 'DELIVERED',
    label: 'Livrée',
    publicLabel: 'Livrée',
    timestampField: 'deliveredAt',
  },
  CANCELLED: {
    key: 'CANCELLED',
    label: 'Annulée',
    publicLabel: 'Annulée',
    timestampField: null,
  },
}

/**
 * Transitions autorisées. On avance dans la frise, on peut annuler tant que ce
 * n'est pas livré, et on autorise un retour en arrière d'une étape (l'ops se
 * trompe de bouton — la correction ne doit pas passer par la base).
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatusKey, ShipmentStatusKey[]> = {
  SOURCING: ['COLLECTED', 'IN_TRANSIT', 'CANCELLED'],
  COLLECTED: ['IN_TRANSIT', 'SOURCING', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'LOCAL_DELIVERY', 'COLLECTED', 'CANCELLED'],
  CUSTOMS: ['LOCAL_DELIVERY', 'IN_TRANSIT', 'CANCELLED'],
  LOCAL_DELIVERY: ['DELIVERED', 'CUSTOMS', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransitionShipment(from: ShipmentStatusKey, to: ShipmentStatusKey): boolean {
  return (SHIPMENT_TRANSITIONS[from] ?? []).includes(to)
}
