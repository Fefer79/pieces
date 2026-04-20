'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { statusLabels, getStatusColor } from '@/lib/order-status'
import { Price } from '@/components/ui/price'

type SupabaseClient = ReturnType<typeof createClient>

interface OrderItem {
  name: string
  priceSnapshot: number
  quantity: number
}

interface Order {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: OrderItem[]
  delivery?: { status: string; deliveredAt?: string } | null
}

interface OrderData {
  orders: Order[]
  total: number
  page: number
  totalPages: number
}

const ALL_STATUSES = Object.keys(statusLabels)

export default function EnterpriseOrdersPage() {
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [data, setData] = useState<OrderData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return

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
  }, [page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Client-side filtering
  const filteredOrders = data?.orders.filter((order) => {
    if (statusFilter && order.status !== statusFilter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const matchId = order.id.toLowerCase().includes(q)
      const matchItem = order.items.some((item) => item.name.toLowerCase().includes(q))
      if (!matchId && !matchItem) return false
    }
    return true
  }) ?? []

  const exportCSV = () => {
    if (!filteredOrders.length) return

    const headers = ['Commande', 'Statut', 'Montant (FCFA)', 'Date', 'Articles']
    const rows = filteredOrders.map((o) => [
      `#${o.id.slice(0, 8)}`,
      statusLabels[o.status] ?? o.status,
      o.totalAmount.toString(),
      new Date(o.createdAt).toLocaleDateString('fr-CI'),
      o.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
    ])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Commandes</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.total} commande${data.total > 1 ? 's' : ''} au total` : 'Chargement…'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!filteredOrders.length}
          className="flex items-center gap-2 rounded-md border border-border-strong bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Exporter CSV
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par n° ou article…"
          className="w-64 rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
              <th className="px-6 py-3 text-left"># Commande</th>
              <th className="px-6 py-3 text-left">Statut</th>
              <th className="px-6 py-3 text-right">Montant</th>
              <th className="px-6 py-3 text-left">Date</th>
              <th className="px-6 py-3 text-right">Articles</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">
                  Chargement…
                </td>
              </tr>
            )}

            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">
                  Aucune commande{statusFilter || searchQuery ? ' correspondant aux filtres' : ''}.
                </td>
              </tr>
            )}

            {!loading && filteredOrders.map((order, idx) => {
              const color = getStatusColor(order.status)
              return (
                <tr
                  key={order.id}
                  className={`transition-colors hover:bg-surface ${idx > 0 ? 'border-t border-border' : ''}`}
                >
                  <td className="px-6 py-4 font-mono text-sm font-medium tabular text-ink">
                    #{order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${color.bg} ${color.text}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Price amount={order.totalAmount} className="text-sm" />
                  </td>
                  <td className="px-6 py-4 font-mono text-sm tabular text-muted">
                    {new Date(order.createdAt).toLocaleDateString('fr-CI')}
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-sm tabular text-muted">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-xs tabular text-muted">
            Page {page} sur {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
