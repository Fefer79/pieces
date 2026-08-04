import { createClient } from './supabase'
import type {
  ErpCapability,
  StaffRoleKey,
  BusinessUnitKey,
  ErpBadgeKey,
} from 'shared/constants'

// Client de la console ERP.
//
// Contrairement à `adminFetch`, qui lève, on renvoie un résultat discriminé :
// la coquille doit distinguer « session expirée » (redirection) de « pas de
// l'équipe » (écran d'accès réservé) sans inspecter des messages d'erreur.

export type ErpResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string }

export async function erpFetch<T>(path: string, init?: RequestInit): Promise<ErpResult<T>> {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return { ok: false, status: 401, message: 'Session expirée' }

  const res = await fetch(`/api/v1/erp${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      message: body?.error?.message ?? `Erreur ${res.status}`,
    }
  }
  return { ok: true, data: body.data as T }
}

// ---------------------------------------------------------------------------
// Formes de données
// ---------------------------------------------------------------------------

export interface ErpMe {
  user: { id: string; name: string | null; phone: string | null; email: string | null }
  staffId: string | null
  staffRole: StaffRoleKey | null
  businessUnits: BusinessUnitKey[]
  title: string | null
  active: boolean
  isPlatformAdmin: boolean
  capabilities: ErpCapability[]
}

export interface ErpNavCounts {
  counts: Partial<Record<ErpBadgeKey, number>>
}

export interface ErpSearchHit {
  kind: 'compte' | 'vendeur' | 'entreprise' | 'piece' | 'commande' | 'sourcing' | 'expedition'
  id: string
  label: string
  hint: string | null
  href: string
}

export interface ErpStaffMember {
  id: string
  staffRole: StaffRoleKey
  businessUnits: BusinessUnitKey[]
  title: string | null
  active: boolean
  hiredAt: string | null
  createdAt: string
  user: { id: string; name: string | null; phone: string | null; email: string | null; roles: string[] }
}

export interface ErpStaffCandidate {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
}

export interface ErpCockpit {
  totals: {
    users: number
    vendors: number
    enterprises: number
    orders: number
    activeOrders: number
    gmv: number
    commissions: number
  }
  thisMonth: { orders: number; newUsers: number }
  revenueByMonth: { month: string; gmv: number; commissions: number; orders: number }[]
  topVendors: { vendorId: string; shopName: string; commissions: number; gmv: number; orderItems: number }[]
}

export const SEARCH_KIND_LABELS: Record<ErpSearchHit['kind'], string> = {
  compte: 'Compte',
  vendeur: 'Vendeur',
  entreprise: 'Entreprise',
  piece: 'Pièce',
  commande: 'Commande',
  sourcing: 'Sourcing',
  expedition: 'Expédition',
}

export function fmtFcfa(n: number | null | undefined): string {
  return `${(n ?? 0).toLocaleString('fr-FR')} FCFA`
}

/** Montants compacts pour les tuiles : 1,2 M au lieu de 1 200 000. */
export function fmtFcfaCompact(n: number | null | undefined): string {
  const v = n ?? 0
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')} M`
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)} k`
  return String(v)
}
