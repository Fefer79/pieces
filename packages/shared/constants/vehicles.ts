/**
 * Marques, modèles, années et motorisations automobiles
 * Données complètes : USA, Europe, Asie (1995–2026)
 */
import vehiclesData from './vehicles-data'

/**
 * Motorisation : libellé seul (plage inconnue) ou `[libellé, début, fin]`,
 * `fin: null` signifiant « encore produit ». La plage vient des générations
 * Global Auto — voir `pnpm -F ingest annotate:engine-years`.
 */
export type EngineEntry = string | readonly [label: string, from: number, to: number | null]

interface ModelEntry {
  years: number[]
  engines: EngineEntry[]
}

type VehiclesData = Record<string, { models: Record<string, ModelEntry> }>

const data = vehiclesData as unknown as VehiclesData

/** Full data with years + engines per model */
export const VEHICLE_DATA = data

/** Backward-compatible: brand → { models: { model → years[] } } */
export const VEHICLE_BRANDS: Record<string, { models: Record<string, number[]> }> = Object.fromEntries(
  Object.entries(data).map(([brand, { models }]) => [
    brand,
    {
      models: Object.fromEntries(
        Object.entries(models).map(([model, { years }]) => [model, years]),
      ),
    },
  ]),
)

export const BRAND_NAMES = Object.keys(VEHICLE_BRANDS)

export function engineLabel(entry: EngineEntry): string {
  return typeof entry === 'string' ? entry : entry[0]
}

function entries(brand: string, model: string): EngineEntry[] {
  return data[brand]?.models[model]?.engines ?? []
}

/** Une motorisation sans plage connue reste proposable sur tout le modèle. */
function overlaps(entry: EngineEntry, from: number, to: number): boolean {
  if (typeof entry === 'string') return true
  const [, start, end] = entry
  return start <= to && (end ?? Number.POSITIVE_INFINITY) >= from
}

/**
 * Motorisations d'un modèle, restreintes au millésime quand il est fourni.
 *
 * Filet de sécurité : si le filtre ne laisse rien (référentiel de générations
 * incomplet pour ce modèle), on renvoie la liste entière plutôt qu'un menu
 * vide — mieux vaut trop proposer que bloquer la saisie.
 */
export function getEngines(brand: string, model: string, year?: number | null): string[] {
  const all = entries(brand, model)
  if (!year) return all.map(engineLabel)
  const filtered = all.filter((e) => overlaps(e, year, year))
  return (filtered.length > 0 ? filtered : all).map(engineLabel)
}

/**
 * Variante plage : motorisations compatibles avec au moins une année de
 * l'intervalle [from, to] (bornes optionnelles), pour les saisies de fitment
 * vendeur qui couvrent plusieurs millésimes.
 */
export function getEnginesForRange(
  brand: string,
  model: string,
  from?: number | null,
  to?: number | null,
): string[] {
  const all = entries(brand, model)
  if (!from && !to) return all.map(engineLabel)
  const lo = from ?? Number.NEGATIVE_INFINITY
  const hi = to ?? Number.POSITIVE_INFINITY
  const filtered = all.filter((e) => overlaps(e, lo, hi))
  return (filtered.length > 0 ? filtered : all).map(engineLabel)
}

/**
 * Catégories de véhicules sélectionnables dans le parcours acheteur.
 * Seul VOITURE possède des données (VEHICLE_BRANDS) ; les autres sont
 * affichés « Bientôt disponible » tant que leurs marques/modèles ne sont
 * pas seedés. L'enum Prisma `BodyType` (MOTORCYCLE/TRUCK…) couvrira le
 * peuplement réel plus tard.
 */
export type VehicleTypeId = 'VOITURE' | 'MOTO' | 'CAMION' | 'ENGIN_CHANTIER'

export interface VehicleType {
  id: VehicleTypeId
  label: string
  /** clé d'icône résolue côté web */
  icon: string
  available: boolean
}

export const VEHICLE_TYPES: VehicleType[] = [
  { id: 'VOITURE', label: 'Voiture', icon: 'car', available: true },
  { id: 'MOTO', label: 'Moto', icon: 'motorcycle', available: false },
  { id: 'CAMION', label: 'Camion', icon: 'truck', available: false },
  { id: 'ENGIN_CHANTIER', label: 'Engin de chantier', icon: 'excavator', available: false },
]

export const DEFAULT_VEHICLE_TYPE: VehicleTypeId = 'VOITURE'
