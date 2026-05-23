'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

interface Delivery {
  id: string
  status: string
  mode: string
  pickupAddress: string | null
  deliveryAddress: string | null
  codAmount: number | null
  order: { id: string; totalAmount: number; items: { name: string }[] }
}

const STATUS_LABELS: Record<string, string> = {
  ASSIGNED: 'Assignée',
  PICKUP_IN_PROGRESS: 'Ramassage',
  IN_TRANSIT: 'En route',
  DELIVERED: 'Livrée',
  CONFIRMED: 'Confirmée',
}

export default function RiderDashboard() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeliveries = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/deliveries/mine')
      if (res.ok) {
        const body = await res.json()
        setDeliveries(body.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  const active = deliveries.filter((d) => !['DELIVERED', 'CONFIRMED'].includes(d.status))
  const completed = deliveries.filter((d) => ['DELIVERED', 'CONFIRMED'].includes(d.status))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Livreur
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes livraisons</h1>
      </div>

      {active.length === 0 && (
        <div className="mb-6 rounded-md border border-dashed border-border-strong bg-card/40 p-8 text-center">
          <p className="text-sm font-medium text-ink">Aucune livraison en cours</p>
          <p className="mt-1 text-xs text-muted">Vous serez notifié dès qu&apos;une livraison vous sera assignée.</p>
        </div>
      )}

      {active.length > 0 && (
        <div className="mb-6 space-y-3">
          {active.map((d) => (
            <Link
              key={d.id}
              href={`/rider/delivery/${d.id}`}
              className="group block overflow-hidden rounded-md border border-border bg-card transition-all hover:border-ink-2 hover:shadow-md"
            >
              <div className="flex items-center justify-between bg-[linear-gradient(135deg,#00113A_0%,#002366_100%)] px-4 py-3 text-white">
                <div>
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
                    {STATUS_LABELS[d.status] ?? d.status}
                  </div>
                  <div className="mt-0.5 font-display text-lg">#{d.id.slice(0, 8)}</div>
                </div>
                <span className="rounded-sm bg-white/15 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
                  {d.mode}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <p className="min-w-0 truncate text-sm text-ink">
                  {d.order.items.map((i) => i.name).join(', ')}
                </p>
                {d.codAmount != null && d.codAmount > 0 && (
                  <div className="flex-shrink-0 rounded-sm bg-accent px-3 py-1.5 text-white">
                    <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] opacity-90">
                      COD
                    </div>
                    <Price amount={d.codAmount} className="text-sm font-semibold" currency={false} />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <>
          <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Historique (10 dernières)
          </h2>
          <div className="overflow-hidden rounded-md border border-border bg-card">
            {completed.slice(0, 10).map((d, idx) => (
              <div
                key={d.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Chip variant={d.status === 'CONFIRMED' ? 'status-ok' : 'plain'}>
                      {STATUS_LABELS[d.status]}
                    </Chip>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted">
                    {d.order.items.map((i) => i.name).join(', ')}
                  </p>
                </div>
                <Price amount={d.order.totalAmount} currency={false} className="text-sm" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
