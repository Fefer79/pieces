'use client'

import { createClient } from '@/lib/supabase'
import { getPiecesSession } from '@/lib/pieces-session'

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession()
  // Fallback session WhatsApp (reverse-OTP) quand il n'y a pas de session Supabase.
  return session?.access_token ?? getPiecesSession()
}

type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string }

export async function enterpriseFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  }
  if (init?.body != null && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api/v1/enterprises${path}`, { ...init, headers })

  if (res.status === 204) return { ok: true, data: undefined as unknown as T }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}

export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<FetchResult<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> | undefined),
    Authorization: `Bearer ${token}`,
  }
  if (init?.body != null && !(init.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`/api/v1${path}`, { ...init, headers })
  if (res.status === 204) return { ok: true, data: undefined as unknown as T }
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  return { ok: true, data: body.data as T }
}

export async function enterpriseDownload(path: string): Promise<Blob | null> {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(`/api/v1/enterprises${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.blob()
}

// ---- Active enterprise (localStorage) ----------------------------------

const ACTIVE_KEY = 'pieces.activeEnterpriseId'

// Téléchargement authentifié hors périmètre /enterprises (devis PDF d'une
// commande, par exemple).
export async function apiDownload(path: string): Promise<Blob | null> {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(`/api/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.blob()
}

export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function getActiveEnterpriseId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_KEY)
}

export function setActiveEnterpriseId(id: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ACTIVE_KEY, id)
}

// ---- Types --------------------------------------------------------------

export type Enterprise = {
  id: string
  name: string
  slug: string
  commune: string | null
  address: string | null
  lat: number | null
  lng: number | null
  rccm: string | null
  createdAt: string
  memberRole?: 'OWNER' | 'MANAGER' | 'MECHANIC' | 'ACCOUNTANT'
}

export type FleetVehicle = {
  id: string
  brand: string
  model: string
  year: number
  vin: string | null
  plate: string | null
  engine: string | null
  mileage: number | null
  mileageUpdatedAt: string | null
  usageType: 'TRANSPORT' | 'CHANTIER' | 'LIVRAISON' | 'DIRECTION' | 'AUTRE' | null
  groupName: string | null
  photoUrl: string | null
  homeCenterId: string | null
  homeCenter: {
    id: string
    name: string
    commune: string | null
    deliveryDayOfWeek: number | null
  } | null
  createdAt: string
}

export type EnterpriseOrderItem = {
  id: string
  name: string
  quantity: number
  priceSnapshot: number
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  partSource: 'OEM' | 'AFTERMARKET' | 'COMPATIBLE' | null
  vendorShopName: string
}

export type EnterpriseOrder = {
  id: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  paymentMethod: string | null
  deliveryCommune: string | null
  paidAt: string | null
  createdAt: string
  vehicle: { id: string; brand: string; model: string; year: number; plate: string | null } | null
  initiator: { id: string; name: string | null; phone: string | null }
  invoice: { id: string; invoiceNumber: string } | null
  items: EnterpriseOrderItem[]
}

export type EnterpriseOrderPage = {
  orders: EnterpriseOrder[]
  total: number
  page: number
  totalPages: number
  // 'own' quand le membre est MECHANIC : il ne voit que ses propres commandes.
  scope: 'enterprise' | 'own'
}

export type MaintenanceCenter = {
  id: string
  enterpriseId: string
  name: string
  commune: string | null
  address: string | null
  lat: number | null
  lng: number | null
  contactName: string | null
  contactPhone: string | null
  deliveryDayOfWeek: number | null
  active: boolean
  notes: string | null
  vehiclesCount: number
  createdAt: string
  updatedAt: string
}

export type DashboardData = {
  vehiclesCount: number
  membersCount: number
  activeOrders: number
  monthlySpend: number
  topVehiclesByCost: {
    vehicle: { id: string; brand: string; model: string; year: number; plate: string | null } | null
    totalSpent: number
  }[]
  medianCostPerKm: number | null
  moneyPits: MoneyPit[]
}

export type MoneyPit = {
  vehicle: { id: string; brand: string; model: string; year: number; plate: string | null }
  totalSpend: number
  mileage: number
  costPerKm: number
  multipleOfMedian: number
  excessSpend: number
}

export type EnterpriseMember = {
  id: string
  role: 'OWNER' | 'MANAGER' | 'MECHANIC' | 'ACCOUNTANT'
  invitedAt: string | null
  joinedAt: string | null
  user: { id: string; name: string | null; phone: string | null; email: string | null }
}

export type PartRequest = {
  id: string
  enterpriseId: string
  vehicleId: string
  driverId: string | null
  createdByUserId: string
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'CONVERTED' | 'CANCELLED'
  description: string | null
  partName: string
  category: string | null
  oemReference: string | null
  urgency: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'
  preferredSource: 'LOCAL' | 'AIR' | 'CARGO' | 'ANY'
  maxBudget: number | null
  approvedByUserId: string | null
  approvedAt: string | null
  rejectionReason: string | null
  orderId: string | null
  createdAt: string
  updatedAt: string
  vehicle: {
    id: string
    brand: string
    model: string
    year: number
    plate: string | null
    vin: string | null
    engine: string | null
    mileage: number | null
  }
  driver: { id: string; name: string; phone: string } | null
  createdByUser: { id: string; name: string | null; phone: string | null }
  approvedByUser: { id: string; name: string | null; phone: string | null } | null
  order: { id: string; status: string; totalAmount: number; shareToken: string } | null
  photos: { id: string; url: string; position: number; createdAt: string }[]
  events: {
    id: string
    fromStatus: string | null
    toStatus: string
    actorUserId: string | null
    note: string | null
    createdAt: string
    actorUser: { id: string; name: string | null; phone: string | null } | null
  }[]
}

export type SourcingOption = {
  source: 'LOCAL' | 'AIR' | 'CARGO'
  label: string
  delay: string
  priceNote: string
  deliveryMode: 'STANDARD' | 'EXPRESS'
}

export const SOURCING_OPTIONS: SourcingOption[] = [
  { source: 'LOCAL', label: 'Stock local', delay: '24–48 h', priceNote: 'Prix catalogue', deliveryMode: 'STANDARD' },
  { source: 'AIR', label: 'Avion', delay: '3–5 jours', priceNote: '+30 à +50 % vs catalogue', deliveryMode: 'EXPRESS' },
  { source: 'CARGO', label: 'Cargo', delay: '45 jours', priceNote: 'Prix catalogue, commande groupée', deliveryMode: 'STANDARD' },
]

export type LogisticsMode =
  | 'PRE_POSITIONED'
  | 'LOCAL'
  | 'AIR_NOW'
  | 'AIR_STANDARD'
  | 'AIR_ECONOMY'
  | 'SEA_LCL'

export type ArbitrageOption = {
  mode: LogisticsMode
  label: string
  detail: string
  transitDays: number
  chargeableWeightKg: number
  partPrice: number
  freightCost: number
  customsCost: number
  /** Frais d'envoi Pièces (10 % du prix de la pièce). */
  serviceFee: number
  downtimeCost: number
  totalCost: number
  available: boolean
  extraCostVsBest: number
  recommended: boolean
  warnings: string[]
}

export type LogisticsMatrix = {
  weightKg: number
  volumeDm3: number
  familyId: string
  familyLabel: string
  confidence: 'MEASURED' | 'CATALOG' | 'FAMILY'
  downtimeCostPerDay: number
  options: ArbitrageOption[]
  vehicle: {
    id: string
    brand: string
    model: string
    year: number
    plate: string | null
    energyType: string | null
    category: 'ECONOMY_ICE' | 'PREMIUM_ICE' | 'PREMIUM_EV'
  }
  annualPartsSpend: number
  downtimeCostOverridden: boolean
}
