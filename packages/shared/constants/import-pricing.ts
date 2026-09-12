/**
 * Tarification des pièces « à importer » — rubriques « Neuf à importer » et
 * « Occasion à importer ».
 *
 * Ces pièces ne sont pas à Abidjan : elles sont en stock chez un partenaire
 * international. Le client précommande, nous achetons, acheminons et dédouanons.
 * Le prix qu'il voit se décompose donc en quatre lignes explicites — pièce,
 * fret, douane, livraison locale (DESIGN.md : aucune ligne cachée).
 *
 * Ce module est une COUCHE MINCE au-dessus de `logistics.ts`, qui porte déjà la
 * grille de fret (LOGISTICS_MODES), le taux de douane (CUSTOMS_DUTY_RATE), le
 * référentiel poids/volume (PART_LOGISTICS_FAMILIES) et le calcul du poids
 * taxable. Aucun taux n'est redéfini ici : le devis flotte et la marketplace
 * doivent chiffrer un même colis à l'identique.
 *
 * Le dernier kilomètre à Abidjan reste `computeDeliveryFee()`
 * (delivery-pricing.ts) : une fois dédouanée, la pièce se livre comme une autre.
 */

import {
  CUSTOMS_DUTY_RATE,
  DEFAULT_FAMILY,
  LOGISTICS_MODES,
  SEA_LCL_MIN_CHARGEABLE_KG,
  chargeableWeightKg,
  matchLogisticsFamily,
  type PartLogisticsFamily,
} from './logistics'

/**
 * Les trois acheminements proposés au client. Sous-ensemble de `LogisticsMode` :
 * `AIR_STANDARD` n'est pas offert au détail (il se glisse entre l'économique et
 * l'express sans arbitrage lisible), `LOCAL` et `PRE_POSITIONED` ne sont pas des
 * imports.
 */
export type ImportFreightMode = 'SEA_LCL' | 'AIR_ECONOMY' | 'AIR_NOW'

export const IMPORT_FREIGHT_MODES: ImportFreightMode[] = ['SEA_LCL', 'AIR_ECONOMY', 'AIR_NOW']

export const DEFAULT_IMPORT_FREIGHT_MODE: ImportFreightMode = 'AIR_ECONOMY'

/**
 * Libellés client. Volontairement différents de ceux de `LOGISTICS_MODES`, qui
 * s'adressent à un gestionnaire de flotte : ici on parle bateau et avion.
 */
export const IMPORT_FREIGHT_LABELS: Record<ImportFreightMode, { label: string; detail: string }> = {
  SEA_LCL: { label: 'Bateau (groupage)', detail: '6 à 8 semaines' },
  AIR_ECONOMY: { label: 'Avion économique', detail: '10 à 15 jours' },
  AIR_NOW: { label: 'Avion express', detail: '5 à 8 jours' },
}

export function isImportFreightMode(value: unknown): value is ImportFreightMode {
  return typeof value === 'string' && (IMPORT_FREIGHT_MODES as string[]).includes(value)
}

/** Mode d'acheminement valide, ou l'économique par défaut. */
export function parseImportFreightMode(value: unknown): ImportFreightMode {
  return isImportFreightMode(value) ? value : DEFAULT_IMPORT_FREIGHT_MODE
}

export interface ImportQuoteItem {
  name: string | null | undefined
  category: string | null | undefined
  /** Poids unitaire annoncé par la source ; sinon estimé depuis la famille. */
  weightKg?: number | null
  quantity: number
  /**
   * Valeur en douane UNITAIRE. C'est le coût d'achat réel chez le partenaire
   * (`CatalogItem.sourceCostFcfa`), pas le prix affiché : la douane se calcule
   * sur la valeur déclarée. Facturer 20 % de notre prix de vente reviendrait à
   * doubler une ligne intitulée « Douane » — une marge cachée déguisée en taxe,
   * que DESIGN.md interdit et qu'un client averti repère. Le serveur passe
   * `sourceCostFcfa ?? price` ; la valeur ne sort jamais vers le client.
   */
  customsValue: number
}

export interface ImportQuote {
  mode: ImportFreightMode
  label: string
  detail: string
  /** Délai d'acheminement seul, hors délai de préparation du fournisseur. */
  transitDays: number
  chargeableWeightKg: number
  freightFee: number
  customsFee: number
  /** Fret + douane : ce que la précommande ajoute au prix des pièces. */
  total: number
  available: boolean
  warnings: string[]
}

const roundTo100 = (n: number) => Math.round(n / 100) * 100

