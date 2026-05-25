import { createClient } from './supabase'

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Session expirée')
  const res = await fetch(path.startsWith('http') ? path : `/api/v1${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message ?? `Erreur ${res.status}`)
  }
  if (res.headers.get('content-type')?.includes('csv')) {
    return (await res.blob()) as unknown as T
  }
  const body = await res.json()
  return body.data as T
}

export function downloadCsv(entity: 'vendors' | 'clients' | 'orders' | 'catalog') {
  return adminFetch<Blob>(`/admin/export.csv?entity=${entity}`).then((blob) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })
}

export function fmtFcfa(n: number | null | undefined): string {
  return `${(n ?? 0).toLocaleString('fr-FR')} FCFA`
}
