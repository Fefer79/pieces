/**
 * Spécialités mécanicien — liste fixe plutôt que texte libre, pour que les
 * chips de filtre de l'annuaire correspondent exactement à ce que les
 * mécaniciens déclarent à l'inscription. Source unique API ↔ web, même
 * discipline que ERP_CAPABILITIES_LIST/FLEET_PLANS.
 */
export const MECHANIC_SPECIALTIES = [
  'Mécanique générale',
  'Électricité auto',
  'Climatisation',
  'Carrosserie / Peinture',
  'Diagnostic électronique',
  'Freinage',
  'Boîte de vitesses',
  'Pneus / Parallélisme',
] as const

export type MechanicSpecialty = (typeof MECHANIC_SPECIALTIES)[number]
