/**
 * Marques, modèles, années et motorisations automobiles
 * Données complètes : USA, Europe, Asie (1995–2026)
 */
import vehiclesData from './vehicles-data'

type VehiclesData = Record<string, { models: Record<string, { years: number[]; engines: string[] }> }>

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

/** Get engines for a specific brand + model */
export function getEngines(brand: string, model: string): string[] {
  return data[brand]?.models[model]?.engines ?? []
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
