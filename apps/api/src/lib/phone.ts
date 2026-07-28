/**
 * Normalisation des numéros ivoiriens au format canonique `+225XXXXXXXXXX`.
 *
 * Implémentation unique du projet : l'import CSV de chauffeurs et le formulaire
 * public de cotation logistique doivent normaliser exactement pareil, sinon la
 * déduplication par téléphone laisse passer des doublons.
 *
 * Tolère : espaces, points, tirets, parenthèses, indicatif avec ou sans `+`,
 * et le zéro initial mangé par Excel sur un numéro à 9 chiffres.
 */
export function normalizeIvorianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null

  let digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return null

  if (digits.startsWith('+')) {
    digits = '+' + digits.slice(1).replace(/\D/g, '')
  } else if (digits.startsWith('225')) {
    digits = '+' + digits
  } else if (digits.length === 10) {
    digits = '+225' + digits // numéro local 0X……
  } else if (digits.length === 9) {
    digits = '+2250' + digits // Excel a mangé le 0 initial
  } else {
    digits = '+225' + digits
  }

  return /^\+225\d{10}$/.test(digits) ? digits : null
}
