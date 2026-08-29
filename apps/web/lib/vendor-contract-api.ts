'use client'

// Accès aux contrats d'adhésion vendeur, partagé par les deux publics qui les
// font signer sur le terrain : la LIAISON (espace /liaison) et le commercial
// (back-office /admin, capacité crm:read). Aucune validation d'administrateur
// n'entre dans la boucle : le lien est émis et signable dans la foulée de
// l'onboarding, avant même qu'une pièce soit saisie.

import { createClient } from '@/lib/supabase'

export type VendorContractStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED'

export interface VendorContractSummary {
  id: string
  token: string
  url: string
  contractVersion: string
  status: VendorContractStatus
  vendorId: string | null
  sellerName: string
  shopName: string | null
  phone: string | null
  signedName: string | null
  signedAt: string | null
  createdAt: string
}

export interface CreateVendorContractPayload {
  sellerName: string
  shopName?: string
  phone?: string
  vendorId?: string
}

type Result<T> = { ok: true; data: T } | { ok: false; message: string }

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

async function contractFetch<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  const {
    data: { session },
  } = await getSupabase().auth.getSession()
  const token = session?.access_token
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/vendor-contracts${path}`, {
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

export function listVendorContracts(vendorId?: string) {
  const qs = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : ''
  return contractFetch<VendorContractSummary[]>(`/${qs}`)
}

export function createVendorContract(payload: CreateVendorContractPayload) {
  return contractFetch<VendorContractSummary>('/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

/** PDF public — partageable tel quel via WhatsApp. */
export function contractPdfUrl(token: string): string {
  return `/api/v1/vendor-contracts/${token}/pdf`
}

/** Lien wa.me pré-rempli pour envoyer le contrat au vendeur. */
export function contractWhatsAppUrl(contract: VendorContractSummary, phone?: string | null): string {
  const digits = (phone ?? contract.phone ?? '').replace(/[^\d]/g, '')
  const text = encodeURIComponent(
    `Bonjour ${contract.sellerName}, voici votre contrat d'adhésion vendeur Pièces à lire et signer en ligne : ${contract.url}`,
  )
  return `https://wa.me/${digits}?text=${text}`
}
