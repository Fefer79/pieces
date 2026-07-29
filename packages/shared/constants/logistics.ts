/**
 * Moteur d'arbitrage logistique — phase 1 de `docs/logistique-as-a-service.md`.
 *
 * Compare, pour une pièce donnée, le coût TOTAL de chaque option d'approvisionnement :
 *
 *   coût total = prix pièce + fret + douane + livraison locale
 *              + (délai en jours × coût d'immobilisation journalier du véhicule)
 *
 * Le troisième terme est celui que personne ne chiffre et qui domine presque toujours :
 * un véhicule VTC immobilisé coûte 23 000 à 38 000 F par jour à sa flotte.
 *
 * ⚠️ Les tarifs de fret et de douane ci-dessous sont des ORDRES DE GRANDEUR de cadrage,
 * à remplacer par la grille réelle du partenaire transitaire (phase 2). Les coûts
 * d'immobilisation, eux, sont des chiffres client (GoCab, réunion de cadrage).
 */

// ---------------------------------------------------------------------------
// Coût d'immobilisation
// ---------------------------------------------------------------------------

export type VehicleEnergyType = 'ICE' | 'EV' | 'HYBRID'

/** Segment économique d'un véhicule de flotte — pilote le coût d'immobilisation. */
export type VehicleEconomyCategory = 'ECONOMY_ICE' | 'PREMIUM_ICE' | 'PREMIUM_EV'

/**
 * Recette nette journalière par véhicule (FCFA), chiffres GoCab. On retient la borne
 * basse de chaque fourchette : une démonstration qui tient dans l'hypothèse la plus
 * défavorable n'est pas contestable.
 */
export const DOWNTIME_COST_PER_DAY: Record<VehicleEconomyCategory, number> = {
  ECONOMY_ICE: 23_000, // 23 000 – 28 000 (Alto, Starlet)
  PREMIUM_ICE: 30_000, // 30 000 – 35 000 (Bestune T55, B70)
  PREMIUM_EV: 38_000, // 38 000 – 42 000 (Bestune NAT, E03)
}

/**
 * Dépense pièces annuelle par véhicule (FCFA). L'électrique consomme ~45 % de moins :
 * pas de vidange, filtre à huile, bougie, courroie, embrayage ni échappement.
 */
export const ANNUAL_PARTS_SPEND: Record<VehicleEconomyCategory, number> = {
  ECONOMY_ICE: 1_300_000,
  PREMIUM_ICE: 1_300_000,
  PREMIUM_EV: 720_000,
}

/** Modèles du segment économique observés sur le marché VTC abidjanais. */
const ECONOMY_MODELS = [
  'alto',
  'starlet',
  'picanto',
  'i10',
  'spark',
  'wagon r',
  'celerio',
  'yaris',
]

/**
 * Segment économique d'un véhicule. `energyType` prime : un électrique est toujours
 * classé premium (aucun EV du segment économique sur le marché VTC à ce jour).
 */
export function resolveEconomyCategory(vehicle: {
  energyType?: VehicleEnergyType | null
  model?: string | null
}): VehicleEconomyCategory {
  if (vehicle.energyType === 'EV') return 'PREMIUM_EV'
  const model = (vehicle.model ?? '').toLowerCase()
  return ECONOMY_MODELS.some((m) => model.includes(m)) ? 'ECONOMY_ICE' : 'PREMIUM_ICE'
}

// ---------------------------------------------------------------------------
// Référentiel poids / volume
// ---------------------------------------------------------------------------

/** Fiabilité de l'estimation poids/volume, affichée au client. */
export type LogisticsConfidence = 'MEASURED' | 'CATALOG' | 'FAMILY'

export interface PartLogisticsFamily {
  id: string
  label: string
  weightKgMin: number
  weightKgMax: number
  volumeDm3Min: number
  volumeDm3Max: number
  /** Interdit ou fortement restreint en fret aérien (batteries, airbags, gaz sous pression). */
  airRestricted?: boolean
  fragile?: boolean
  /** Mots-clés de rattachement depuis le nom/catégorie saisis par le mécanicien. */
  keywords: string[]
}

