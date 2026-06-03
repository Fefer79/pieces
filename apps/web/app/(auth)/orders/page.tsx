'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Price } from '@/components/ui/price'
import { StatusChip, ConditionChip, type Condition } from '@/components/ui/chip'

type SupabaseClient = ReturnType<typeof createClient>

interface OrderHistoryItem {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: Array<{
    name: string
    priceSnapshot: number
    quantity: number
    imageThumbUrl?: string | null
    condition?: string | null
    vendorShopName?: string | null
  }>
  delivery?: { status: string; deliveredAt?: string } | null
}

interface OrderHistoryData {
  orders: OrderHistoryItem[]
  total: number
  page: number
  totalPages: number
}

const DELIVERY_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'En attente',
  ASSIGNED: 'Livreur assigné',
  PICKUP_IN_PROGRESS: 'Récupération',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livrée',
  CONFIRMED: 'Confirmée',
  RETURNED: 'Retournée',
}

const FILTERS = [
  { key: 'all', label: 'Tous', match: () => true },
  { key: 'draft', label: 'Brouillon', match: (s: string) => s === 'DRAFT' },
  {
    key: 'active',
    label: 'En cours',
    match: (s: string) =>
      ['PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(s),
  },
  {
    key: 'delivered',
    label: 'Livré',
    match: (s: string) => ['DELIVERED', 'CONFIRMED', 'COMPLETED'].includes(s),
  },
  { key: 'cancelled', label: 'Annulé', match: (s: string) => s === 'CANCELLED' },
] as const

export default function OrderHistoryPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<OrderHistoryData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`/api/v1/orders/history?page=${page}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [page, router])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const orders = data?.orders ?? []

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const f of FILTERS) c[f.key] = orders.filter((o) => f.match(o.status)).length
    return c
  }, [orders])

  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.key === filter) ?? FILTERS[0]
    const q = query.trim().toLowerCase()
    return orders
      .filter((o) => f.match(o.status))
      .filter((o) => !q || o.items.some((i) => i.name.toLowerCase().includes(q)))
  }, [orders, filter, query])

  return (
    <main className="mx-auto w-full max-w-[1100px] px-4 py-6 lg:px-7 lg:py-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="font-display text-3xl text-ink">Mes commandes</h1>
        <Link
          href="/panier"
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle sélection
        </Link>
      </div>

      {/* Toolbar: filter tabs + search */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card p-1">
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
        <div className="relative ml-auto w-full max-w-[280px]">
          <svg className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer mes commandes…"
            className="w-full rounded-md border border-border-strong bg-card py-2 pl-9 pr-3 text-[13px] outline-none focus:border-ink-2"
          />
        </div>
      </div>

      {loading && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border p-4 last:border-0">
              <div className="h-13 w-13 animate-pulse rounded-lg bg-surface" style={{ height: 52, width: 52 }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-24 animate-pulse rounded bg-surface" />
                <div className="h-3.5 w-48 animate-pulse rounded bg-surface" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong bg-card/40 p-12 text-center">
          <p className="mb-1 text-sm font-medium text-ink">
            {orders.length === 0 ? 'Aucune commande' : 'Aucune commande dans ce filtre'}
          </p>
          <p className="mb-4 text-xs text-muted">Assemblez une sélection pour créer votre première commande.</p>
          <Link href="/search" className="text-sm font-semibold text-accent hover:underline">
            Rechercher des pièces →
          </Link>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {visible.map((order) => {
              const first = order.items[0]
              const extra = order.items.length - 1
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-b border-border px-5 py-4 transition-colors last:border-0 hover:bg-surface"
                >
                  <div className="h-[52px] w-[52px] flex-shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                    {first?.imageThumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.imageThumbUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[12px] text-muted">
                      #{order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="mt-0.5 truncate text-[14.5px] font-semibold text-ink">
                      {first?.name ?? 'Commande'}{extra > 0 && <span className="font-normal text-muted"> +{extra} autre{extra > 1 ? 's' : ''}</span>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                      {first?.vendorShopName && <span>{first.vendorShopName}</span>}
                      {first && <span>· ×{first.quantity}</span>}
                      {first?.condition && <ConditionChip condition={first.condition as Condition} />}
                    </div>
                  </div>
                  <div className="justify-self-end">
                    <StatusChip status={order.status} />
                  </div>
                  <div className="justify-self-end text-right">
                    <Price amount={order.totalAmount} className="text-[15px]" />
                    {order.delivery && (
                      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
                        {DELIVERY_LABELS[order.delivery.status] ?? order.delivery.status}
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
            <div className="flex items-center justify-between px-5 py-3.5 text-[13px] text-muted">
              <span>{data?.total ?? visible.length} commande{(data?.total ?? 0) > 1 ? 's' : ''}</span>
              {data && data.totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface disabled:opacity-40"
                  >
                    Précédent
                  </button>
                  <span className="font-mono text-xs tabular">{page} / {data.totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="rounded-md border border-border px-3 py-1.5 text-[13px] transition-colors hover:bg-surface disabled:opacity-40"
                  >
                    Suivant
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
