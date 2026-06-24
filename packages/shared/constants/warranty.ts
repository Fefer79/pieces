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
