'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Price } from '@/components/ui/price'
import { StatusChip, ConditionChip, type Condition } from '@/components/ui/chip'
import { PartThumb } from '@/components/ui/part-thumb'

type SupabaseClient = ReturnType<typeof createClient>

interface VendorOrderItem {
  name: string
  priceSnapshot: number
  quantity: number
  imageThumbUrl?: string | null
  condition?: string | null
  supplyMode?: string | null
}

interface VendorOrder {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: VendorOrderItem[]
}

interface VendorOrdersResponse {
  orders: VendorOrder[]
  total: number
  page: number
  limit: number
}

const FILTERS = [
  { key: 'all', label: 'Toutes', match: () => true },
  {
    key: 'a-confirmer',
    label: 'À confirmer',
    match: (s: string) => s === 'PAID',
  },
  {
    key: 'en-cours',
    label: 'En cours',
    match: (s: string) => ['VENDOR_CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(s),
  },
  {
    key: 'livrees',
    label: 'Livrées',
    match: (s: string) => ['DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(s),
  },
  { key: 'annulees', label: 'Annulées', match: (s: string) => s === 'CANCELLED' },
] as const

export default function VendorOrdersPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<VendorOrdersResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch('/api/v1/orders/vendor/mine?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })

      const body = await res.json()

      if (!res.ok) {
        if (body.error?.code === 'VENDOR_NOT_FOUND') {
          router.push('/vendors/onboarding')
          return
        }
        setError(body.error?.message ?? 'Erreur lors du chargement des commandes')
        setLoading(false)
        return
      }

      setData(body.data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, router])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const orders = useMemo(() => data?.orders ?? [], [data])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const f of FILTERS) c[f.key] = orders.filter((o) => f.match(o.status)).length
    return c
  }, [orders])

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0]
    return orders.filter((o) => f.match(o.status))
  }, [orders, filter])

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Boutique
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes commandes</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
              filter === f.key ? 'bg-ink font-semibold text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 font-mono text-[11px] ${filter === f.key ? 'text-white/60' : 'text-muted-2'}`}>
              {counts[f.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && visible.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-10 text-center">
          <p className="text-sm font-medium text-ink">
            {orders.length === 0 ? 'Aucune commande pour le moment' : 'Aucune commande dans ce filtre'}
          </p>
          <p className="mt-1 text-xs text-muted">
            Les commandes contenant une de vos pièces apparaîtront ici dès qu&apos;elles seront payées.
          </p>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          {visible.map((order, idx) => {
            const first = order.items[0]
            const extra = order.items.length - 1
            return (
              <Link
                key={order.id}
                href={`/vendors/orders/${order.id}`}
                className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                  <PartThumb src={first?.imageThumbUrl} alt={first?.name} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[11px] text-muted">
                    #{order.id.slice(0, 8)} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('fr-CI', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-ink">
                    {first?.name ?? 'Commande'}
                    {extra > 0 && (
                      <span className="font-normal text-muted"> +{extra} autre{extra > 1 ? 's' : ''}</span>
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {first?.condition && (
                      <ConditionChip condition={first.condition as Condition} supplyMode={first.supplyMode} />
                    )}
                    <StatusChip status={order.status} />
                  </div>
                </div>
                <div className="text-right">
                  <Price amount={order.totalAmount} currency={false} className="text-sm" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {!loading && data && data.total > 0 && (
        <p className="mt-4 text-center text-xs text-muted-2">
          {data.total} commande{data.total > 1 ? 's' : ''} au total
        </p>
      )}
    </div>
  )
}
