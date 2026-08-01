'use client'

import { createClient } from '@/lib/supabase'
import { adminFetch } from '@/lib/admin-api'

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

export async function crmFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/admin/crm${path}`, {
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
// Types en miroir du contrat API /api/v1/admin/crm
// ---------------------------------------------------------------------------

export type CrmSubject = 'USER' | 'VENDOR'

export type CrmInteractionType = 'NOTE' | 'APPEL' | 'WHATSAPP' | 'VISITE' | 'EMAIL' | 'RELANCE'

export type CrmTaskStatus = 'A_FAIRE' | 'FAIT' | 'ANNULE'

export interface CrmOverview {
  tachesDuJour: number
  tachesEnRetard: number
  interactions7j: number
  relances7j: number
  segmentsClients: Record<string, number>
}

export interface CrmTimelineEntry {
  at: string
  kind: string
  titre: string
  detail?: string | null
  refId?: string
  type?: CrmInteractionType
  meta?: unknown
  auteur?: string | null
}

export interface CrmTimeline {
  entries: CrmTimelineEntry[]
  total: number
  limit: number
  offset: number
}

export interface CrmInteraction {
  id: string
  subject: CrmSubject
  subjectId: string
  type: CrmInteractionType
  details: string | null
  createdAt: string
  author: { id: string; name: string | null }
}

export interface CrmTask {
  id: string
  titre: string
  notes: string | null
  subject: CrmSubject
  subjectId: string
  statut: CrmTaskStatus
  echeanceLe: string | null
  rappelEnvoyeAt: string | null
  faitAt: string | null
  assigneeId: string | null
  assignee: { id: string; name: string | null } | null
  createdById: string
  createdAt: string
  updatedAt: string
  subjectLabel: string | null
}

export interface CrmTaskList {
  tasks: CrmTask[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export interface CrmTag {
  id: string
  nom: string
  couleur: string | null
  _count?: { assignments: number }
}

export interface CrmRelanceResult {
  sent: boolean
  channel: 'baileys' | 'cloud' | null
}

// ---------------------------------------------------------------------------
// Équipe Pièces (assignation des tâches : ADMIN + LIAISON)
// ---------------------------------------------------------------------------

export interface TeamMember {
  id: string
  label: string
}

interface LiaisonRow {
  id: string
  name: string | null
  phone: string | null
}

interface AdminUsersList {
  users: { id: string; name: string | null; phone: string | null }[]
}

/**
 * Charge les membres assignables (rôles ADMIN et LIAISON — l'API refuse tout
 * autre assigné). Fusionne /admin/liaisons et la liste admin filtrée
 * role=ADMIN, dédupliquée par id. En cas d'échec réseau, retourne une liste
 * vide : le select reste simplement sans options (le champ est optionnel).
 */
export async function loadTeamMembers(): Promise<TeamMember[]> {
  const members = new Map<string, TeamMember>()
  try {
    const [liaisons, admins] = await Promise.all([
      adminFetch<LiaisonRow[]>('/admin/liaisons'),
      adminFetch<AdminUsersList>('/admin/clients/list?role=ADMIN&limit=200'),
    ])
    for (const u of [...liaisons, ...admins.users]) {
      if (!members.has(u.id)) {
        members.set(u.id, { id: u.id, label: u.name ?? u.phone ?? u.id })
      }
    }
  } catch {
    // Sélecteur dégradé : pas de blocage du formulaire.
  }
  return [...members.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'))
}
