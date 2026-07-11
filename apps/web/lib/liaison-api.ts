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

export async function liaisonFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  // Fastify rejette un body vide si Content-Type: application/json est posé —
  // on ne l'envoie donc que lorsqu'il y a réellement un body.
  const res = await fetch(`/api/v1/liaison${path}`, {
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
 * Upload multipart (photo) vers l'API liaison. On ne fixe PAS Content-Type :
 * le navigateur pose lui-même le boundary multipart/form-data.
 */
export async function liaisonUpload<T = unknown>(
  path: string,
  formData: FormData,
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/liaison${path}`, {
    method: 'POST',
    body: formData,
    headers: { Authorization: `Bearer ${token}` },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  }
  return { ok: true, data: body.data as T }
}
