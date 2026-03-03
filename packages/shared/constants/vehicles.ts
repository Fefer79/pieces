/**
 * Marques, modèles, années et motorisations automobiles
 * Données complètes : USA, Europe, Asie (1995–2026)
 */
import vehiclesData from './vehicles-data.json'

type VehiclesData = Record<string, { models: Record<string, { years: number[]; engines: string[] }> }>

const data = vehiclesData as VehiclesData

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
