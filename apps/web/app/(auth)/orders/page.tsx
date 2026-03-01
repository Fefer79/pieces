'use client'

import { useState, useEffect, useCallback } from 'react'

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

export default function OrderHistoryPage() {
  const [data, setData] = useState<OrderHistoryData | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`/api/v1/admin/orders/history?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setData(json.data)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon',
    PENDING_PAYMENT: 'En attente de paiement',
    PAID: 'Payée',
    VENDOR_CONFIRMED: 'Confirmée vendeur',
    DISPATCHED: 'Expédiée',
    IN_TRANSIT: 'En transit',
    DELIVERED: 'Livrée',
    CONFIRMED: 'Confirmée',
    COMPLETED: 'Terminée',
    CANCELLED: 'Annulée',
  }

  return (
    <main style={{ padding: 16, maxWidth: 600, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Mes commandes</h1>

      {loading && <p>Chargement...</p>}

      {data && data.orders.length === 0 && (
        <p style={{ color: '#666' }}>Aucune commande pour le moment.</p>
      )}

      {data?.orders.map((order) => (
        <div key={order.id} style={{
          border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>#{order.id.slice(0, 8)}</span>
            <span style={{
              fontSize: 12, padding: '2px 8px', borderRadius: 12,
              background: order.status === 'COMPLETED' ? '#e8f5e9' : order.status === 'CANCELLED' ? '#ffebee' : '#fff3e0',
              color: order.status === 'COMPLETED' ? '#2e7d32' : order.status === 'CANCELLED' ? '#c62828' : '#e65100',
            }}>
              {statusLabels[order.status] ?? order.status}
            </span>
          </div>

          <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>
            {new Date(order.createdAt).toLocaleDateString('fr-CI')}
          </div>

          <ul style={{ margin: '8px 0', paddingLeft: 16, fontSize: 14 }}>
            {order.items.map((item, i) => (
              <li key={i}>{item.name} x{item.quantity} — {item.priceSnapshot.toLocaleString()} FCFA</li>
            ))}
          </ul>

          <div style={{ fontWeight: 600, textAlign: 'right' }}>
            Total : {order.totalAmount.toLocaleString()} FCFA
          </div>

          {order.delivery && (
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              Livraison : {order.delivery.status}
            </div>
          )}
        </div>
      ))}

      {data && data.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Précédent
          </button>
          <span>{page} / {data.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}>
            Suivant
          </button>
        </div>
      )}
    </main>
  )
}
