'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

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
        // If vendor doesn't exist, redirect to onboarding
        if (body.error?.code === 'VENDOR_NOT_FOUND') {
          router.push('/vendors/onboarding')
          return
        }
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

  const filters: Array<{ value: string; label: string }> = [
    { value: '', label: 'Tous' },
    { value: 'DRAFT', label: 'Brouillons' },
    { value: 'PUBLISHED', label: 'Publiés' },
    { value: 'ARCHIVED', label: 'Archivés' },
  ]

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Boutique
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Mon catalogue</h1>
        </div>
        <Button variant="accent" onClick={() => router.push('/vendors/catalog/upload')}>
          + Ajouter
        </Button>
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
          <p className="text-sm font-medium text-ink">Aucune pièce dans votre catalogue</p>
          <p className="mt-1 text-xs text-muted">
            Ajoutez des photos pour démarrer — l&apos;IA identifiera la pièce et remplira la cascade.
          </p>
          <div className="mt-4">
            <Button variant="accent" onClick={() => router.push('/vendors/catalog/upload')}>
              + Publier ma première annonce
            </Button>
          </div>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {data.items.map((item, idx) => {
            const displayPrice = item.price ?? item.suggestedPrice
            const statusChip =
              item.status === 'PUBLISHED'
                ? { variant: 'status-ok' as const, label: 'Publié' }
                : item.status === 'DRAFT'
                  ? { variant: 'status-warn' as const, label: 'Brouillon' }
                  : { variant: 'plain' as const, label: 'Archivé' }
            return (
              <div
                key={item.id}
                onClick={() => router.push(`/vendors/catalog/${item.id}`)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                  {item.imageThumbUrl ? (
                    <img
                      src={item.imageThumbUrl}
                      alt={item.name ?? 'Pièce'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-mono uppercase tracking-wider text-muted-2">
                      Photo
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.name ?? 'En cours d\u2019identification…'}
                  </p>
                  <p className="truncate text-xs text-muted">{item.category ?? '—'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Chip variant={statusChip.variant}>{statusChip.label}</Chip>
                    {item.status === 'PUBLISHED' && !item.inStock && (
                      <Chip variant="status-err">Épuisée</Chip>
                    )}
                    {item.priceAlertFlag && (
                      <span className="text-xs text-warn-fg" title="Alerte prix">
                        🚨
                      </span>
                    )}
                    {item.qualityIssue && (
                      <span className="text-xs text-warn-fg" title={item.qualityIssue}>
                        ⚠️
                      </span>
                    )}
                  </div>
                </div>
                {displayPrice != null && (
                  <div className="text-right">
                    <Price amount={displayPrice} currency={false} className="text-sm" />
                    {item.price == null && item.suggestedPrice != null && (
                      <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-2">
                        suggéré
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!loading && data && data.pagination.totalPages > 1 && (
        <p className="mt-4 text-center text-xs text-muted-2">
          Page {data.pagination.page} / {data.pagination.totalPages} — {data.pagination.total} pièce
          {data.pagination.total > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
