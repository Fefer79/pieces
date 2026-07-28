import { ABIDJAN_DELIVERY_FEES, type AbidjanCommune } from './communes'

/**
 * Tarification livraison par palier d'abonnement (voir apps/web/lib/fleet-plans.ts
 * pour les fourchettes marketing — elles doivent rester cohérentes avec cette grille).
 *
 * Formule : frais par vendeur = max(taux × sous-total pièces du vendeur, plancher zone),
 * arrondi à la centaine, sommés puis plafonnés par commande. Flotte Pro + : offerte.
 */
export type DeliveryPricingTier = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
export type DeliveryPricingMode = 'STANDARD' | 'EXPRESS'

export const DELIVERY_MODES: Array<{
  mode: DeliveryPricingMode
  label: string
  detail: string
}> = [
  { mode: 'STANDARD', label: 'Standard', detail: '48–72 h' },
  { mode: 'EXPRESS', label: 'Express', detail: 'prioritaire à Abidjan' },
]

// Zone tarifaire dérivée du forfait commune historique :
// 1 500 F → centre (0), 2 000 F → intermédiaire (1), 2 500 F → périphérie (2).
function zoneOf(commune: AbidjanCommune): 0 | 1 | 2 {
  const base = ABIDJAN_DELIVERY_FEES[commune]
  return base <= 1500 ? 0 : base <= 2000 ? 1 : 2
}

const RATE: Record<DeliveryPricingMode, Record<DeliveryPricingTier, number>> = {
  STANDARD: { FREE: 0.03, PRO_FLOTTE: 0.02, PRO_FLOTTE_PLUS: 0 },
  EXPRESS: { FREE: 0.06, PRO_FLOTTE: 0.04, PRO_FLOTTE_PLUS: 0 },
}

// Plancher par vendeur, indexé par zone [centre, intermédiaire, périphérie].
const FLOOR: Record<DeliveryPricingMode, Record<DeliveryPricingTier, [number, number, number]>> = {
  STANDARD: {
    FREE: [1500, 2000, 2500],
    PRO_FLOTTE: [1000, 1500, 2000],
    PRO_FLOTTE_PLUS: [0, 0, 0],
  },
  EXPRESS: {
    FREE: [5000, 5000, 5000],
    PRO_FLOTTE: [5000, 5000, 5000],
    PRO_FLOTTE_PLUS: [0, 0, 0],
  },
}

// Plafond par commande — aligné sur les fourchettes publiées (fleet-plans.ts).
const CAP: Record<DeliveryPricingMode, Record<DeliveryPricingTier, number>> = {
  STANDARD: { FREE: 9000, PRO_FLOTTE: 5000, PRO_FLOTTE_PLUS: 0 },
  EXPRESS: { FREE: 19_900, PRO_FLOTTE: 9900, PRO_FLOTTE_PLUS: 0 },
}

const roundTo100 = (n: number) => Math.round(n / 100) * 100

export interface DeliveryFeeInput {
  tier: DeliveryPricingTier
  mode: DeliveryPricingMode
  commune: string | null | undefined
  /** Sous-total pièces (FCFA) par vendeur distinct — chaque vendeur expédie séparément. */
  vendorSubtotals: number[]
}

/**
 * Frais de livraison d'une commande, ou `null` si la commune est absente/inconnue
 * (le serveur coalesce alors à 0, le front masque la ligne).
 */
export function computeDeliveryFee({ tier, mode, commune, vendorSubtotals }: DeliveryFeeInput): number | null {
  if (!commune || !(commune in ABIDJAN_DELIVERY_FEES)) return null
  if (tier === 'PRO_FLOTTE_PLUS') return 0
  const zone = zoneOf(commune as AbidjanCommune)
  const rate = RATE[mode][tier]
  const floor = FLOOR[mode][tier][zone]
  const total = vendorSubtotals.reduce(
    (sum, subtotal) => sum + Math.max(roundTo100(rate * subtotal), floor),
    0,
  )
  return Math.min(total, CAP[mode][tier])
}
