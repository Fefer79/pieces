'use client'

import { createClient } from '@/lib/supabase'

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function getToken() {
  const { data: { session } } = await getSupabase().auth.getSession()
  return session?.access_token ?? null
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
  if (!(init?.body instanceof FormData) && !headers['Content-Type']) {
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
}

export type EnterpriseMember = {
  id: string
  role: 'OWNER' | 'MANAGER' | 'MECHANIC' | 'ACCOUNTANT'
  invitedAt: string | null
  joinedAt: string | null
  user: { id: string; name: string | null; phone: string | null; email: string | null }
}