export const PART_LOGISTICS_FAMILIES: PartLogisticsFamily[] = [
  {
    id: 'FILTER',
    label: 'Filtres',
    weightKgMin: 0.2, weightKgMax: 1.5, volumeDm3Min: 1, volumeDm3Max: 6,
    keywords: ['filtre', 'filtration'],
  },
  {
    id: 'BRAKE_PADS',
    label: 'Plaquettes de frein',
    weightKgMin: 1.5, weightKgMax: 4, volumeDm3Min: 2, volumeDm3Max: 4,
    keywords: ['plaquette', 'plaquettes'],
  },
  {
    id: 'BRAKE_DISCS',
    label: 'Disques de frein',
    weightKgMin: 8, weightKgMax: 14, volumeDm3Min: 8, volumeDm3Max: 14,
    keywords: ['disque', 'disques'],
  },
  {
    id: 'SHOCK_ABSORBER',
    label: 'Amortisseur',
    weightKgMin: 3, weightKgMax: 6, volumeDm3Min: 10, volumeDm3Max: 18,
    airRestricted: true, // amortisseur à gaz
    keywords: ['amortisseur', 'suspension'],
  },
  {
    id: 'SUSPENSION_ARM',
    label: 'Train roulant (bras, rotule, silentbloc, roulement)',
    weightKgMin: 2, weightKgMax: 9, volumeDm3Min: 5, volumeDm3Max: 20,
    keywords: ['rotule', 'silentbloc', 'roulement', 'triangle', 'bras', 'train roulant', 'biellette'],
  },
  {
    id: 'ALTERNATOR_STARTER',
    label: 'Alternateur / démarreur',
    weightKgMin: 3, weightKgMax: 8, volumeDm3Min: 6, volumeDm3Max: 12,
    keywords: ['alternateur', 'demarreur', 'démarreur'],
  },
  {
    id: 'CLUTCH_KIT',
    label: 'Kit embrayage',
    weightKgMin: 8, weightKgMax: 14, volumeDm3Min: 12, volumeDm3Max: 20,
    keywords: ['embrayage', 'kit embrayage'],
  },
  {
    id: 'RADIATOR',
    label: 'Radiateur / condenseur',
    weightKgMin: 5, weightKgMax: 10, volumeDm3Min: 40, volumeDm3Max: 70,
    keywords: ['radiateur', 'condenseur', 'refroidissement'],
  },
  {
    id: 'HEADLIGHT',
    label: 'Phare / optique',
    weightKgMin: 2, weightKgMax: 5, volumeDm3Min: 25, volumeDm3Max: 45,
    fragile: true,
    keywords: ['phare', 'optique', 'feu', 'clignotant'],
  },
  {
    id: 'BUMPER',
    label: 'Pare-chocs',
    weightKgMin: 5, weightKgMax: 9, volumeDm3Min: 150, volumeDm3Max: 250,
    keywords: ['pare-choc', 'pare choc', 'parechoc', 'bouclier'],
  },
  {
    id: 'BODY_PANEL',
    label: 'Capot / aile / portière',
    weightKgMin: 10, weightKgMax: 20, volumeDm3Min: 120, volumeDm3Max: 300,
    // Pas de « carrosserie » : c'est un nom de catégorie, trop générique — il capterait
    // les pare-chocs et les optiques, qui ont leur propre gabarit.
    keywords: ['capot', 'aile', 'portiere', 'portière', 'hayon'],
  },
  {
    id: 'WINDSHIELD',
    label: 'Pare-brise / vitrage',
    weightKgMin: 12, weightKgMax: 20, volumeDm3Min: 60, volumeDm3Max: 100,
    fragile: true,
    keywords: ['pare-brise', 'pare brise', 'parebrise', 'vitre', 'vitrage', 'lunette'],
  },
  {
    id: 'BATTERY',
    label: 'Batterie de démarrage',
    weightKgMin: 14, weightKgMax: 22, volumeDm3Min: 12, volumeDm3Max: 18,
    airRestricted: true,
    keywords: ['batterie'],
  },
  {
    id: 'TYRE',
    label: 'Pneumatique',
    weightKgMin: 8, weightKgMax: 14, volumeDm3Min: 60, volumeDm3Max: 90,
    keywords: ['pneu', 'pneumatique'],
  },
  {
    id: 'GEARBOX',
    label: 'Boîte de vitesses',
    weightKgMin: 45, weightKgMax: 90, volumeDm3Min: 90, volumeDm3Max: 150,
    keywords: ['boite', 'boîte', 'vitesses', 'transmission'],
  },
  {
    id: 'ENGINE',
    label: 'Moteur complet',
    weightKgMin: 120, weightKgMax: 250, volumeDm3Min: 250, volumeDm3Max: 400,
    keywords: ['moteur complet', 'moteur'],
  },
  {
    id: 'EV_HV_COMPONENT',
    label: 'Composant haute tension (EV)',
    weightKgMin: 5, weightKgMax: 40, volumeDm3Min: 20, volumeDm3Max: 120,
    airRestricted: true,
    keywords: ['onduleur', 'chargeur embarque', 'chargeur embarqué', 'haute tension', 'batterie de traction', 'convertisseur'],
  },
]

