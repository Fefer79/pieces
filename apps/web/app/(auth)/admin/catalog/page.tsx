'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

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
  vendor: { id: string; businessName: string | null }
}

interface CatalogResponse {
  items: CatalogItem[]
  total: number
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  ARCHIVED: 'Archivé',
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-700',
  PUBLISHED: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

export default function AdminCatalogPage() {
  const [data, setData] = useState<CatalogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')

  const fetchItems = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const qs = params.toString()

      const res = await fetch(`/api/v1/admin/catalog${qs ? `?${qs}` : ''}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? 'Erreur lors du chargement')
        return
      }

      const json = await res.json()
      setData(json.data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchItems(statusFilter || undefined)
  }, [fetchItems, statusFilter])

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1A1A1A]">
          Annonces
          {data && <span className="ml-2 text-sm font-normal text-gray-500">({data.total})</span>}
        </h1>
        <a
          href="/admin"
          className="text-sm text-[#002366] hover:underline"
        >
          Retour
        </a>
      </div>

      <div className="mb-4 flex gap-2">
        {['', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-[#002366] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === '' ? 'Tous' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-[#D32F2F]">{error}</p>}

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucune annonce trouvée.</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2">Photo</th>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Catégorie</th>
                <th className="px-3 py-2">Vendeur</th>
                <th className="px-3 py-2">Prix</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                      {item.imageThumbUrl ? (
                        <img src={item.imageThumbUrl} alt={item.name ?? ''} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">—</div>
                      )}
                    </div>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 font-medium text-[#1A1A1A]">
                    {item.name ?? 'Sans nom'}
                    {item.qualityIssue && <span className="ml-1 text-amber-600" title={item.qualityIssue}>⚠️</span>}
                    {item.priceAlertFlag && <span className="ml-1 text-amber-600" title="Alerte prix">🚨</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{item.category ?? '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{item.vendor.businessName ?? '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {item.price != null
                      ? `${item.price.toLocaleString('fr-FR')} F`
                      : item.suggestedPrice != null
                        ? <span className="text-gray-400">{item.suggestedPrice.toLocaleString('fr-FR')} F (suggéré)</span>
                        : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[item.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {item.status === 'PUBLISHED' && (
                      <span className={`text-xs ${item.inStock ? 'text-green-600' : 'text-red-600'}`}>
                        {item.inStock ? 'En stock' : 'Épuisée'}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
