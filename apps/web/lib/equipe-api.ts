'use client'

import { createClient } from '@/lib/supabase'
import { fmtFcfa } from '@/lib/admin-api'
import type { StaffRoleKey, BusinessUnitKey } from 'shared/constants'

// fmtFcfa est réexporté pour que les pages équipe n'aient qu'une seule source
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
 * Client de l'API ERP « Équipe & commissions » (/api/v1/admin/equipe).
 * Même contrat que stockFetch : union discriminée, jamais d'exception.
 */
export async function equipeFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/equipe${path}`, {
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
// Types en miroir du contrat API /api/v1/admin/equipe
// (apps/api/src/modules/equipe/equipe.service.ts — ne pas deviner, y faire
// référence en cas de doute)
// ---------------------------------------------------------------------------

export interface EquipeOverview {
  periode: string
  membresActifs: number
  commissionsDues: { count: number; montantFcfa: number }
  commissionsPayeesAnnee: { count: number; montantFcfa: number }
  objectifsSous50: number
  miMois: boolean
  activites7j: number
}

export interface TeamMemberProfile {
  id: string
  userId: string
  fonction: string | null
  /** Rôle métier : ce qui débloque les sections du back-office. */
  staffRole: StaffRoleKey | null
  businessUnits: BusinessUnitKey[]
  tauxCommissionPct: number
  actif: boolean
  embaucheLe: string | null
  createdAt: string
  updatedAt: string
}

export interface MemberCommissionMois {
  periode: string
  baseFcfa: number
  tauxPct: number
  montantFcfa: number
}

export interface EquipeMember {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  createdAt: string
  profil: TeamMemberProfile | null
  vendeursGeres: number
  activite7j: number
  tachesEnRetard: number
  commissionMois: MemberCommissionMois
  objectifsMois: { atteints: number; total: number }
}

export interface EquipeMemberList {
  members: EquipeMember[]
  total: number
  page: number
  limit: number
}

export type AgentObjectiveMetric =
  | 'VENDEURS_GERES'
  | 'NOUVEAUX_VENDEURS'
  | 'PROSPECTS_CONCLUS'
  | 'PIECES_AJOUTEES'
  | 'INTERACTIONS_CRM'
  | 'TACHES_FAITES'
  | 'VISITES_TERRAIN'

export interface AgentObjective {
  id: string
  agentId: string
  periode: string
  metrique: AgentObjectiveMetric
  cible: number
  progression: number
  createdAt: string
  updatedAt: string
}

export type AgentCommissionStatus = 'ESTIMEE' | 'DUE' | 'PAYEE' | 'ANNULEE'

export interface AgentCommission {
  id: string
  agentId: string
  periode: string
  baseFcfa: number
  tauxPct: number
  montantFcfa: number
  statut: AgentCommissionStatus
  paidAt: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  agent?: { id: string; name: string | null; phone: string | null }
}

export interface AgentCommissionList {
  commissions: AgentCommission[]
  total: number
  page: number
  limit: number
}

export interface GenerateCommissionsResult {
  periode: string
  creees: number
  misesAJour: number
  sautees: number
  profilsActifs: number
}

export interface MemberVendor {
  id: string
  shopName: string
  commune: string | null
  status: string
  commissionsMoisFcfa: number
}

export interface MemberActivityItem {
  kind: 'action' | 'interaction'
  id: string
  label: string
  cible: string
  createdAt: string
}

export interface MemberDetail {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  createdAt: string
  teamProfile: TeamMemberProfile | null
  vendeursGeres: MemberVendor[]
  objectifs: AgentObjective[]
  commissions: AgentCommission[]
  activite: MemberActivityItem[]
}