/** Famille par défaut quand le nom de la pièce ne matche rien — gabarit moyen. */
export const DEFAULT_FAMILY: PartLogisticsFamily = {
  id: 'GENERIC',
  label: 'Pièce non catégorisée',
  weightKgMin: 3,
  weightKgMax: 12,
  volumeDm3Min: 10,
  volumeDm3Max: 40,
  keywords: [],
}

const stripAccents = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

/**
 * Rattache un libellé libre (« Plaquettes avant », « Freinage / Disques ») à une famille.
 * Le mot-clé le plus long l'emporte, pour que « moteur complet » batte « moteur ».
 */
export function matchLogisticsFamily(...texts: (string | null | undefined)[]): PartLogisticsFamily | null {
  const haystack = stripAccents(texts.filter(Boolean).join(' ').toLowerCase())
  let best: { family: PartLogisticsFamily; length: number } | null = null
  for (const family of PART_LOGISTICS_FAMILIES) {
    for (const keyword of family.keywords) {
      const needle = stripAccents(keyword.toLowerCase())
      if (haystack.includes(needle) && (!best || needle.length > best.length)) {
        best = { family, length: needle.length }
      }
    }
  }
  return best?.family ?? null
}

// ---------------------------------------------------------------------------
// Poids taxable
// ---------------------------------------------------------------------------

export type LogisticsMode =
  | 'PRE_POSITIONED'
  | 'LOCAL'
  | 'AIR_NOW'
  | 'AIR_STANDARD'
  | 'AIR_ECONOMY'
  | 'SEA_LCL'

/**
 * Poids taxable (kg) : le transporteur facture le maximum entre le poids réel et le
 * volume converti. Aérien : 1 m³ = 167 kg (diviseur 6000 cm³/kg). LCL : 1 m³ = 1 t.
 */
export function chargeableWeightKg(
  mode: LogisticsMode,
  weightKg: number,
  volumeDm3: number,
): number {
  if (mode === 'AIR_NOW' || mode === 'AIR_STANDARD' || mode === 'AIR_ECONOMY') {
    // 1 dm³ = 1000 cm³ → volumeDm3 × 1000 / 6000 = volumeDm3 / 6
    return Math.max(weightKg, volumeDm3 / 6)
  }
  if (mode === 'SEA_LCL') {
    // 1 m³ = 1000 dm³ = 1000 kg → volumeDm3 kg
    return Math.max(weightKg, volumeDm3)
  }
  return weightKg
}

// ---------------------------------------------------------------------------
// Grille tarifaire (placeholders de cadrage)
// ---------------------------------------------------------------------------

export interface LogisticsModeSpec {
  mode: LogisticsMode
  label: string
  /** Délai porte-à-porte en jours (0,25 j = quelques heures pour du stock local). */
  transitDays: number
  /** FCFA par kg taxable. */
  ratePerKg: number
  /** Minimum de perception (FCFA) — dossier, manutention, dédouanement forfaitaire. */
  minimumCharge: number
  /** Frais fixes de dossier (FCFA). */
  handlingFee: number
  detail: string
}

export const LOGISTICS_MODES: Record<LogisticsMode, LogisticsModeSpec> = {
  PRE_POSITIONED: {
    mode: 'PRE_POSITIONED',
    label: 'Stock pré-positionné',
    transitDays: 0.25,
    ratePerKg: 0,
    minimumCharge: 0,
    handlingFee: 2_000,
    detail: 'Pièce déjà à Abidjan, réservée à la flotte',
  },
  LOCAL: {
    mode: 'LOCAL',
    label: 'Achat local',
    transitDays: 2,
    ratePerKg: 0,
    minimumCharge: 0,
    handlingFee: 2_000,
    detail: 'Disponible chez un vendeur d\'Abidjan',
  },
  AIR_NOW: {
    mode: 'AIR_NOW',
    label: 'Aérien express',
    transitDays: 3,
    ratePerKg: 9_500,
    minimumCharge: 45_000,
    handlingFee: 15_000,
    detail: 'Premier vol disponible',
  },
  AIR_STANDARD: {
    mode: 'AIR_STANDARD',
    label: 'Aérien standard',
    transitDays: 5,
    ratePerKg: 7_000,
    minimumCharge: 32_000,
    handlingFee: 15_000,
    detail: 'Routage direct',
  },
  AIR_ECONOMY: {
    mode: 'AIR_ECONOMY',
    label: 'Aérien économique',
    transitDays: 7,
    ratePerKg: 5_000,
    minimumCharge: 25_000,
    handlingFee: 15_000,
    detail: 'Consolidé, priorité basse',
  },
  SEA_LCL: {
    mode: 'SEA_LCL',
    label: 'Maritime groupé',
    transitDays: 45,
    ratePerKg: 450,
    minimumCharge: 30_000,
    handlingFee: 25_000,
    detail: 'Groupage conteneur + transit 45 j',
  },
}

