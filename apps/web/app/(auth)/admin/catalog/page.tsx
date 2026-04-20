'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'
import type { ChipVariant } from '@/components/ui/chip'

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

const STATUS_CHIP: Record<string, ChipVariant> = {
  DRAFT: 'status-warn',
  PUBLISHED: 'status-ok',
  ARCHIVED: 'plain',
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

  const filters: Array<{ value: string; label: string }> = [
    { value: '', label: 'Tous' },
    { value: 'DRAFT', label: 'Brouillons' },
    { value: 'PUBLISHED', label: 'Publiés' },
    { value: 'ARCHIVED', label: 'Archivés' },
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Administration · Annonces
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">
            Annonces{' '}
            {data && (
              <span className="font-mono text-lg font-normal tabular text-muted">
                ({data.total})
              </span>
            )}
          </h1>
        </div>
        <a href="/admin" className="text-sm text-ink-2 hover:underline">
          ← Dashboard
        </a>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              statusFilter === f.value
                ? 'bg-ink-2 text-white'
                : 'border border-border bg-card text-muted hover:border-border-strong hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucune annonce trouvée</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  <th className="px-3 py-3">Photo</th>
                  <th className="px-3 py-3">Nom</th>
                  <th className="px-3 py-3">Catégorie</th>
                  <th className="px-3 py-3">Vendeur</th>
                  <th className="px-3 py-3 text-right">Prix</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Stock</th>
                  <th className="px-3 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={`transition-colors hover:bg-surface ${idx > 0 ? 'border-t border-border' : ''}`}
                  >
                    <td className="px-3 py-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                        {item.imageThumbUrl ? (
                          <img
                            src={item.imageThumbUrl}
                            alt={item.name ?? ''}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-2">
                            —
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[220px] truncate px-3 py-3 font-medium text-ink">
                      {item.name ?? <span className="text-muted-2">Sans nom</span>}
                      {item.qualityIssue && (
                        <span className="ml-1 text-warn-fg" title={item.qualityIssue}>⚠️</span>
                      )}
                      {item.priceAlertFlag && (
                        <span className="ml-1 text-warn-fg" title="Alerte prix">🚨</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">{item.category ?? '—'}</td>
                    <td className="px-3 py-3 text-muted">{item.vendor.businessName ?? '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      {item.price != null ? (
                        <Price amount={item.price} currency={false} />
                      ) : item.suggestedPrice != null ? (
                        <span className="font-mono tabular text-muted-2">
                          {item.suggestedPrice.toLocaleString('fr-FR')}{' '}
                          <span className="text-[10px] uppercase">sug.</span>
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Chip variant={STATUS_CHIP[item.status] ?? 'plain'}>
                        {STATUS_LABELS[item.status] ?? item.status}
                      </Chip>
                    </td>
                    <td className="px-3 py-3">
                      {item.status === 'PUBLISHED' &&
                        (item.inStock ? (
                          <Chip variant="status-ok">En stock</Chip>
                        ) : (
                          <Chip variant="status-err">Épuisée</Chip>
                        ))}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs tabular text-muted-2">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
