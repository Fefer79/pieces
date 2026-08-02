// Jauge de certitude d'une demande de cotation logistique.
//
// ⚠ À ne pas confondre avec `LogisticsConfidence` (MEASURED | CATALOG | FAMILY)
// de ./logistics.ts : celui-là dit « à quel point connaît-on le poids/volume de
// la pièce », celui-ci dit « à quel point sait-on QUELLE pièce sur QUEL
// véhicule ». Deux axes distincts, affichés sur le même écran — les confondre
// produit une UI confuse et une mauvaise colonne en base.
//
// Ce module vit dans `shared` (et non dans apps/web/lib) parce que le serveur
// DOIT recalculer le score : on ne fait jamais confiance à la valeur envoyée par
// le client. Le score affiché au prospect et celui vu par les ops sont donc
// produits par le même code.

export type LeadCertaintySignal =
  | 'partName'
  | 'partCategory'
  | 'oemReference'
  | 'partPhoto'
  | 'vin'
  | 'registrationPhoto'
  | 'vehicleManual'
  | 'energyType'

export type LeadCertaintyLevel = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Poids de chaque preuve d'identification, sur 100.
 *
 * Le VIN pèse le plus lourd : c'est la seule donnée qui verrouille la variante
 * exacte du véhicule, donc la référence constructeur de la pièce.
 */
export const CERTAINTY_WEIGHTS: Record<LeadCertaintySignal, number> = {
  vin: 30,
  oemReference: 20,
  partPhoto: 15,
  registrationPhoto: 15,
  partName: 10,
  vehicleManual: 10,
  partCategory: 5,
  energyType: 5,
}

export interface CertaintyLevelSpec {
  key: LeadCertaintyLevel
  /** Score minimal (inclus) pour atteindre ce niveau. */
  min: number
  label: string
  body: string
  /** Intention visuelle — mappée sur les tokens côté web. */
  tone: 'warn' | 'mid' | 'ok'
}

/** Triés du niveau le plus exigeant au plus permissif — le dernier (LOW) sert de repli. */
export const CERTAINTY_LEVELS: [CertaintyLevelSpec, CertaintyLevelSpec, CertaintyLevelSpec] = [
  {
    key: 'HIGH',
    min: 70,
    label: 'Identification suffisante',
    body: 'Nous pouvons confirmer la référence exacte et vous adresser un devis ferme.',
    tone: 'ok',
  },
  {
    key: 'MEDIUM',
    min: 40,
    label: 'Estimation affinée',
    body: 'Il nous manque encore un élément pour verrouiller la référence constructeur.',
    tone: 'mid',
  },
  {
    key: 'LOW',
    min: 0,
    label: 'Estimation indicative',
    body: 'Sans VIN ni carte grise, nous ne pouvons pas confirmer la référence exacte.',
    tone: 'warn',
  },
]

export type LeadCertaintySignals = Partial<Record<LeadCertaintySignal, boolean>>

/**
 * Le VIN et la saisie manuelle du véhicule répondent à la même question — on
 * prend le maximum des deux, jamais la somme. En revanche la photo de carte
 * grise s'ajoute au VIN : elle prouve que ce VIN est bien celui de ce véhicule.
 */
export function computeCertainty(signals: LeadCertaintySignals): {
  score: number
  level: LeadCertaintyLevel
} {
  const has = (s: LeadCertaintySignal) => signals[s] === true

  const vehicleIdentity = Math.max(
    has('vin') ? CERTAINTY_WEIGHTS.vin : 0,
    has('vehicleManual') ? CERTAINTY_WEIGHTS.vehicleManual : 0,
  )

  const additive: LeadCertaintySignal[] = [
    'oemReference',
    'partPhoto',
    'registrationPhoto',
    'partName',
    'partCategory',
    'energyType',
  ]

  const raw =
    vehicleIdentity +
    additive.reduce((sum, s) => sum + (has(s) ? CERTAINTY_WEIGHTS[s] : 0), 0)

  const score = Math.max(0, Math.min(100, raw))
  const level = (CERTAINTY_LEVELS.find((l) => score >= l.min) ?? CERTAINTY_LEVELS[2]).key

  return { score, level }
}

export function certaintyLevelSpec(level: LeadCertaintyLevel): CertaintyLevelSpec {
  return CERTAINTY_LEVELS.find((l) => l.key === level) ?? CERTAINTY_LEVELS[2]
}

/** Libellés de l'incitation « prochaine meilleure action ». */
export const CERTAINTY_SIGNAL_LABEL: Record<LeadCertaintySignal, string> = {
  vin: 'renseignez le code VIN (17 caractères)',
  oemReference: 'ajoutez la référence OEM gravée sur la pièce',
  partPhoto: 'ajoutez une photo de la pièce',
  registrationPhoto: 'ajoutez une photo de la carte grise',
  partName: 'nommez la pièce recherchée',
  vehicleManual: 'précisez la marque, le modèle et l\'année',
  partCategory: 'choisissez la catégorie de la pièce',
  energyType: 'précisez la motorisation (thermique / électrique / hybride)',
}

/**
 * Signal manquant au plus fort poids — le ressort d'incitation de la jauge.
 * Retourne `null` quand tout ce qui compte est déjà renseigné.
 */
export function nextBestSignal(
  signals: LeadCertaintySignals,
): { signal: LeadCertaintySignal; gain: number; label: string } | null {
  const { score } = computeCertainty(signals)

  const candidates = (Object.keys(CERTAINTY_WEIGHTS) as LeadCertaintySignal[])
    .filter((s) => signals[s] !== true)
    .map((s) => ({
      signal: s,
      gain: computeCertainty({ ...signals, [s]: true }).score - score,
      label: CERTAINTY_SIGNAL_LABEL[s],
    }))
    .filter((c) => c.gain > 0)
    .sort((a, b) => b.gain - a.gain)

  return candidates[0] ?? null
}
