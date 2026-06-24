/**
 * Les 13 communes du District Autonome d'Abidjan
 */
export const ABIDJAN_COMMUNES = [
  'Abobo',
  'Adjamé',
  'Anyama',
  'Attécoubé',
  'Bingerville',
  'Cocody',
  'Koumassi',
  'Marcory',
  'Plateau',
  'Port-Bouët',
  'Songon',
  'Treichville',
  'Yopougon',
] as const

export type AbidjanCommune = (typeof ABIDJAN_COMMUNES)[number]

/**
 * Frais de livraison estimés (FCFA) par commune d'Abidjan.
 * Zones : centre/proche 1 500 F, intermédiaire 2 000 F, périphérie 2 500 F.
 */
export const ABIDJAN_DELIVERY_FEES: Record<AbidjanCommune, number> = {
  Plateau: 1500,
  Adjamé: 1500,
  Treichville: 1500,
  Marcory: 1500,
  Cocody: 1500,
  Attécoubé: 1500,
  Yopougon: 2000,
  Abobo: 2000,
  Koumassi: 2000,
  'Port-Bouët': 2000,
  Bingerville: 2500,
  Anyama: 2500,
  Songon: 2500,
}
