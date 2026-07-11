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

export interface ChampConfiance {
  valeur: string | null
  confiance: number
}

export interface EnrichmentIdentification {
  marque_fabricant: ChampConfiance
  reference_fabricant: ChampConfiance
  references_oem: Array<{ constructeur: string; reference: string; confiance: number }>
  ean: ChampConfiance
  pays_origine: ChampConfiance
  normes: string[]
  caracteristiques: Record<string, string>
}

export interface EnrichmentFitment {
  marque: string
  modele: string
  annees: string | null
  motorisation: string | null
  confiance: number
  sources: string[]
}

/** Vue commune (Liaison / vendeur). Les champs réservés à l'administration
 * sont absents de la réponse API pour ces rôles. */
export interface Enrichment {
  id: string
  partId: string | null
  origine: 'LIAISON' | 'VENDEUR'
  statut: string
  photoFeedback: string | null
  identification: EnrichmentIdentification | null
  classification: { categorie: string; sous_categorie: string | null; confiance: number } | null
  fitments: EnrichmentFitment[] | null
  confianceGlobale: number | null
  photos: string[]
  photosVariants: Array<Record<string, string | null>> | null
  prix: number | null
  stockQuantite: number | null
  warrantyValue: number | null
  warrantyUnit: string | null
  fournisseurVisite: string | null
  vendeurId: string | null
  liaisonId: string | null
  createdAt: string
  updatedAt: string
}

export interface EnrichmentAdmin extends Enrichment {
  statutBrut: 'BROUILLON' | 'EN_MODERATION' | 'A_VERIFIER' | 'VALIDE' | 'BLOQUE'
  authenticite: {
    score: number
    signaux_positifs: Array<{ signal: string; photo?: number | null }>
    signaux_negatifs: Array<{ signal: string; photo?: number | null }>
    justification: string
    verification_recommandee: boolean
  } | null
  sourcing: {
    cross_references: Array<{ type: string; marque: string; reference: string; source: string }>
    fournisseurs: Array<{ nom: string; canal: string; ville: string | null; contact_public: string | null; source: string }>
    contacts_producteur: Array<{ marque: string; entite: string; role: string; email: string | null; url: string }>
  } | null
  noteQualite: number | null
  descriptionIndependante: string | null
  livrablesApprouvesAt: string | null
  corrections: unknown
  tentatives: number
  contentValidatedAt: string | null
  validatedAt: string | null
}

export interface EnrichmentList<T = Enrichment> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type Result<T> = { ok: true; data: T } | { ok: false; message: string }

export async function enrichmentFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<Result<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  // Content-Type uniquement quand il y a un body (Fastify rejette un body vide
  // avec un Content-Type JSON).
  const res = await fetch(`/api/v1/enrichments${path}`, {
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

/** Création par photos : multipart, le navigateur pose le boundary lui-même. */
export async function enrichmentUpload<T = unknown>(formData: FormData): Promise<Result<T>> {
  const token = await getToken()
  if (!token) return { ok: false, message: 'Session expirée. Reconnectez-vous.' }

  const res = await fetch('/api/v1/enrichments', {
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

/** Libellés utilisateur des statuts de workflow (génériques hors admin). */
export const ENRICHMENT_STATUS_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_MODERATION: 'En modération',
  EN_VERIFICATION: 'En vérification',
  INSPECTION_PROGRAMMEE: 'Inspection à programmer',
  A_VERIFIER: 'Inspection demandée',
  VALIDE: 'Validée',
  BLOQUE: 'Bloquée',
}
