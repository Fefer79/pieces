'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'
import type { ArbitrageResult } from 'shared/constants'

export { fmtFcfa }
export type { ArbitrageResult }

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

async function adminApi<T>(base: string, path: string, init?: RequestInit): Promise<Result<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/${base}${path}`, {
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

/** Client des API sourcing et expéditions. Même contrat que stockFetch : union
 * discriminée, jamais d'exception. */
export const sourcingFetch = <T = unknown>(path: string, init?: RequestInit) =>
  adminApi<T>('sourcing', path, init)

export const shipmentFetch = <T = unknown>(path: string, init?: RequestInit) =>
  adminApi<T>('shipments', path, init)

// ---------------------------------------------------------------------------
// Types en miroir du contrat API
// (apps/api/src/modules/sourcing/ — ne pas deviner, y faire référence)
// ---------------------------------------------------------------------------

export type SourcingOrigin = 'MANUAL' | 'AGENT'
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
export type PartConditionCode = 'NEW' | 'USED' | 'REFURBISHED'
export type PartSourceCode = 'OEM' | 'AFTERMARKET' | 'COMPATIBLE'
export type SourcingMode = 'LOCAL' | 'AIR_NOW' | 'AIR_STANDARD' | 'AIR_ECONOMY' | 'SEA_LCL'

export interface SourcingOffer {
  id: string
  searchId: string
  origin: SourcingOrigin
  url: string
  sourceSite: string
  supplierName: string | null
  channel: SourcingChannel
  country: string | null
  city: string | null
  title: string | null
  brand: string | null
  oemReference: string | null
  condition: PartConditionCode | null
  source: PartSourceCode | null
  priceAmount: number | null
  priceCurrency: string
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
  confidence: number | null
  status: SourcingOfferStatus
  opsNote: string | null
  chosenMode: SourcingMode | null
  purchaseOrderId: string | null
  createdAt: string
  updatedAt: string
}

export interface SourcingSearch {
  id: string
  origin: SourcingOrigin
  status: SourcingSearchStatus
  quoteRequestId: string | null
  partRequestId: string | null
  partName: string
  oemReference: string | null
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  quantity: number
  createdAt: string
  updatedAt: string
}

export interface SourcingSearchRow extends SourcingSearch {
  quoteRequest: { id: string; reference: string; status: string } | null
  _count: { offers: number }
}

export interface SourcingSearchDetail extends SourcingSearch {
  offers: SourcingOffer[]
  quoteRequest: {
    id: string
    reference: string
    status: string
    contactName: string
    phone: string
    whatsapp: string | null
  } | null
}

/**
 * Le type de la matrice vient de `shared/constants` : c'est exactement ce que
 * renvoie `computeArbitrageMatrix()` côté API, et c'est ce qu'attend
 * `components/logistique/arbitrage-table.tsx`. Le redéclarer ici le ferait
 * diverger du moteur.
 */
export interface OfferMatrix {
  result: ArbitrageResult
  offerIdByMode: Record<string, string>
  ignoredOffers: { id: string; reason: string }[]
  allPricesConfirmed: boolean
  pricedCount: number
}

export type ShipmentStatusCode =
  | 'SOURCING'
  | 'COLLECTED'
  | 'IN_TRANSIT'
  | 'CUSTOMS'
  | 'LOCAL_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'

export type ShipmentCarrierCode =
  | 'DHL'
  | 'FEDEX'
  | 'UPS'
  | 'TRANSITAIRE'
  | 'AIR_CARGO'
  | 'SEA_LCL'
  | 'POSTAL'
  | 'OTHER'

export interface Shipment {
  id: string
  reference: string
  purchaseOrderId: string | null
  quoteRequestId: string | null
  carrier: ShipmentCarrierCode
  carrierOther: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  mode: string
  status: ShipmentStatusCode
  originCountry: string | null
  originCity: string | null
  departedAt: string | null
  etaAt: string | null
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
}

export interface ShipmentEvent {
  id: string
  fromStatus: ShipmentStatusCode | null
  toStatus: ShipmentStatusCode | null
  label: string
  location: string | null
  occurredAt: string
  note: string | null
}

export interface ShipmentRow extends Shipment {
  purchaseOrder: { id: string; numero: string } | null
  quoteRequest: { id: string; reference: string; partName: string } | null
}

export interface ShipmentDetail extends Shipment {
  events: ShipmentEvent[]
  purchaseOrder: {
    id: string
    numero: string
    statut: string
    supplier: { id: string; nom: string } | null
  } | null
  quoteRequest: {
    id: string
    reference: string
    partName: string
    contactName: string
    phone: string
    whatsapp: string | null
  } | null
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
  MANUFACTURER: 'Constructeur',
  LOCAL: 'Vendeur local',
}

export const MODE_LABELS: Record<SourcingMode, string> = {
  LOCAL: 'Achat local',
  AIR_NOW: 'Aérien express',
  AIR_STANDARD: 'Aérien standard',
  AIR_ECONOMY: 'Aérien économique',
  SEA_LCL: 'Maritime groupé',
}

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatusCode, string> = {
  SOURCING: 'Approvisionnement',
  COLLECTED: 'Colis récupéré',
  IN_TRANSIT: 'En transit',
  CUSTOMS: 'Dédouanement',
  LOCAL_DELIVERY: 'Livraison Abidjan',
  DELIVERED: 'Livré',
  CANCELLED: 'Annulé',
}

export const CARRIER_LABELS: Record<ShipmentCarrierCode, string> = {
  DHL: 'DHL Express',
  FEDEX: 'FedEx',
  UPS: 'UPS',
  TRANSITAIRE: 'Transitaire partenaire',
  AIR_CARGO: 'Fret aérien (cargo)',
  SEA_LCL: 'Maritime groupé (LCL)',
  POSTAL: 'Postal',
  OTHER: 'Autre',
}

/** Étapes suivantes autorisées — miroir de SHIPMENT_TRANSITIONS côté API. */
export const SHIPMENT_TRANSITIONS: Record<ShipmentStatusCode, ShipmentStatusCode[]> = {
  SOURCING: ['COLLECTED', 'CANCELLED'],
  COLLECTED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['CUSTOMS', 'LOCAL_DELIVERY', 'CANCELLED'],
  CUSTOMS: ['LOCAL_DELIVERY', 'CANCELLED'],
  LOCAL_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

export const CURRENCIES = ['XOF', 'EUR', 'USD', 'AED', 'CNY', 'TRY', 'GBP', 'MAD'] as const

/**
 * Une offre est exploitable dès qu'elle a un prix converti et un pays : sans
 * eux la matrice ne peut ni la chiffrer, ni choisir son mode. On le signale
 * dans le tableau plutôt que de la faire disparaître.
 */
export function offerIsComplete(o: SourcingOffer): boolean {
  return o.priceFcfa != null && !!o.country
}