/** Famille logistique d'une ligne, avec repli sur la famille générique. */
function familyOf(item: ImportQuoteItem): PartLogisticsFamily {
  return matchLogisticsFamily(item.name, item.category) ?? DEFAULT_FAMILY
}

/** Densité maximale retenue pour une pièce auto (kg/dm³) — plancher de volume. */
const MAX_DENSITY_KG_PER_DM3 = 2

/**
 * Volume unitaire estimé.
 *
 * Sans poids annoncé, on retient la BORNE HAUTE de la famille : sous-estimer fait
 * payer le transporteur à notre place, et le client découvre un supplément après
 * avoir payé son acompte.
 *
 * Avec un poids annoncé par la source, ce poids fait foi et corrige la famille.
 * Le rattachement se fait sur des mots-clés, et un libellé composé peut tomber
 * dans la mauvaise famille : « capteur de position VILEBREQUIN » matche les
 * pièces moteur lourdes (12–45 kg) alors que l'objet pèse 200 g. Facturer 80 dm³
 * de fret pour un capteur, et lui proposer un conteneur maritime, est absurde et
 * visible par le client. On met donc le volume à l'échelle du poids réel.
 */
function unitVolumeOf(family: PartLogisticsFamily, weightKg: number | null | undefined): number {
  if (!weightKg || weightKg <= 0) return family.volumeDm3Max
  const ratio = Math.min(1, weightKg / family.weightKgMax)
  // Une pièce ne peut pas être plus dense que du métal plein : le volume ne
  // descend jamais sous ce plancher, même si la famille est très mal choisie.
  return Math.max(family.volumeDm3Max * ratio, weightKg / MAX_DENSITY_KG_PER_DM3)
}

/** Poids et volume d'un lot. */
function bulkOf(items: ImportQuoteItem[]): { weightKg: number; volumeDm3: number } {
  return items.reduce(
    (acc, item) => {
      const family = familyOf(item)
      const qty = Math.max(1, item.quantity)
      const unitWeight = item.weightKg && item.weightKg > 0 ? item.weightKg : family.weightKgMax
      return {
        weightKg: acc.weightKg + unitWeight * qty,
        volumeDm3: acc.volumeDm3 + unitVolumeOf(family, item.weightKg) * qty,
      }
    },
    { weightKg: 0, volumeDm3: 0 },
  )
}

/** Devis d'acheminement + douane pour un lot et un mode donnés. */
export function computeImportQuote(items: ImportQuoteItem[], mode: ImportFreightMode): ImportQuote {
  const spec = LOGISTICS_MODES[mode]
  const { label, detail } = IMPORT_FREIGHT_LABELS[mode]

  if (items.length === 0) {
    return {
      mode, label, detail,
      transitDays: spec.transitDays,
      chargeableWeightKg: 0,
      freightFee: 0, customsFee: 0, total: 0,
      available: true, warnings: [],
    }
  }

  const { weightKg, volumeDm3 } = bulkOf(items)
  const chargeable = chargeableWeightKg(mode, weightKg, volumeDm3)

  const freightFee = roundTo100(Math.max(chargeable * spec.ratePerKg + spec.handlingFee, spec.minimumCharge))
  const declaredValue = items.reduce((sum, i) => sum + i.customsValue * Math.max(1, i.quantity), 0)
  const customsFee = roundTo100(CUSTOMS_DUTY_RATE * (declaredValue + freightFee))

  const warnings: string[] = []
  let available = true

  // Sous le seuil, le groupage maritime est strictement dominé : il ne reste que
  // les frais fixes de dossier et de dédouanement, pour 38 jours d'attente de
  // plus qu'un aérien économique. On l'affiche indisponible en disant pourquoi
  // plutôt que de laisser une ligne inarbitrable (cf. computeArbitrageMatrix).
  if (mode === 'SEA_LCL' && chargeable < SEA_LCL_MIN_CHARGEABLE_KG) {
    available = false
    warnings.push(
      'Groupage maritime non pertinent à ce gabarit : les frais fixes de dédouanement dépassent un envoi aérien économique',
    )
  }

  const isAir = mode === 'AIR_ECONOMY' || mode === 'AIR_NOW'
  if (isAir && items.some((i) => familyOf(i).airRestricted)) {
    available = false
    warnings.push('Matière restreinte en fret aérien (batterie, airbag, gaz sous pression) : acheminement par bateau uniquement')
  }
  if (items.some((i) => familyOf(i).fragile)) {
    warnings.push('Pièce fragile : emballage renforcé et assurance recommandés')
  }

  return {
    mode, label, detail,
    transitDays: spec.transitDays,
    chargeableWeightKg: Math.round(chargeable * 10) / 10,
    freightFee,
    customsFee,
    total: freightFee + customsFee,
    available,
    warnings,
  }
}

