'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface CatalogItem {
  id: string
  name: string | null
  category: string | null
  status: string
  imageThumbUrl: string | null
  suggestedPrice: number | null
  price: number | null
  qualityScore: number | null
  qualityIssue: string | null
  aiGenerated: boolean
  inStock: boolean
  priceAlertFlag: boolean
  createdAt: string
}

interface CatalogResponse {
  items: CatalogItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function VendorCatalogPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<CatalogResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchItems = useCallback(async (status?: string) => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const qs = params.toString()

      const res = await fetch(`/api/v1/catalog/items${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement du catalogue')
        setLoading(false)
        return
      }

      setData(body.data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    fetchItems(statusFilter || undefined)
  }, [fetchItems, statusFilter])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1A1A1A]">Mon Catalogue</h1>
        <button
          onClick={() => router.push('/vendors/catalog/upload')}
          className="rounded-lg bg-[#1976D2] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0]"
        >
          + Ajouter
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#1976D2] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'Tous' : s === 'DRAFT' ? 'Brouillon' : s === 'PUBLISHED' ? 'Publié' : 'Archivé'}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-[#D32F2F]">{error}</p>}

      {loading && (
        <p className="text-sm text-gray-500">Chargement...</p>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucune pièce dans votre catalogue.</p>
          <p className="mt-1 text-xs text-gray-400">Ajoutez des photos pour commencer.</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="space-y-3">
          {data.items.map((item) => (
            <div
              key={item.id}
              onClick={() => router.push(`/vendors/catalog/${item.id}`)}
              className="flex cursor-pointer gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50"
            >
              <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {item.imageThumbUrl ? (
                  <img src={item.imageThumbUrl} alt={item.name ?? 'Pièce'} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                    Photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1A1A1A]">
                  {item.name ?? 'En cours d\'identification...'}
                </p>
                <p className="text-xs text-gray-500">{item.category ?? '—'}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    item.status === 'DRAFT'
                      ? 'bg-yellow-100 text-yellow-700'
                      : item.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                  }`}>
                    {item.status === 'DRAFT' ? 'Brouillon' : item.status === 'PUBLISHED' ? 'Publié' : 'Archivé'}
                  </span>
                  {item.status === 'PUBLISHED' && !item.inStock && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Épuisée</span>
                  )}
                  {item.priceAlertFlag && (
                    <span className="text-xs text-amber-600" title="Alerte prix">🚨</span>
                  )}
                  {item.qualityIssue && (
                    <span className="text-xs text-amber-600">⚠️</span>
                  )}
                </div>
              </div>
              {(item.price ?? item.suggestedPrice) && (
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1A1A1A]">
                    {(item.price ?? item.suggestedPrice)?.toLocaleString('fr-FR')} F
                  </p>
                  {item.price === null && item.suggestedPrice && (
                    <p className="text-xs text-gray-400">suggéré</p>
                  )}
                </div>
              )}
            </div>
          ))}

          {data.pagination.totalPages > 1 && (
            <p className="text-center text-xs text-gray-400">
              Page {data.pagination.page} / {data.pagination.totalPages} — {data.pagination.total} pièce{data.pagination.total > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
