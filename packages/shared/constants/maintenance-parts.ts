import type { PartCategory } from './categories'

/**
 * Correspondance type d'entretien (MaintenanceSchedule.kind) → recherche
 * catalogue. Utilisé pour le bouton « Commander la pièce » sur les alertes
 * d'entretien : pré-remplit la recherche avec la pièce attendue, filtrée par
 * la catégorie et le fitment du véhicule.
 *
 * Les valeurs `q` et `category` reprennent les libellés exacts du catalogue
 * (voir PART_CATALOG dans categories.ts) pour maximiser la pertinence.
 * `null` = pas de pièce évidente (OTHER) : on ouvre la recherche sans requête.
 */
export type MaintenanceKindKey =
  | 'OIL_CHANGE'
  | 'OIL_FILTER'
  | 'AIR_FILTER'
  | 'FUEL_FILTER'
  | 'CABIN_FILTER'
  | 'BRAKE_PADS_FRONT'
  | 'BRAKE_PADS_REAR'
  | 'TIMING_BELT'
  | 'TIRES'
  | 'COOLANT'
  | 'TRANSMISSION_FLUID'
  | 'OTHER'

export interface MaintenancePartHint {
  /** Requête de recherche pré-remplie (libellé pièce catalogue) */
  q: string
  /** Catégorie catalogue pour filtrer les résultats */
  category: PartCategory
}

export const MAINTENANCE_KIND_TO_PART: Record<MaintenanceKindKey, MaintenancePartHint | null> = {
  OIL_CHANGE: { q: 'Huile moteur', category: 'Fluides & consommables' },
  OIL_FILTER: { q: 'Filtre à huile', category: 'Filtration' },
  AIR_FILTER: { q: 'Filtre à air', category: 'Filtration' },
  FUEL_FILTER: { q: 'Filtre à carburant', category: 'Filtration' },
  CABIN_FILTER: { q: "Filtre d'habitacle", category: 'Filtration' },
  BRAKE_PADS_FRONT: { q: 'Plaquettes avant', category: 'Freinage' },
  BRAKE_PADS_REAR: { q: 'Plaquettes arrière', category: 'Freinage' },
  TIMING_BELT: { q: 'Courroie de distribution', category: 'Distribution' },
  TIRES: { q: 'Pneu', category: 'Roues & pneus' },
  COOLANT: { q: 'Liquide de refroidissement', category: 'Fluides & consommables' },
  TRANSMISSION_FLUID: { q: 'Huile de boîte', category: 'Fluides & consommables' },
  OTHER: null,
}

/**
 * Construit le querystring `/search` pour commander la pièce d'un entretien
 * sur un véhicule donné. Retourne le chemin complet `/search?...`.
 */
export function buildMaintenanceSearchHref(
  kind: string,
  vehicle: { brand?: string | null; model?: string | null; year?: number | string | null },
): string {
  const params = new URLSearchParams()
  if (vehicle.brand) params.set('brand', vehicle.brand)
  if (vehicle.model) params.set('model', vehicle.model)
  if (vehicle.year != null && vehicle.year !== '') params.set('year', String(vehicle.year))
  const hint = MAINTENANCE_KIND_TO_PART[kind as MaintenanceKindKey]
  if (hint) {
    params.set('q', hint.q)
    params.set('category', hint.category)
  }
  return `/search?${params.toString()}`
}
