/**
 * Catégories de pièces automobiles pour la navigation catalogue
 */
export const PART_CATEGORIES = [
  'Freinage',
  'Filtration',
  'Suspension',
  'Embrayage',
  'Distribution',
  'Allumage',
  'Éclairage',
  'Refroidissement',
  'Échappement',
  'Direction',
  'Transmission',
  'Carrosserie',
  'Électrique',
  'Moteur',
  'Accessoires',
] as const

export type PartCategory = (typeof PART_CATEGORIES)[number]
