'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

// Réexporté pour que les pages sourcing n'aient qu'une source d'imports
// utilitaires (même convention que lib/stock-api.ts).
export { fmtFcfa }

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function getToken() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  return session?.access_token ?? null
}

type Result<T> = { ok: true; data: T } | { ok: false; message: string }

async function adminFetchAt<T>(base: string, path: string, init?: RequestInit): Promise<Result<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  return { ok: true, data: body.data as T }
}

/** Client du module ERP « Sourcing » (/api/v1/admin/sourcing). */
export function sourcingFetch<T = unknown>(path: string, init?: RequestInit) {
  return adminFetchAt<T>('/api/v1/admin/sourcing', path, init)
}

/** Client du module « Expéditions » (/api/v1/admin/shipments). */
export function shipmentFetch<T = unknown>(path: string, init?: RequestInit) {
  return adminFetchAt<T>('/api/v1/admin/shipments', path, init)
}

// ---------------------------------------------------------------------------
// Types en miroir du contrat API
// (apps/api/src/modules/sourcing/ — ne pas deviner, y faire référence en cas de doute)
// ---------------------------------------------------------------------------

export type SourcingSearchStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED'
export type SourcingOfferStatus =
  | 'CANDIDATE'
  | 'SHORTLISTED'
  | 'CONTACTED'
  | 'REJECTED'
  | 'ORDERED'
export type SourcingChannel =
  | 'MARKETPLACE_INTL'
  | 'DISTRIBUTOR_REGIONAL'
  | 'EXPORTER'
  | 'MANUFACTURER'
  | 'LOCAL'
export type ShipmentStatus =
  | 'SOURCING'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'CUSTOMS'
  | 'LOCAL_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
export type ShipmentCarrier =
  | 'DHL'
  | 'FEDEX'
  | 'UPS'
  | 'TRANSITAIRE'
  | 'AIR_CARGO'
  | 'SEA_LCL'
  | 'POSTAL'
  | 'OTHER'

export interface SourcingOffer {
  id: string
  supplierName: string
  channel: SourcingChannel
  country: string | null
  city: string | null
  url: string | null
  sourceSite: string | null
  title: string | null
  brand: string | null
  oemReference: string | null
  conditionLabel: string | null
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  priceAmount: number | null
  priceCurrency: string | null
  priceFcfa: number | null
  priceConfirmed: boolean
  shippingAmount: number | null
  moq: number | null
  leadTimeDays: number | null
  weightKg: number | null
  availability: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactWhatsapp: string | null
  confidence: number
  status: SourcingOfferStatus
  opsNote: string | null
  chosenMode: string | null
  purchaseOrderId: string | null
}

export interface SourcingSearchRow {
  id: string
  status: SourcingSearchStatus
  partName: string
  oemReference: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  quantity: number
  error: string | null
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  quoteRequest: { id: string; reference: string } | null
  _count?: { offers: number }
}

export interface SourcingSearchDetail extends Omit<SourcingSearchRow, 'quoteRequest' | '_count'> {
  offers: SourcingOffer[]
  quoteRequest: {
    id: string
    reference: string
    partName: string
    vehicleBrand: string | null
    vehicleModel: string | null
    vehicleYear: number | null
    downtimeCostPerDay: number | null
    vehicleImmobilized: boolean
  } | null
  createdBy: { id: string; name: string | null } | null
}

/** Une ligne de la matrice, enrichie de l'offre dont elle vient. */
export interface OfferMatrixOption {
  mode: string
  label: string
  detail: string
  transitDays: number
  chargeableWeightKg: number
  partPrice: number
  freightCost: number
  customsCost: number
  lastMileCost: number
  downtimeCost: number
  totalCost: number
  available: boolean
  extraCostVsBest: number
  recommended: boolean
  warnings: string[]
  offerId: string | null
  supplierName: string | null
  country: string | null
  url: string | null
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  conditionLabel: string | null
  priceConfirmed: boolean
}

export interface OfferMatrix {
  searchId: string
  downtimeCostPerDay: number
  familyId: string | null
  allPricesUnconfirmed: boolean
  unconfirmedCount: number
  matrix: { weightKg: number; familyLabel: string; confidence: string } | null
  options: OfferMatrixOption[]
}

export interface ShipmentEventRow {
  id: string
  fromStatus: ShipmentStatus | null
  toStatus: ShipmentStatus | null
  label: string
  location: string | null
  occurredAt: string
  note: string | null
}

export interface ShipmentRow {
  id: string
  reference: string
  status: ShipmentStatus
  carrier: ShipmentCarrier
  carrierOther: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  mode: string
  originCountry: string | null
  originCity: string | null
  etaAt: string | null
  departedAt: string | null
  customsClearedAt: string | null
  arrivedAt: string | null
  deliveredAt: string | null
  weightKg: number | null
  volumeDm3: number | null
  freightCostFcfa: number | null
  customsCostFcfa: number | null
  lastMileCostFcfa: number | null
  totalCostFcfa: number | null
  notes: string | null
  createdAt: string
  purchaseOrder: { id: string; numero: string } | null
  quoteRequest: { id: string; reference: string; partName: string } | null
  _count?: { events: number }
}

export interface ShipmentDetail extends ShipmentRow {
  events: ShipmentEventRow[]
  /** Renvoyé uniquement à la création — à copier tout de suite dans le lien client. */
  publicToken?: string
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Libellés
// ---------------------------------------------------------------------------

export const SEARCH_STATUS_LABELS: Record<SourcingSearchStatus, string> = {
  PENDING: 'En file',
  RUNNING: 'En cours',
  DONE: 'Terminée',
  FAILED: 'Échec',
}

export const OFFER_STATUS_LABELS: Record<SourcingOfferStatus, string> = {
  CANDIDATE: 'Candidate',
  SHORTLISTED: 'Retenue',
  CONTACTED: 'Contactée',
  REJECTED: 'Écartée',
  ORDERED: 'Commandée',
}

export const CHANNEL_LABELS: Record<SourcingChannel, string> = {
  MARKETPLACE_INTL: 'Marketplace internationale',
  DISTRIBUTOR_REGIONAL: 'Distributeur régional',
  EXPORTER: 'Exportateur',
  MANUFACTURER: 'Constructeur / équipementier',
  LOCAL: 'Local',
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  SOURCING: 'Sourcing',
  COLLECTED: 'Collectée',
  IN_TRANSIT: 'En transit',
  CUSTOMS: 'Dédouanement',
  LOCAL_DELIVERY: 'Livraison locale',
  DELIVERED: 'Livrée',
  CANCELLED: 'Annulée',
}

export const CARRIER_LABELS: Record<ShipmentCarrier, string> = {
  DHL: 'DHL Express',
  FEDEX: 'FedEx',
  UPS: 'UPS',
  TRANSITAIRE: 'Transitaire partenaire',
  AIR_CARGO: 'Fret aérien (LTA)',
  SEA_LCL: 'Maritime groupage (LCL)',
  POSTAL: 'Poste / colis suivi',
  OTHER: 'Autre',
}

export const MODE_LABELS: Record<string, string> = {
  PRE_POSITIONED: 'Stock pré-positionné',
  LOCAL: 'Achat local',
  AIR_NOW: 'Aérien express',
  AIR_STANDARD: 'Aérien standard',
  AIR_ECONOMY: 'Aérien économique',
  SEA_LCL: 'Maritime groupage',
}
