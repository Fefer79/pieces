'use client'

import { createClient } from '@/lib/supabase'
import type {
  ProspectionInterviewStatusKey,
  ProspectionConsentMethodKey,
  ProspectionAnswerSource,
} from 'shared/constants'

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

export type Result<T> = { ok: true; data: T } | { ok: false; message: string }

export async function prospectionFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch(`/api/v1/prospection${path}`, {
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

/** Upload multipart de l'audio d'un entretien. Le navigateur pose le boundary. */
export async function prospectionUploadAudio(
  interviewId: string,
  blob: Blob,
  fileName = 'entretien.webm',
): Promise<Result<ProspectionInterview>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const form = new FormData()
  form.append('audio', blob, fileName)

  const res = await fetch(`/api/v1/prospection/interviews/${interviewId}/audio`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, message: body?.error?.message ?? 'Erreur serveur' }
  return { ok: true, data: body.data as ProspectionInterview }
}

/** Récupère l'audio (route protégée) sous forme d'object URL, à révoquer par l'appelant. */
export async function prospectionAudioUrl(interviewId: string): Promise<string | null> {
  const token = await getToken()
  if (!token) return null
  const res = await fetch(`/api/v1/prospection/interviews/${interviewId}/audio`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}

// --- types ----------------------------------------------------------------

export interface ProspectionAnswer {
  text: string
  source: ProspectionAnswerSource
}

export interface ProspectionInterviewListItem {
  id: string
  status: ProspectionInterviewStatusKey
  prospect: { id: string; name: string; shopName: string | null; phone: string; commune: string | null; statut: string } | null
  vendor: { id: string; shopName: string; phone: string; commune: string | null; status: string } | null
  /** Prospect saisi au vol, sans fiche CRM. */
  lead: { name: string; shopName: string | null; phone: string | null; commune: string | null } | null
  conductedBy: { id: string; name: string | null }
  createdAt: string
}

export interface ProspectionInterview extends ProspectionInterviewListItem {
  consent: {
    givenAt: string
    method: ProspectionConsentMethodKey | null
    scriptText: string | null
  } | null
  audio: { mimeType: string | null; durationSec: number | null; sizeBytes: number | null } | null
  transcript: string | null
  transcriptSource: string | null
  answers: Record<string, ProspectionAnswer>
  notes: string | null
  startedAt: string | null
  endedAt: string | null
  updatedAt: string
}

export interface ProspectionList {
  items: ProspectionInterviewListItem[]
  total: number
}
