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
