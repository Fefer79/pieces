'use client'

import { useEffect, useState } from 'react'
import { enterpriseFetch, type EnterpriseOrder, type EnterpriseOrderPage } from '@/lib/enterprise-api'
import { statusLabels, getStatusColor } from '@/lib/order-status'
import { ConditionChip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

/**
 * Choix d'une commande de la flotte (et, si besoin, de la pièce concernée) —
 * remplace la saisie d'un UUID de commande. La liste est celle que le membre a
 * le droit de voir : le serveur restreint déjà un mécanicien à ses propres
 * commandes.
 */
export function EnterpriseOrderPicker({
  enterpriseId,
  orderId,
  orderItemId,
  onChange,
}: {
  enterpriseId: string
  orderId: string
  orderItemId: string | null
  onChange: (orderId: string, orderItemId: string | null) => void
}) {
  const [orders, setOrders] = useState<EnterpriseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    enterpriseFetch<EnterpriseOrderPage>(`/${enterpriseId}/orders?limit=50`).then((res) => {
      if (cancelled) return
      setLoading(false)
      if (!res.ok) { setError(res.message); return }
      setOrders(res.data.orders)
    })
    return () => { cancelled = true }
  }, [enterpriseId])

  const selected = orders.find((o) => o.id === orderId) ?? null

  if (loading) return <p className="text-sm text-muted">Chargement des commandes…</p>
  if (error) return <p className="text-sm text-red-600">{error}</p>
  if (orders.length === 0) {
    return (
      <p className="text-sm text-muted">
        Aucune commande sur laquelle demander un retour.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
          Commande concernée *
        </span>
        <select
          required
          value={orderId}
          onChange={(e) => onChange(e.target.value, null)}
          className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
        >
          <option value="">Choisir une commande…</option>
          {orders.map((o) => (
            <option key={o.id} value={o.id}>
              {new Date(o.createdAt).toLocaleDateString('fr-CI')} · {o.vehicle
                ? `${o.vehicle.brand} ${o.vehicle.model}`
                : 'Sans véhicule'} · {o.items[0]?.name ?? 'Sans article'}
              {o.items.length > 1 ? ` +${o.items.length - 1}` : ''} · {o.totalAmount.toLocaleString('fr-FR')} F
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div className="rounded-md border border-border bg-surface p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[11px] text-muted">#{selected.id.slice(0, 8)}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${getStatusColor(selected.status).bg} ${getStatusColor(selected.status).text}`}
            >
              {statusLabels[selected.status] ?? selected.status}
            </span>
          </div>
          <p className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
            Pièce concernée (optionnel — laisser vide pour toute la commande)
          </p>
          <ul className="space-y-1">
            {selected.items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 hover:bg-card">
                  <input
                    type="radio"
                    name="orderItem"
                    checked={orderItemId === item.id}
                    onChange={() => onChange(selected.id, item.id)}
                  />
                  <span className="text-sm text-ink">
                    {item.name}
                    {item.quantity > 1 && <span className="text-muted"> ×{item.quantity}</span>}
                  </span>
                  {item.condition && <ConditionChip condition={item.condition} />}
                  <Price amount={item.priceSnapshot} className="ml-auto text-xs text-muted" />
                </label>
              </li>
            ))}
          </ul>
          {orderItemId && (
            <button
              type="button"
              onClick={() => onChange(selected.id, null)}
              className="mt-2 text-xs text-muted underline hover:text-ink"
            >
              Retirer la sélection de pièce
            </button>
          )}
        </div>
      )}
    </div>
  )
}
