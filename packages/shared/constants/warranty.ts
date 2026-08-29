// Garantie vendeur sur une pièce. Le vendeur choisit la durée ET l'unité
// (jours / semaines / mois). On conserve l'unité exacte choisie pour
// l'affichage, et on convertit en jours pour le scoring et la comparaison.

export type WarrantyUnit = 'DAY' | 'WEEK' | 'MONTH'

export const WARRANTY_UNITS: { value: WarrantyUnit; label: string }[] = [
  { value: 'DAY', label: 'Jours' },
  { value: 'WEEK', label: 'Semaines' },
  { value: 'MONTH', label: 'Mois' },
]

// Conversion approximative en jours — suffisante pour comparer des offres
// entre elles (1 mois ≈ 30 jours, 1 semaine = 7 jours).
const DAYS_PER_UNIT: Record<WarrantyUnit, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
}

export function isWarrantyUnit(value: unknown): value is WarrantyUnit {
  return value === 'DAY' || value === 'WEEK' || value === 'MONTH'
}

/**
 * Normalise une garantie en jours pour le scoring / la comparaison.
 * Retourne 0 si la valeur ou l'unité manque (= sans garantie).
 */
export function warrantyToDays(
  value: number | null | undefined,
  unit: WarrantyUnit | null | undefined,
): number {
  if (!value || value <= 0 || !unit) return 0
  return value * DAYS_PER_UNIT[unit]
}

/**
 * Libellé d'affichage de la garantie, ex. « 15 jours », « 3 semaines »,
 * « 6 mois ». Retourne null si pas de garantie (à afficher en fallback).
 */
export function formatWarranty(
  value: number | null | undefined,
  unit: WarrantyUnit | null | undefined,
): string | null {
  if (!value || value <= 0 || !unit) return null
  const plural = value > 1
  switch (unit) {
    case 'DAY':
      return `${value} jour${plural ? 's' : ''}`
    case 'WEEK':
      return `${value} semaine${plural ? 's' : ''}`
    case 'MONTH':
      return `${value} mois`
  }
}

// ————————————————————————————————————————————————————————————————
// Garantie commerciale : ce que le vendeur décide, et ce qu'il doit quand même
// ————————————————————————————————————————————————————————————————
//
// Depuis le contrat v1.2, la garantie n'est plus un standard imposé par la
// plateforme : le vendeur la fixe pièce par pièce, sur TOUTE pièce sans
// exception, et peut ne rien accorder. Le seul garde-fou est le socle de
// reprise ci-dessous, dû sur chaque vente, garantie ou non.

/**
 * Socle de reprise (contrat v1.2, article 7) — applicable même sans garantie.
 * Source unique du texte affiché au vendeur comme à l'acheteur.
 */
export const RETURN_POLICY = {
  title: 'Reprise garantie, même sans garantie commerciale',
  short: 'Reprise si la livraison échoue, si vous refusez à la livraison, ou sous 48 h en cas de non-conformité.',
  points: [
    'La livraison n’a pas pu être effectuée.',
    'Vous refusez la pièce à la livraison : elle ne correspond pas à l’annonce.',
    'Non-conformité à l’annonce signalée dans les 48 h suivant la livraison.',
  ],
} as const

/**
 * Libellé de garantie destiné à l'acheteur. Une pièce sans garantie ne dit
 * plus « Garantie : 7J » par défaut — elle dit ce qu'il en est vraiment.
 */
export function warrantyLabel(
  value: number | null | undefined,
  unit: WarrantyUnit | null | undefined,
): { text: string; hasWarranty: boolean } {
  const formatted = formatWarranty(value, unit)
  return formatted
    ? { text: `Garantie ${formatted}`, hasWarranty: true }
    : { text: 'Sans garantie commerciale', hasWarranty: false }
}

/**
 * Garantie réellement enregistrable pour une pièce.
 *
 * Normalisation serveur : une garantie nulle, négative ou sans unité devient
 * `null` plutôt qu'un zéro trompeur. Aucune famille de pièces n'est exclue —
 * le vendeur décide sur toutes.
 */
export function resolveWarranty(input: {
  warrantyValue?: number | null
  warrantyUnit?: WarrantyUnit | null
}): { warrantyValue: number | null; warrantyUnit: WarrantyUnit | null } {
  const { warrantyValue, warrantyUnit } = input
  if (!warrantyValue || warrantyValue <= 0 || !warrantyUnit) {
    return { warrantyValue: null, warrantyUnit: null }
  }
  return { warrantyValue, warrantyUnit }
}
