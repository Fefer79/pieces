'use client'

import { createClient } from '@/lib/supabase'
import { getPiecesSession } from '@/lib/pieces-session'
import type { BusinessUnitKey, ErpCapability, StaffRoleKey } from 'shared/constants'

// Client HTTP de l'ERP.
//
// Convention d'erreur : union discriminée, comme `enterpriseFetch`. On ne
// reprend pas le `adminFetch` qui lève : dans un back-office dense, chaque
// tableau doit pouvoir afficher son propre message d'erreur sans qu'un throw
// non capturé fasse tomber la page entière.

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function getToken() {
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  // Fallback session WhatsApp (reverse-OTP) quand il n'y a pas de session Supabase.
  return session?.access_token ?? getPiecesSession()
}

export type FetchResult<T> = { ok: true; data: T } | { ok: false; message: string }

export async function erpFetch<T = unknown>(
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

  const res = await fetch(`/api/v1/erp${path}`, { ...init, headers })

  if (res.status === 204) return { ok: true, data: undefined as unknown as T }

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}

export async function erpDownload(path: string): Promise<Blob | null> {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(`/api/v1/erp${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.blob()
}

/** Montants FCFA : entiers, séparateur de milliers insécable, jamais de décimale. */
export function fmtFcfa(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n.toLocaleString('fr-FR')} F`
}

/** Compact pour les tuiles : 1,2 M F au-delà du million. */
export function fmtFcfaCompact(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M F`
  }
  if (Math.abs(n) >= 10_000) {
    return `${Math.round(n / 1000).toLocaleString('fr-FR')} k F`
  }
  return `${n.toLocaleString('fr-FR')} F`
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Types de charge utile ------------------------------------------------

export interface ErpMe {
  staffId: string | null
  staffRole: StaffRoleKey | null
  staffRoleLabel: string | null
  businessUnits: BusinessUnitKey[]
  title: string | null
  active: boolean
  isPlatformAdmin: boolean
  capabilities: ErpCapability[]
  user: {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    roles: string[]
  }
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface StaffRow {
  id: string
  userId: string
  staffRole: StaffRoleKey
  businessUnits: BusinessUnitKey[]
  title: string | null
  active: boolean
  hiredAt: string | null
  createdAt: string
  capabilities: ErpCapability[]
  user: {
    id: string
    name: string | null
    phone: string | null
    email: string | null
    roles: string[]
  }
}

export interface StaffCandidate {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
}

export type TaskStatusKey = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'
export type TaskPriorityKey = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'

export interface TaskRow {
  id: string
  title: string
  description: string | null
  status: TaskStatusKey
  priority: TaskPriorityKey
  dueAt: string | null
  businessUnit: BusinessUnitKey | null
  relatedType: string | null
  relatedId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  assignee: {
    id: string
    staffRole: StaffRoleKey
    user: { name: string | null; phone: string | null }
  } | null
  createdBy: { id: string; user: { name: string | null } } | null
}

export interface Cockpit {
  generatedAt: string
  businessUnit: BusinessUnitKey | null
  ventes: {
    caMois: number
    caMoisHt: number
    tvaMois: number
    facturesMois: number
    panierMoyen: number
    caMoisPrecedent: number
    evolutionPct: number | null
  }
  commandes: { actives: number; enAttentePaiement: number }
  flotte: {
    abonnementsActifs: number
    abonnementsEssai: number
    vehiculesGeres: number
    entreprises: number
  }
  logistique: { leadsOuverts: number; leadsGagnesMois: number }
  crm: { prospectsVendeurs: number; vendeursActifs: number }
  mesTaches: { open: number; overdue: number }
  repartitionMois: Array<{ businessUnit: BusinessUnitKey; ca: number }>
  serieCa: Array<{ mois: string; ca: number; caHt: number; factures: number }>
}
