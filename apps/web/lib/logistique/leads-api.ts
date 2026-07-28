// Client des demandes de cotation logistique.
//
// Appelle l'API EN DIRECT (NEXT_PUBLIC_API_URL) plutôt que via le proxy
// /api/v1/* de next.config.ts, pour deux raisons :
//   1. le multipart 5 Mo traverse mal le Worker open-next ;
//   2. le proxy masquerait l'IP du visiteur, dont dépend l'anti-abus serveur.
// La liste CORS de apps/api/src/plugins/cors.ts est donc load-bearing.
//
// ⚠ Ne jamais importer @/lib/supabase ici : la vitrine ne doit pas instancier de
// client Supabase (voir lib/cookie-domain.ts). Le jeton, quand il existe, est
// passé explicitement par l'appelant.

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ''

export type LeadCertaintyLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type LeadPhotoKind = 'PART' | 'REGISTRATION_CARD' | 'OTHER'

export interface CreateLeadResponse {
  id: string
  reference: string
  uploadToken: string
  uploadTokenExpiresAt: string
  certaintyScore: number
  certaintyLevel: LeadCertaintyLevel
  downtimeCostPerDay: number
  estimate: unknown
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string }

async function parse<T>(res: Response): Promise<ApiResult<T>> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = null
  }
  if (!res.ok) {
    const message =
      (body as { error?: { message?: string } } | null)?.error?.message ??
      'Une erreur est survenue. Réessayez dans un instant.'
    return { ok: false, message }
  }
  return { ok: true, data: (body as { data: T }).data }
}

export async function createLead(
  payload: Record<string, unknown>,
  accessToken?: string | null,
): Promise<ApiResult<CreateLeadResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/logistics/quote-requests`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    })
    return parse<CreateLeadResponse>(res)
  } catch {
    return { ok: false, message: 'Connexion impossible. Vérifiez votre réseau et réessayez.' }
  }
}

export async function uploadLeadPhoto(
  leadId: string,
  file: Blob,
  kind: LeadPhotoKind,
  uploadToken: string | null,
  accessToken?: string | null,
): Promise<ApiResult<{ id: string; kind: LeadPhotoKind; position: number }>> {
  const form = new FormData()
  form.append('kind', kind)
  form.append('file', file, `${kind.toLowerCase()}.jpg`)

  try {
    const res = await fetch(`${API_BASE}/api/v1/logistics/quote-requests/${leadId}/photos`, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        ...(uploadToken ? { 'x-upload-token': uploadToken } : {}),
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: form,
    })
    return parse(res)
  } catch {
    return { ok: false, message: 'Envoi de la photo impossible.' }
  }
}

export interface VinDecodeResult {
  vin: string
  make: string | null
  model: string | null
  year: number | null
  decoded: boolean
}

export async function decodeVin(vin: string): Promise<VinDecodeResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/browse/vin-decode`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ vin }),
    })
    if (!res.ok) return null
    const body = (await res.json()) as { data: VinDecodeResult }
    return body.data
  } catch {
    return null
  }
}
