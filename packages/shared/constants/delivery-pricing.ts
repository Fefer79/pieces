import { ABIDJAN_DELIVERY_FEES, type AbidjanCommune } from './communes'
import { splitCategory, type PartCategory } from './categories'

/**
 * Tarification livraison par palier d'abonnement (voir apps/web/lib/fleet-plans.ts
 * pour les fourchettes marketing — elles doivent rester cohérentes avec cette grille).
 *
 * Formule : frais par vendeur = max(taux × sous-total pièces du vendeur, plancher),
 * où plancher = plancher de zone × facteur de gabarit de la pièce la plus
 * encombrante du vendeur. Sommés puis plafonnés par commande. Flotte Pro + : offerte.
 *
 * Deux dimensions font varier le prix, comme annoncé sur /entreprises :
 *  - le volume : montant du panier (taux) ET encombrement des pièces (gabarit) ;
 *  - le délai : Économique 3–5 j / Standard 48–72 h / Express prioritaire.
 */
export type DeliveryPricingTier = 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
export type DeliveryPricingMode = 'ECO' | 'STANDARD' | 'EXPRESS'

export const DELIVERY_MODES: Array<{
  mode: DeliveryPricingMode
  label: string
  detail: string
}> = [
  { mode: 'ECO', label: 'Économique', detail: '3–5 jours' },
  { mode: 'STANDARD', label: 'Standard', detail: '48–72 h' },
  { mode: 'EXPRESS', label: 'Express', detail: 'prioritaire, dans la journée' },
]

/**
 * Gabarit logistique d'une pièce : ce qu'il faut pour la transporter.
 * S = sacoche moto, M = top-case, L = coffre/tricycle, XL = utilitaire.
 * Dérivé de la catégorie (déjà présente sur chaque annonce et dans le panier),
 * donc aucun backfill n'est nécessaire.
 */
export type DeliveryGabarit = 'S' | 'M' | 'L' | 'XL'

export const GABARIT_LABEL: Record<DeliveryGabarit, string> = {
  S: 'Petit colis',
  M: 'Colis moyen',
  L: 'Volumineux',
  XL: 'Hors gabarit',
}

const GABARIT_FACTOR: Record<DeliveryGabarit, number> = {
  S: 1,
  M: 1.3,
  L: 1.8,
  XL: 2.5,
}

export const GABARIT_BY_CATEGORY: Record<PartCategory, DeliveryGabarit> = {
  Moteur: 'XL',
  'Boîte de vitesses': 'XL',
  'Carrosserie extérieure': 'XL',
  Vitrage: 'XL',
  Refroidissement: 'L',
  Échappement: 'L',
  Transmission: 'L',
  Suspension: 'L',
  'Roues & pneus': 'L',
  'Sièges & sellerie': 'L',
  Distribution: 'M',
  'Alimentation carburant': 'M',
  'Admission & turbo': 'M',
  Embrayage: 'M',
  Freinage: 'M',
  Direction: 'M',
  'Électrique & batterie': 'M',
  'Démarrage & charge': 'M',
  'Éclairage & signalisation': 'M',
  'Climatisation & chauffage': 'M',
  'Audio & multimédia': 'M',
  'Accessoires & équipements': 'M',
  'Outillage & entretien': 'M',
  'Fluides & consommables': 'M',
  'Carrosserie intérieure': 'M',
  Allumage: 'S',
  Filtration: 'S',
  Lubrification: 'S',
  'Capteurs & calculateurs': 'S',
  'Essuie-glace & lave-glace': 'S',
  'Serrurerie & sécurité': 'S',
  'Navigation & connectivité': 'S',
}

const DEFAULT_GABARIT: DeliveryGabarit = 'M'

/**
 * Gabarit d'une pièce depuis son champ `category` (forme combinée
 * "Catégorie / Sous-catégorie"). Catégorie inconnue ou absente → gabarit moyen.
 */
