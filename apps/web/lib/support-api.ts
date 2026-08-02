'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

// fmtFcfa est réexporté pour que les pages SAV n'aient qu'une seule source
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
 * Client de l'API « Support & SAV » (/api/v1/admin/support).
 * Même contrat que equipeFetch : union discriminée, jamais d'exception.
 */
export async function supportFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/support${path}`, {
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

// ---------------------------------------------------------------------------
// Types en miroir du contrat API /api/v1/admin/support
// (apps/api/src/modules/support/support.service.ts — ne pas deviner, y faire
// référence en cas de doute)
// ---------------------------------------------------------------------------

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_BUYER' | 'RESOLVED_SELLER' | 'CLOSED'

export type ReturnStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PICKED_UP'
  | 'INSPECTED'
  | 'REFUNDED'
  | 'REJECTED'
  | 'CANCELLED'

export type ReturnReason =
  | 'DEFECTIVE'
  | 'WRONG_PART'
  | 'NOT_AS_DESCRIBED'
  | 'NO_LONGER_NEEDED'
  | 'OTHER'

export interface SupportOverview {
  litigesOuverts: number
  litigesEnCours: number
  litigesResolus30j: number
  retoursDemandes: number
  retoursEnCours: number
  rembourses30j: number
  montantRembourse30j: number
}

export interface SupportUserRef {
  name: string | null
  phone: string | null
}

export interface SupportOrderRef {
  id: string
  status: string
  totalAmount: number
}

export interface SupportOrderItem {
  id: string
  name: string
  vendorShopName: string
  priceSnapshot: number
  quantity: number
  condition: string | null
  imageThumbUrl: string | null
}

export interface SupportOrderDetail {
  id: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  createdAt: string
  initiator: SupportUserRef
  items: SupportOrderItem[]
  escrow: { status: string; amount: number } | null
}

export interface SupportDispute {
  id: string
  orderId: string
  openedBy: string
  status: DisputeStatus
  reason: string
  evidence: string[]
  resolution: string | null
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
  order: SupportOrderRef
  opener: SupportUserRef
}

export interface SupportDisputeList {
  disputes: SupportDispute[]
  total: number
  page: number
  limit: number
}

export interface SupportDisputeDetail extends Omit<SupportDispute, 'order'> {
  order: SupportOrderDetail
}

export interface SupportReturn {
  id: string
  orderId: string
  orderItemId: string | null
  enterpriseId: string | null
  requestedById: string
  reason: ReturnReason
  description: string | null
  pickupAddress: string | null
  pickupContactName: string | null
  pickupContactPhone: string | null
  status: ReturnStatus
  refundAmount: number | null
  evidence: string[]
  requestedAt: string
  acceptedAt: string | null
  pickedUpAt: string | null
  inspectedAt: string | null
  refundedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
  resolutionNote: string | null
  updatedAt: string
  order: SupportOrderRef
  requestedBy: SupportUserRef
}

export interface SupportReturnList {
  returns: SupportReturn[]
  total: number
  page: number
  limit: number
}

export interface SupportReturnDetail extends Omit<SupportReturn, 'order'> {
  order: SupportOrderDetail
}
