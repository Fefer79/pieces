'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

// fmtFcfa est réexporté pour que les pages finance n'aient qu'une seule source
// d'imports utilitaires.
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
 * Client de l'API ERP « Finance » (/api/v1/admin/finance).
 * Même contrat qu'equipeFetch : union discriminée, jamais d'exception.
 */
export async function financeFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/finance${path}`, {
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

/**
 * Télécharge un export CSV du module : fetch authentifié, blob, puis clic
 * programmatique sur un lien temporaire. Jamais d'exception.
 */
export async function downloadFinanceCsv(
  path: string,
  filename: string,
): Promise<{ ok: boolean; message?: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  try {
    const res = await fetch(`/api/v1/admin/finance${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { ok: true }
  } catch {
    return { ok: false, message: 'Téléchargement impossible. Réessayez.' }
  }
}

// ---------------------------------------------------------------------------
// Types en miroir du contrat API /api/v1/admin/finance
// (apps/api/src/modules/finance/finance.service.ts — ne pas deviner, y faire
// référence en cas de doute)
// ---------------------------------------------------------------------------

export interface FinanceOverview {
  periode: string
  gmv: number
  commissions: number
  fraisLivraison: number
  mainOeuvre: number
  commandes: number
  panierMoyen: number
  escrowBloque: number
  escrowLibere: number
  variation: { gmv: number | null; commissions: number | null }
}

export interface FinanceMonthlyBucket {
  periode: string
  gmv: number
  commissions: number
  orders: number
}

export interface FinanceMonthly {
  buckets: FinanceMonthlyBucket[]
}

export interface FinanceVendor {
  vendorId: string
  shopName: string
  phone: string | null
  commandes: number
  gmv: number
  commissions: number
  escrowEnCours: number
}

export interface FinanceVendorList {
  vendors: FinanceVendor[]
  total: number
  page: number
  limit: number
}
