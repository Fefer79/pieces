'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

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

/**
 * Client des API Sourcing (/api/v1/admin/sourcing) et Expéditions
 * (/api/v1/admin/shipments). Même contrat que stockFetch : union discriminée,
 * jamais d'exception.
 */
async function adminFetchAt<T>(
  base: string,
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
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
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}

export const sourcingFetch = <T = unknown>(path: string, init?: RequestInit) =>
  adminFetchAt<T>('/api/v1/admin/sourcing', path, init)

export const shipmentFetch = <T = unknown>(path: string, init?: RequestInit) =>
  adminFetchAt<T>('/api/v1/admin/shipments', path, init)

// ---------------------------------------------------------------------------
// Types en miroir du contrat API
// (apps/api/src/modules/sourcing/*.service.ts — y faire référence en cas de doute)
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
export type LogisticsMode =
  | 'PRE_POSITIONED'
  | 'LOCAL'
  | 'AIR_NOW'
  | 'AIR_STANDARD'
  | 'AIR_ECONOMY'
  | 'SEA_LCL'

export const SEARCH_STATUS_LABEL: Record<SourcingSearchStatus, string> = {
  PENDING: 'En attente',
  RUNNING: 'Recherche en cours',
  DONE: 'Terminée',
  FAILED: 'Échec',
}

export const OFFER_STATUS_LABEL: Record<SourcingOfferStatus, string> = {
  CANDIDATE: 'Candidate',
  SHORTLISTED: 'Retenue',
  CONTACTED: 'Contactée',
  REJECTED: 'Écartée',
  ORDERED: 'Commandée',
}

export const CHANNEL_LABEL: Record<SourcingChannel, string> = {
  MARKETPLACE_INTL: 'Marketplace internationale',
  DISTRIBUTOR_REGIONAL: 'Distributeur régional',
  EXPORTER: 'Exportateur',
  MANUFACTURER: 'Fabricant',
  LOCAL: 'Vendeur local',
}

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
  chosenMode: LogisticsMode | null
  purchaseOrderId: string | null
}

export interface SourcingSearchRow {
  id: string
  partName: string
  oemReference: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  quantity: number
  status: SourcingSearchStatus
  error: string | null
  createdAt: string
  finishedAt: string | null
  quoteRequest: { id: string; reference: string } | null
  _count: { offers: number }
}

export interface SourcingSearchDetail extends Omit<SourcingSearchRow, '_count' | 'quoteRequest'> {
  offers: SourcingOffer[]
  quoteRequest: {
    id: string
    reference: string
    status: string
    contactName: string
    phone: string
    whatsapp: string | null
    downtimeCostPerDay: number | null
    vehicleImmobilized: boolean
  } | null
  createdBy: { id: string; name: string | null } | null
}

export interface ArbitrageOptionView {
  mode: LogisticsMode
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
}

export interface OfferMatrix {
  searchId: string
  partName: string
  quantity: number
  familyId: string
  familyLabel: string
  weightKg: number
  volumeDm3: number
  confidence: string
  downtimeCostPerDay: number
  pricesUnconfirmed: boolean
  rows: {
    offerId: string
    supplierName: string
    country: string | null
    url: string | null
    condition: 'NEW' | 'USED' | 'REFURBISHED' | null
    conditionLabel: string | null
    priceConfirmed: boolean
    option: ArbitrageOptionView
  }[]
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
  mode: LogisticsMode
  originCountry: string | null
  originCity: string | null
  etaAt: string | null
  departedAt: string | null
  deliveredAt: string | null
  weightKg: number | null
  volumeDm3: number | null
  chargeableWeightKg: number | null
  freightCostFcfa: number | null
  customsCostFcfa: number | null
  lastMileCostFcfa: number | null
  totalCostFcfa: number | null
  notes: string | null
  createdAt: string
  purchaseOrder: { id: string; numero: string } | null
  quoteRequest: { id: string; reference: string } | null
  _count?: { events: number }
}

export interface ShipmentDetail extends Omit<ShipmentRow, 'purchaseOrder' | '_count'> {
  events: ShipmentEventRow[]
  purchaseOrder: {
    id: string
    numero: string
    statut: string
    supplier: { id: string; nom: string } | null
  } | null
  /** Présent uniquement dans la réponse de création. */
  publicToken?: string
}
