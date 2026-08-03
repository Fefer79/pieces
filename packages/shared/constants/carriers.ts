/**
 * Transporteurs et suivi d'expédition.
 *
 * Aucune intégration API transporteur : on stocke le numéro de suivi et on
 * construit le lien vers la page publique du transporteur. Une intégration
 * pourra plus tard alimenter `ShipmentEvent` sans changer ce fichier.
 *
 * ⚠ RÈGLE PRODUIT (apps/web/lib/logistique-content.ts, en-tête) : le partenaire
 * transitaire n'est JAMAIS nommé côté client — Pièces est l'opérateur de bout en
 * bout, l'exécution est sous-traitée. `isCarrierPublic()` porte cette règle et
 * doit être appliquée CÔTÉ SERVEUR dans la projection publique, pas seulement au
 * rendu : sinon le nom fuite dans le JSON même s'il n'est pas affiché.
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

export type ShipmentCarrierCode = (typeof SHIPMENT_CARRIERS)[number]

export const CARRIER_LABELS: Record<ShipmentCarrierCode, string> = {
  DHL: 'DHL Express',
  FEDEX: 'FedEx',
  UPS: 'UPS',
  TRANSITAIRE: 'Transitaire partenaire',
  AIR_CARGO: 'Fret aérien (cargo)',
  SEA_LCL: 'Maritime groupé (LCL)',
  POSTAL: 'Postal',
  OTHER: 'Autre',
}

/** Libellé affiché au client quand le transporteur réel ne peut pas être nommé. */
export const CARRIER_PUBLIC_FALLBACK = 'notre partenaire logistique'

/**
 * Transporteurs nommables côté client : les trois intégrateurs mondiaux, dont
 * le nom est de toute façon sur le colis et dont le suivi est public. Tout le
 * reste — et en particulier `TRANSITAIRE` — reste anonyme.
 */
const PUBLIC_CARRIERS: ShipmentCarrierCode[] = ['DHL', 'FEDEX', 'UPS']

export function isCarrierPublic(carrier: string | null | undefined): boolean {
  return !!carrier && (PUBLIC_CARRIERS as string[]).includes(carrier)
}

/** Nom affichable au client : le transporteur réel, ou le libellé générique. */
export function publicCarrierLabel(carrier: string | null | undefined): string {
  return isCarrierPublic(carrier)
    ? CARRIER_LABELS[carrier as ShipmentCarrierCode]
    : CARRIER_PUBLIC_FALLBACK
}

/** Gabarits d'URL de suivi. `null` = pas de page publique exploitable. */
const TRACKING_URL_TEMPLATES: Record<ShipmentCarrierCode, string | null> = {
  DHL: 'https://www.dhl.com/ci-fr/home/tracking/tracking-express.html?tracking-id={n}',
  FEDEX: 'https://www.fedex.com/fedextrack/?trknbr={n}',
  UPS: 'https://www.ups.com/track?loc=fr_CI&tracknum={n}',
  TRANSITAIRE: null,
  AIR_CARGO: null,
  SEA_LCL: null,
  POSTAL: null,
  OTHER: null,
}

/**
 * URL de suivi d'un envoi. `null` si le transporteur n'expose pas de page
 * publique ou si le numéro manque — l'appelant laisse alors le champ vide.
 */
export function buildTrackingUrl(
  carrier: string | null | undefined,
  trackingNumber: string | null | undefined,
): string | null {
  const number = trackingNumber?.trim()
  if (!carrier || !number) return null
  const template = TRACKING_URL_TEMPLATES[carrier as ShipmentCarrierCode]
  if (!template) return null
  return template.replace('{n}', encodeURIComponent(number))
}

// ---------------------------------------------------------------------------
// Étapes de transport (docs/logistique-as-a-service.md §4)
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

export type ShipmentStatusCode = (typeof SHIPMENT_STATUSES)[number]

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatusCode, string> = {
  SOURCING: 'Approvisionnement',
  COLLECTED: 'Colis récupéré',
  IN_TRANSIT: 'En transit',
  CUSTOMS: 'Dédouanement',
  LOCAL_DELIVERY: 'Livraison Abidjan',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
}

/**
 * Machine à états du transport : linéaire, plus l'annulation depuis tout état
 * non terminal. Même principe que `PO_TRANSITIONS` côté bon de commande.
 */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatusCode, ShipmentStatusCode[]> = {
  SOURCING: ['COLLECTED', 'CANCELLED'],
  COLLECTED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'LOCAL_DELIVERY', 'CANCELLED'],
  CUSTOMS: ['LOCAL_DELIVERY', 'CANCELLED'],
  LOCAL_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export function canTransitionShipment(
  from: ShipmentStatusCode,
  to: ShipmentStatusCode,
): boolean {
  return SHIPMENT_TRANSITIONS[from].includes(to)
}
