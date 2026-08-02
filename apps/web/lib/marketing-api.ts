'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'

// fmtFcfa est réexporté pour que les pages marketing n'aient qu'une seule
// source d'imports utilitaires.
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
 * Client de l'API ERP « Marketing » (/api/v1/admin/marketing).
 * Même contrat qu'equipeFetch : union discriminée, jamais d'exception.
 */
export async function marketingFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/marketing${path}`, {
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
// Types en miroir du contrat API /api/v1/admin/marketing
// (apps/api/src/modules/marketing/marketing.service.ts — ne pas deviner, y
// faire référence en cas de doute)
// ---------------------------------------------------------------------------

export type CampaignStatus = 'BROUILLON' | 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE'

export type AudienceType = 'SEGMENT_CLIENT' | 'SEGMENT_VENDEUR' | 'TAG'

export interface MarketingCampaign {
  id: string
  nom: string
  message: string
  audienceType: AudienceType
  audienceValue: string
  statut: CampaignStatus
  totalCibles: number
  envoyes: number
  echecs: number
  optouts: number
  sansTelephone: number
  scheduledAt: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  createdById: string
  createdBy: { name: string | null }
}

export interface CampaignList {
  campaigns: MarketingCampaign[]
  total: number
  page: number
  limit: number
}

export interface MarketingOverview {
  total: number
  parStatut: Record<string, number>
  envoyes30j: number
}

export interface AudienceOption {
  key: string
  label: string
  count: number
}

export interface MarketingAudiences {
  segmentsClients: AudienceOption[]
  segmentsVendeurs: AudienceOption[]
  tags: { id: string; nom: string; couleur: string | null; count: number }[]
}

export interface AudiencePreview {
  total: number
  optouts: number
  sansTelephone: number
  echantillon: { nom: string | null; telephone: string | null }[]
}
