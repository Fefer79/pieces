'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { statusLabels, getStatusColor } from '@/lib/order-status'
import { Price } from '@/components/ui/price'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'

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
  // Suggestions locales : noms d'articles présents dans les commandes chargées.
  const fetchSuggestions = useCallback(async (term: string): Promise<PredictiveItem[]> => {
    const t = term.toLowerCase()
    const names = new Set<string>()
    for (const o of data?.orders ?? []) {
      for (const i of o.items) {
        if (i.name.toLowerCase().includes(t)) names.add(i.name)
      }
    }
    return [...names].slice(0, 8).map((label) => ({ label }))
  }, [data])

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

  const downloadDevis = async (orderId: string) => {
    const { data: { session } } = await getSupabase().auth.getSession()
    if (!session) return
    const res = await fetch(`/api/v1/orders/${orderId}/devis.pdf`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `devis-${orderId.slice(0, 8)}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

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

        <PredictiveSearch
          value={searchQuery}
          onChange={setSearchQuery}
          fetchSuggestions={fetchSuggestions}
          placeholder="Rechercher par n° ou article…"
          className="w-64"
          inputClassName="w-full rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th># Commande</Th>
              <Th>Statut</Th>
              <Th align="right">Montant</Th>
              <Th>Date</Th>
              <Th align="right">Articles</Th>
              <Th align="right">Devis</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={6} align="center" className="py-12 text-muted">
                  Chargement…
                </Td>
              </Tr>
            )}

            {!loading && filteredOrders.length === 0 && (
              <Tr>
                <Td colSpan={6} align="center" className="py-12 text-muted">
                  Aucune commande{statusFilter || searchQuery ? ' correspondant aux filtres' : ''}.
                </Td>
              </Tr>
            )}

            {!loading && filteredOrders.map((order) => {
              const color = getStatusColor(order.status)
              return (
                <Tr key={order.id}>
                  <Td num className="font-mono font-medium text-ink">
                    #{order.id.slice(0, 8)}
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${color.bg} ${color.text}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </Td>
                  <Td align="right">
                    <Price amount={order.totalAmount} className="text-sm" />
                  </Td>
                  <Td className="font-mono tabular text-muted">
                    {new Date(order.createdAt).toLocaleDateString('fr-CI')}
                  </Td>
                  <Td num className="font-mono text-muted">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => downloadDevis(order.id)}
                      className="text-sm font-medium text-ink-2 hover:underline"
                    >
                      PDF
                    </button>
                  </Td>
                </Tr>
              )
            })}
          </Tbody>
        </Table>
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