/** Les trois acheminements chiffrés, du moins cher au plus cher. */
export function importQuoteOptions(items: ImportQuoteItem[]): ImportQuote[] {
  return IMPORT_FREIGHT_MODES.map((mode) => computeImportQuote(items, mode)).sort(
    (a, b) => a.total - b.total,
  )
}

// ---------------------------------------------------------------------------
// Échéancier de la précommande
// ---------------------------------------------------------------------------

/** Part du prix des pièces réglée à la commande. Le reste est appelé à l'arrivée. */
export const IMPORT_DEPOSIT_RATE = 0.5

export interface PreorderSchedule {
  /** À payer aujourd'hui : la moitié des pièces + tout l'acheminement. */
  depositAmount: number
  /** À payer à l'arrivée : le reste des pièces + la livraison à Abidjan. */
  balanceAmount: number
  /** Part « pièces » de l'acompte, isolée pour l'affichage et le contrôle. */
  partsDeposit: number
  grandTotal: number
}

/**
 * Échéancier d'une précommande d'import.
 *
 * Le fret et la douane sont réglés INTÉGRALEMENT à la commande : ce sont des
 * décaissements immédiats et non récupérables dès que la marchandise part. La
 * livraison locale, elle, n'a lieu qu'à la fin — elle est appelée avec le solde.
 *
 * `roundTo5` parce que le XOF ne connaît pas d'unité plus fine et que CinetPay
 * refuse un montant qui n'est pas un multiple de 5 : arrondir ici garantit que
 * la somme acompte + solde retombe exactement sur le total.
 */
export function computePreorderSchedule(input: {
  partsTotal: number
  freightFee: number
  customsFee: number
  deliveryFee: number
}): PreorderSchedule {
  const roundTo5 = (n: number) => Math.round(n / 5) * 5
  const partsDeposit = roundTo5(input.partsTotal * IMPORT_DEPOSIT_RATE)
  return {
    partsDeposit,
    depositAmount: partsDeposit + input.freightFee + input.customsFee,
    balanceAmount: input.partsTotal - partsDeposit + input.deliveryFee,
    grandTotal: input.partsTotal + input.freightFee + input.customsFee + input.deliveryFee,
  }
}

// ---------------------------------------------------------------------------
// Vocabulaire
// ---------------------------------------------------------------------------

export type SupplyModeKey = 'LOCAL' | 'IMPORT'

export const SUPPLY_MODE_LABELS: Record<SupplyModeKey, string> = {
  LOCAL: 'Disponible à Abidjan',
  IMPORT: 'À importer',
}

const CONDITION_NOUN: Record<string, string> = {
  NEW: 'Neuf',
  USED: 'Occasion',
  REFURBISHED: 'Ré-usiné',
}

/**
 * Libellé de rubrique — « Neuf à importer », « Occasion à importer »…
 *
 * Source unique du vocabulaire : les libellés de condition sont aujourd'hui
 * dupliqués en variantes divergentes (« Occasion importée » / « Occasion » /
 * « Reconditionné ») selon les écrans. Tout ce qui nomme une rubrique passe par
 * ici.
 */
export function supplyRubriqueLabel(
  condition: string | null | undefined,
  supplyMode: SupplyModeKey,
): string {
  const noun = condition ? CONDITION_NOUN[condition] : undefined
  if (supplyMode === 'IMPORT') return noun ? `${noun} à importer` : 'Pièce à importer'
  if (!noun) return 'Pièce disponible à Abidjan'
  // « Occasion importée » reste le libellé historique d'une pièce d'occasion
  // déjà présente sur le marché ivoirien — à ne pas confondre avec « à importer ».
  return condition === 'USED' ? 'Occasion importée' : noun
}

/** Pays d'origine en toutes lettres, pour le bandeau de la fiche produit. */
export const ORIGIN_COUNTRY_LABELS: Record<string, string> = {
  DE: 'Allemagne',
  FR: 'France',
  BE: 'Belgique',
  IT: 'Italie',
  ES: 'Espagne',
  NL: 'Pays-Bas',
  GB: 'Royaume-Uni',
  US: 'États-Unis',
  JP: 'Japon',
  KR: 'Corée du Sud',
  AE: 'Émirats arabes unis',
  CN: 'Chine',
}

export function originCountryLabel(code: string | null | undefined): string | null {
  if (!code) return null
  return ORIGIN_COUNTRY_LABELS[code.toUpperCase()] ?? code.toUpperCase()
}
