'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'

interface Delivery {
  id: string
  status: string
  mode: string
  pickupAddress: string | null
  deliveryAddress: string | null
  codAmount: number | null
  clientAbsent: boolean
}

export default function DeliveryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const deliveryId = params.deliveryId as string
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)

  const fetchDelivery = useCallback(async () => {
    // Use the order endpoint as a proxy — in real app this would be a direct delivery endpoint
    try {
      const res = await fetch(`/api/v1/deliveries/mine`)
      if (res.ok) {
        const body = await res.json()
        const found = body.data.find((d: Delivery) => d.id === deliveryId)
        if (found) setDelivery(found)
      }
    } finally {
      setLoading(false)
    }
  }, [deliveryId])

  useEffect(() => {
    fetchDelivery()
  }, [fetchDelivery])

  async function handleAction(action: string) {
    setActing(true)
    try {
      const res = await fetch(`/api/v1/deliveries/${deliveryId}/${action}`, { method: 'POST' })
      if (res.ok) {
        const body = await res.json()
        setDelivery(body.data)
      }
    } finally {
      setActing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (!delivery) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          Livraison introuvable
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <button
        onClick={() => router.push('/rider')}
        className="mb-3 text-sm text-ink-2 hover:underline"
      >
        ← Retour
      </button>

      {/* Header band */}
      <div className="mb-5 overflow-hidden rounded-md border border-border">
        <div className="flex items-center justify-between bg-[linear-gradient(135deg,#00113A_0%,#002366_100%)] p-5 text-white">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">
              ● {delivery.status.replace(/_/g, ' ')}
            </div>
            <div className="mt-1 font-display text-2xl">#{delivery.id.slice(0, 8)}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] opacity-80">
              Mode : {delivery.mode}
            </div>
          </div>
          {delivery.codAmount != null && delivery.codAmount > 0 && (
            <div className="rounded-sm bg-accent px-4 py-3 text-right">
              <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.12em] opacity-90">
                À encaisser (COD)
              </div>
              <Price amount={delivery.codAmount} className="mt-0.5 text-lg font-semibold" />
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4 border-l-4 border-l-ink-2">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            📍 Ramassage · Vendeur
          </div>
          <p className="mt-2 text-sm text-ink">
            {delivery.pickupAddress ?? <span className="text-muted-2">Adresse non renseignée</span>}
          </p>
        </div>

        <div className="rounded-md border border-border bg-card p-4 border-l-4 border-l-accent">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            🏁 Livraison · Client
          </div>
          <p className="mt-2 text-sm text-ink">
            {delivery.deliveryAddress ?? <span className="text-muted-2">Adresse non renseignée</span>}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-2.5">
        {delivery.status === 'ASSIGNED' && (
          <Button
            variant="accent"
            size="lg"
            block
            onClick={() => handleAction('pickup')}
            disabled={acting}
          >
            {acting ? 'En cours…' : 'Démarrer le ramassage'}
          </Button>
        )}

        {delivery.status === 'PICKUP_IN_PROGRESS' && (
          <Button
            variant="accent"
            size="lg"
            block
            onClick={() => handleAction('transit')}
            disabled={acting}
          >
            {acting ? 'En cours…' : 'Pièce récupérée — En route'}
          </Button>
        )}

        {delivery.status === 'IN_TRANSIT' && (
          <>
            <Button
              variant="accent"
              size="lg"
              block
              onClick={() => handleAction('deliver')}
              disabled={acting}
            >
              {acting ? 'En cours…' : 'Confirmer la livraison'}
            </Button>
            <button
              onClick={() => handleAction('client-absent')}
              disabled={acting}
              className="w-full rounded-md border border-warn-fg/30 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-fg transition-colors hover:border-warn-fg/50 disabled:opacity-50"
            >
              Client absent
            </button>
          </>
        )}

        {delivery.status === 'DELIVERED' && (
          <div className="rounded-md border border-success-fg/20 bg-success-bg p-4 text-center text-sm font-semibold text-success-fg">
            ✓ Livraison confirmée
          </div>
        )}
      </div>
    </div>
  )
}
