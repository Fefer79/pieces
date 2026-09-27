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
 * Centre approximatif de chaque commune — sert uniquement à déduire une
 * commune par défaut depuis un point posé sur la carte (le point le plus
 * proche l'emporte). Précision de l'ordre du km, largement suffisante : la
 * commune reste modifiable manuellement et l'adresse/le pin GPS restent la
 * source de vérité pour la localisation fine.
 */
export const ABIDJAN_COMMUNE_CENTERS: Record<AbidjanCommune, { lat: number; lng: number }> = {
  Plateau: { lat: 5.32, lng: -4.0181 },
  Adjamé: { lat: 5.3599, lng: -4.0246 },
  Attécoubé: { lat: 5.3346, lng: -4.0511 },
  Abobo: { lat: 5.4172, lng: -4.0142 },
  Cocody: { lat: 5.36, lng: -3.98 },
  Yopougon: { lat: 5.3453, lng: -4.0836 },
  Koumassi: { lat: 5.2967, lng: -3.95 },
  Marcory: { lat: 5.2953, lng: -3.9836 },
  Treichville: { lat: 5.2926, lng: -4.0091 },
  'Port-Bouët': { lat: 5.2531, lng: -3.935 },
  Anyama: { lat: 5.4939, lng: -4.0511 },
  Bingerville: { lat: 5.3558, lng: -3.8917 },
  Songon: { lat: 5.2833, lng: -4.2667 },
}

/** Commune la plus proche d'un point GPS — distance euclidienne : suffisant à
 * l'échelle d'Abidjan, pas besoin d'une formule de grand cercle. */
export function nearestAbidjanCommune(lat: number, lng: number): AbidjanCommune {
  let closest: AbidjanCommune = ABIDJAN_COMMUNES[0]
  let closestDistance = Infinity
  for (const commune of ABIDJAN_COMMUNES) {
    const center = ABIDJAN_COMMUNE_CENTERS[commune]
    const distance = (center.lat - lat) ** 2 + (center.lng - lng) ** 2
    if (distance < closestDistance) {
      closestDistance = distance
      closest = commune
    }
  }
  return closest
}

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
