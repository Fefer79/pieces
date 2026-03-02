'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { statusLabels, getStatusColor } from '@/lib/order-status'

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
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-gray-900">Commandes</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.total} commande${data.total > 1 ? 's' : ''} au total` : 'Chargement...'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!filteredOrders.length}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
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
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#1976D2] focus:outline-none"
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
          placeholder="Rechercher par n° ou article..."
          className="w-64 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm focus:border-[#1976D2] focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"># Commande</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Statut</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Montant</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Date</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Articles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  Chargement...
                </td>
              </tr>
            )}

            {!loading && filteredOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                  Aucune commande{statusFilter || searchQuery ? ' correspondant aux filtres' : ''}.
                </td>
              </tr>
            )}

            {!loading && filteredOrders.map((order) => {
              const color = getStatusColor(order.status)
              return (
                <tr key={order.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    #{order.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">
                    {order.totalAmount.toLocaleString('fr-FR')} FCFA
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString('fr-CI')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-500">
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
          <p className="text-sm text-gray-500">
            Page {page} sur {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
