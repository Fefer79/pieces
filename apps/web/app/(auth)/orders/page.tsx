'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Price } from '@/components/ui/price'

type SupabaseClient = ReturnType<typeof createClient>

interface OrderHistoryItem {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  items: Array<{ name: string; priceSnapshot: number; quantity: number }>
  delivery?: { status: string; deliveredAt?: string } | null
}

interface OrderHistoryData {
  orders: OrderHistoryItem[]
  total: number
  page: number
  totalPages: number
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente de paiement',
  PAID: 'Payee',
  VENDOR_CONFIRMED: 'Confirmee vendeur',
  DISPATCHED: 'Expediee',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livree',
  CONFIRMED: 'Confirmee',
  COMPLETED: 'Terminee',
  CANCELLED: 'Annulee',
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  PENDING_PAYMENT: { bg: 'bg-amber-50', text: 'text-amber-700' },
  PAID: { bg: 'bg-blue-50', text: 'text-blue-700' },
  VENDOR_CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700' },
  DISPATCHED: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  IN_TRANSIT: { bg: 'bg-indigo-50', text: 'text-indigo-700' },
  DELIVERED: { bg: 'bg-green-50', text: 'text-green-700' },
  CONFIRMED: { bg: 'bg-green-50', text: 'text-green-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-700' },
}

const DELIVERY_LABELS: Record<string, string> = {
  PENDING_ASSIGNMENT: 'En attente',
  ASSIGNED: 'Livreur assigne',
  PICKUP_IN_PROGRESS: 'Recuperation',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livree',
  CONFIRMED: 'Confirmee',
  RETURNED: 'Retournee',
}

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

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Commandes
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes commandes</h1>
      </div>

      {loading && (
        <div className="flex min-h-[30vh] items-center justify-center">
          <p className="text-sm text-muted">Chargement…</p>
        </div>
      )}

      {!loading && data && data.orders.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-10 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-muted-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
          </svg>
          <p className="mb-1 text-sm font-medium text-ink">Aucune commande</p>
          <p className="text-xs text-muted">Vos commandes apparaîtront ici.</p>
        </div>
      )}

      {!loading && data && data.orders.length > 0 && (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.orders.map((order) => {
              const colors = STATUS_COLORS[order.status] ?? { bg: 'bg-surface', text: 'text-muted' }
              return (
                <div key={order.id} className="rounded-md border border-border bg-card p-4 transition-all hover:border-border-strong hover:shadow-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-mono text-sm font-medium tabular text-ink">
                      #{order.id.slice(0, 8)}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${colors.bg} ${colors.text}`}>
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>

                  <p className="mb-2 font-mono text-xs tabular text-muted">
                    {new Date(order.createdAt).toLocaleDateString('fr-CI', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </p>

                  <ul className="mb-3 space-y-1">
                    {order.items.map((item, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-ink">
                          {item.name} <span className="text-muted-2">x{item.quantity}</span>
                        </span>
                        <Price amount={item.priceSnapshot} currency={false} className="text-xs text-muted" />
                      </li>
                    ))}
                  </ul>

                  <div className="flex items-center justify-between border-t border-border pt-2">
                    {order.delivery ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        Livraison · {DELIVERY_LABELS[order.delivery.status] ?? order.delivery.status}
                      </span>
                    ) : (
                      <span />
                    )}
                    <Price amount={order.totalAmount} className="text-sm" />
                  </div>
                </div>
              )
            })}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="font-mono text-xs tabular text-muted">
                {page} / {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