/** Droits de douane approximatifs sur la valeur pièce + fret (la TVA est récupérable). */
export const CUSTOMS_DUTY_RATE = 0.2

/** Livraison finale Abidjan une fois la pièce dédouanée. */
export const LAST_MILE_FEE = 2_000

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

export interface ArbitrageOptionInput {
  mode: LogisticsMode
  /** Prix de la pièce pour cette option (FCFA TTC vendeur). */
  partPrice: number
  /** Écrase le délai standard du mode (ex. vendeur local qui annonce 24 h). */
  transitDays?: number
  available?: boolean
}

export interface ArbitrageInput {
  /** Coût d'immobilisation journalier — passer la valeur flotte si elle est connue. */
  downtimeCostPerDay: number
  /** Poids réel si connu (issu d'un envoi précédent) — sinon estimé depuis la famille. */
  weightKg?: number
  volumeDm3?: number
  family?: PartLogisticsFamily | null
  options: ArbitrageOptionInput[]
}

export interface ArbitrageOption {
  mode: LogisticsMode
  label: string
  detail: string
  transitDays: number
  chargeableWeightKg: number
  partPrice: number
  freightCost: number
  customsCost: number
  lastMileCost: number
  downtimeCost: number
  totalCost: number
  available: boolean
  /** Surcoût par rapport à la meilleure option (0 pour la recommandée). */
  extraCostVsBest: number
  recommended: boolean
  warnings: string[]
}

export interface ArbitrageResult {
  weightKg: number
  volumeDm3: number
  familyId: string
  familyLabel: string
  confidence: LogisticsConfidence
  downtimeCostPerDay: number
  options: ArbitrageOption[]
}

const roundTo100 = (n: number) => Math.round(n / 100) * 100

/**
 * Construit la matrice d'arbitrage. Les options sont triées par coût total croissant ;
 * la première disponible est marquée `recommended`.
 */
export function computeArbitrageMatrix(input: ArbitrageInput): ArbitrageResult {
  const family = input.family ?? DEFAULT_FAMILY
  const midpoint = (min: number, max: number) => (min + max) / 2

  const weightKg = input.weightKg ?? midpoint(family.weightKgMin, family.weightKgMax)
  const volumeDm3 = input.volumeDm3 ?? midpoint(family.volumeDm3Min, family.volumeDm3Max)
  const confidence: LogisticsConfidence = input.weightKg != null ? 'MEASURED' : 'FAMILY'

  const options: ArbitrageOption[] = input.options.map((opt) => {
    const spec = LOGISTICS_MODES[opt.mode]
    const isImport = opt.mode.startsWith('AIR_') || opt.mode === 'SEA_LCL'
    const chargeable = chargeableWeightKg(opt.mode, weightKg, volumeDm3)
    const transitDays = opt.transitDays ?? spec.transitDays

    const freightCost = isImport
      ? roundTo100(Math.max(chargeable * spec.ratePerKg + spec.handlingFee, spec.minimumCharge))
      : spec.handlingFee
    const customsCost = isImport ? roundTo100(CUSTOMS_DUTY_RATE * (opt.partPrice + freightCost)) : 0
    const lastMileCost = isImport ? LAST_MILE_FEE : 0
    const downtimeCost = Math.round(transitDays * input.downtimeCostPerDay)

    const warnings: string[] = []
    if (family.airRestricted && opt.mode.startsWith('AIR_')) {
      warnings.push('Matière restreinte en fret aérien, à confirmer avant le devis')
    }
    if (family.fragile && isImport) {
      warnings.push('Pièce fragile : emballage renforcé et assurance recommandés')
    }

    return {
      mode: opt.mode,
      label: spec.label,
      detail: spec.detail,
      transitDays,
      chargeableWeightKg: Math.round(chargeable * 10) / 10,
      partPrice: opt.partPrice,
      freightCost,
      customsCost,
      lastMileCost,
      downtimeCost,
      totalCost: opt.partPrice + freightCost + customsCost + lastMileCost + downtimeCost,
      available: opt.available ?? true,
      extraCostVsBest: 0,
      recommended: false,
      warnings,
    }
  })

  options.sort((a, b) => a.totalCost - b.totalCost)

  const best = options.find((o) => o.available)
  if (best) {
    best.recommended = true
    for (const option of options) {
      option.extraCostVsBest = option.totalCost - best.totalCost
    }
  }

  return {
    weightKg: Math.round(weightKg * 10) / 10,
    volumeDm3: Math.round(volumeDm3),
    familyId: family.id,
    familyLabel: family.label,
    confidence,
    downtimeCostPerDay: input.downtimeCostPerDay,
    options,
  }
}
