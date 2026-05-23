'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { StatCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type SupabaseClient = ReturnType<typeof createClient>

interface DashboardData {
  vendor: {
    id: string
    shopName: string
    status: string
    deliveryZonesCount: number
  }
  catalog: {
    published: number
    draft: number
    archived: number
    outOfStock: number
  }
}

export default function VendorDashboardPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/v1/vendors/me/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement')
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
    fetchDashboard()
  }, [fetchDashboard])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Boutique
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">
          {data ? data.vendor.shopName : 'Tableau de bord'}
        </h1>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Publiées" value={data.catalog.published} />
            <StatCard label="Brouillons" value={data.catalog.draft} />
            <StatCard label="Épuisées" value={data.catalog.outOfStock} />
            <StatCard label="Archivées" value={data.catalog.archived} />
          </div>

          <div className="mb-6">
            <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Accès rapide
            </h2>
            <div className="space-y-2">
              <QuickAction
                title="Mon catalogue"
                description="Annonces publiées, brouillons, stock"
                onClick={() => router.push('/vendors/catalog')}
              />
              <QuickAction
                title="Zones de livraison"
                description={`${data.vendor.deliveryZonesCount} commune${data.vendor.deliveryZonesCount > 1 ? 's' : ''} couverte${data.vendor.deliveryZonesCount > 1 ? 's' : ''}`}
                onClick={() => router.push('/vendors/delivery-zones')}
              />
              <QuickAction
                title="Garanties"
                description="Configurer les garanties par catégorie"
                onClick={() => router.push('/vendors/guarantees')}
              />
            </div>
          </div>

          <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-6 text-center">
            <p className="text-sm font-medium text-muted">Commandes & paiements</p>
            <p className="mt-1 text-xs text-muted-2">Bientôt disponible</p>
          </div>

          <div className="mt-8">
            <Button
              variant="accent"
              size="lg"
              block
              onClick={() => router.push('/vendors/catalog/upload')}
            >
              + Publier une nouvelle annonce
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function QuickAction({
  title,
  description,
  onClick,
}: {
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center justify-between rounded-md border border-border bg-card p-4 text-left transition-all hover:border-border-strong hover:shadow-sm"
    >
      <div>
        <div className="text-sm font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-xs text-muted">{description}</div>
      </div>
      <span className="text-muted-2 transition-colors group-hover:text-ink">→</span>
    </button>
  )
}
