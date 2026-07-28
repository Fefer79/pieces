'use client'

// Sources du wizard de cotation. Chargées côté client quand le contexte (session,
// flotte) les rend disponibles, et passées via la prop `context` du wizard.

export interface FleetVehicle {
  id: string
  brand: string
  model: string
  year: number
  vin: string | null
  energyType: 'ICE' | 'EV' | 'HYBRID' | null
}

export interface FleetSummary {
  id: string
  name: string
  commune: string | null
  address: string | null
}

export interface AccountSummary {
  name: string | null
  phone: string | null
  email: string | null
}

export type DevisMode = 'PUBLIC' | 'ACCOUNT' | 'FLEET'

export interface DevisContext {
  mode: DevisMode
  /** Compte simple connecté (mode ACCOUNT). */
  user?: AccountSummary | null
  /** Flotte active (mode FLEET). */
  enterprise?: FleetSummary | null
  /** Véhicules de la flotte (mode FLEET). */
  vehicles?: FleetVehicle[]
  /** Demande de pièce d'origine — quand la cotation prolonge une PartRequest. */
  fromRequest?: {
    id: string
    partName: string
    partCategory?: string | null
    oemReference?: string | null
    vehicleId?: string | null
  } | null
}
