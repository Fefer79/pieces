'use client'

import { createClient } from '@/lib/supabase'
import { getPiecesSession } from '@/lib/pieces-session'

let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) supabase = createClient()
  return supabase
}

export async function getMechanicAuthToken() {
  const { data: { session } } = await getSupabase().auth.getSession()
  return session?.access_token ?? getPiecesSession()
}

export async function mechanicFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getMechanicAuthToken()
  if (!token) return { ok: false, message: 'Connectez-vous pour continuer.' }

  const res = await fetch(`/api/v1/mechanics${path}`, {
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

// Comme mechanicFetch, mais utilisable sans compte (ex. avis d'un invité) —
// n'ajoute le Bearer que s'il existe, ne bloque jamais faute de token.
export async function mechanicFetchOptionalAuth<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getMechanicAuthToken()

  const res = await fetch(`/api/v1/mechanics${path}`, {
    ...init,
    headers: {
      ...(init?.body != null ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}
