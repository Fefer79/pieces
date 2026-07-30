/**
 * Plaque canonique : majuscules, sans séparateur (« 1749-WW-CI-01 » →
 * « 1749WWCI01 »). Sert de clé de déduplication d'un parc : la même plaque
 * ressaisie ou réimportée avec une autre ponctuation ne doit pas créer un
 * second véhicule — l'abonnement flotte se facture au véhicule.
 */
export function canonicalPlate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const canonical = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return canonical === '' ? null : canonical
}