export function gabaritOf(category: string | null | undefined): DeliveryGabarit {
  if (!category) return DEFAULT_GABARIT
  const { category: head } = splitCategory(category)
  return GABARIT_BY_CATEGORY[head as PartCategory] ?? DEFAULT_GABARIT
}

/** Gabarit d'un lot : la pièce la plus encombrante dicte le véhicule à mobiliser. */
export function maxGabarit(categories: Array<string | null | undefined>): DeliveryGabarit {
  const order: DeliveryGabarit[] = ['S', 'M', 'L', 'XL']
  return categories.reduce<DeliveryGabarit>((worst, c) => {
    const g = gabaritOf(c)
    return order.indexOf(g) > order.indexOf(worst) ? g : worst
  }, 'S')
}

// Zone tarifaire dérivée du forfait commune historique :
// 1 500 F → centre (0), 2 000 F → intermédiaire (1), 2 500 F → périphérie (2).
function zoneOf(commune: AbidjanCommune): 0 | 1 | 2 {
  const base = ABIDJAN_DELIVERY_FEES[commune]
  return base <= 1500 ? 0 : base <= 2000 ? 1 : 2
}

const RATE: Record<DeliveryPricingMode, Record<DeliveryPricingTier, number>> = {
  ECO: { FREE: 0.02, PRO_FLOTTE: 0.015, PRO_FLOTTE_PLUS: 0 },
  STANDARD: { FREE: 0.03, PRO_FLOTTE: 0.02, PRO_FLOTTE_PLUS: 0 },
  EXPRESS: { FREE: 0.06, PRO_FLOTTE: 0.04, PRO_FLOTTE_PLUS: 0 },
}

// Plancher par vendeur pour un gabarit S, indexé par zone [centre, intermédiaire, périphérie].
// Les gabarits plus encombrants multiplient ce plancher (GABARIT_FACTOR).
const FLOOR: Record<DeliveryPricingMode, Record<DeliveryPricingTier, [number, number, number]>> = {
  ECO: {
    FREE: [1500, 1800, 2200],
    PRO_FLOTTE: [1000, 1200, 1500],
    PRO_FLOTTE_PLUS: [0, 0, 0],
  },
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
  ECO: { FREE: 6000, PRO_FLOTTE: 4000, PRO_FLOTTE_PLUS: 0 },
  STANDARD: { FREE: 9000, PRO_FLOTTE: 5000, PRO_FLOTTE_PLUS: 0 },
  EXPRESS: { FREE: 19_900, PRO_FLOTTE: 9900, PRO_FLOTTE_PLUS: 0 },
}

const roundTo100 = (n: number) => Math.round(n / 100) * 100

/** Un vendeur du panier : son sous-total pièces et les catégories qu'il expédie. */
export interface DeliveryVendorGroup {
  /** Sous-total pièces (FCFA) du vendeur — chaque vendeur expédie séparément. */
  subtotal: number
  /** Catégories (champ combiné) des articles du vendeur, pour le gabarit. */
  categories: Array<string | null | undefined>
}

export interface DeliveryFeeInput {
  tier: DeliveryPricingTier
  mode: DeliveryPricingMode
  commune: string | null | undefined
  vendors: DeliveryVendorGroup[]
}

/**
 * Frais de livraison d'une commande, ou `null` si la commune est absente/inconnue
 * (le serveur coalesce alors à 0, le front masque la ligne).
 */
export function computeDeliveryFee({ tier, mode, commune, vendors }: DeliveryFeeInput): number | null {
  if (!commune || !(commune in ABIDJAN_DELIVERY_FEES)) return null
  if (tier === 'PRO_FLOTTE_PLUS') return 0
  const zone = zoneOf(commune as AbidjanCommune)
  const rate = RATE[mode][tier]
  const baseFloor = FLOOR[mode][tier][zone]
  const total = vendors.reduce((sum, v) => {
    const floor = roundTo100(baseFloor * GABARIT_FACTOR[maxGabarit(v.categories)])
    return sum + Math.max(roundTo100(rate * v.subtotal), floor)
  }, 0)
  return Math.min(total, CAP[mode][tier])
}
