'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Price } from '@/components/ui/price'
import { StatusChip, ConditionChip, SupplyModeChip, type Condition } from '@/components/ui/chip'
import { PartThumb } from '@/components/ui/part-thumb'
import { Button } from '@/components/ui/button'

type SupabaseClient = ReturnType<typeof createClient>

interface OrderItem {
  id: string
  name: string
  category: string | null
  priceSnapshot: number
  quantity: number
  imageThumbUrl: string | null
  condition: string | null
  supplyMode: string | null
  vendorShopName: string | null
  commissionAmount: number | null
}

interface OrderDetail {
  id: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  createdAt: string
  items: OrderItem[]
}

export default function VendorOrderDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const orderId = params.id

  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await getSupabase().auth.getSession()
    return session?.access_token ?? null
  }, [])

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        setError('Session expirée. Veuillez vous reconnecter.')
        setLoading(false)
        return
      }

      const res = await fetch(`/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()

      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement de la commande')
        setLoading(false)
        return
      }

      setOrder(body.data)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [getAccessToken, orderId])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const confirmOrder = useCallback(async () => {
    setConfirming(true)
    try {
      const token = await getAccessToken()
      if (!token) return
      const res = await fetch(`/api/v1/orders/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()
      if (res.ok) {
        setOrder(body.data)
      } else {
        setError(body.error?.message ?? 'Erreur lors de la confirmation')
      }
    } catch {
      // La connexion a coupé pendant l'envoi : le service worker a mis la
      // confirmation en attente et la rejouera à la reconnexion (app/sw.ts).
      setError(
        navigator.onLine
          ? 'Erreur réseau. Vérifiez votre connexion.'
          : 'Connexion coupée — la confirmation est en attente et sera envoyée automatiquement dès que la connexion revient.',
      )
    } finally {
      setConfirming(false)
    }
  }, [getAccessToken, orderId])

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
        <Link href="/vendors/orders" className="text-sm font-semibold text-accent hover:underline">
          ← Mes commandes
        </Link>
        <div className="mt-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      </div>
    )
  }

  if (!order) return null

  // Sous-total des pièces vendues (avant frais plateforme, main d'œuvre et livraison).
  const partsSubtotal = order.items.reduce((sum, i) => sum + i.priceSnapshot * i.quantity, 0)
  const platformFees = order.items.reduce((sum, i) => sum + (i.commissionAmount ?? 0), 0)
  const laborCost = order.laborCost ?? 0

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8">
      <Link href="/vendors/orders" className="text-sm font-semibold text-accent hover:underline">
        ← Mes commandes
      </Link>

      <div className="mb-6 mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Commande #{order.id.slice(0, 8)}
          </div>
          <h1 className="mt-1 font-display text-2xl text-ink">
            {new Date(order.createdAt).toLocaleDateString('fr-CI', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
        </div>
        <StatusChip status={order.status} />
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <div className="mb-5 overflow-hidden rounded-md border border-border bg-card">
        {order.items.map((item, idx) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 px-4 py-3.5 ${idx > 0 ? 'border-t border-border' : ''}`}
          >
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
              <PartThumb src={item.imageThumbUrl} alt={item.name} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{item.name}</p>
              <p className="truncate text-xs text-muted">
                {item.category ?? '—'} · ×{item.quantity}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {item.condition && (
                  <ConditionChip condition={item.condition as Condition} supplyMode={item.supplyMode} />
                )}
                <SupplyModeChip supplyMode={item.supplyMode} />
              </div>
            </div>
            <Price amount={item.priceSnapshot * item.quantity} currency={false} className="text-sm" />
          </div>
        ))}
      </div>

      {/* Détail du prix — jamais de frais caché : chaque ligne de la facturation
          est explicite avant tout bouton d'action (règle DESIGN.md). */}
      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Détail du montant
        </h2>
        <div className="space-y-1.5 text-sm">
          <Row label="Pièces (prix vendeur)" amount={partsSubtotal} />
          {laborCost > 0 && <Row label="Main d'œuvre" amount={laborCost} />}
          <Row label="Livraison" amount={order.deliveryFee} />
          {platformFees > 0 && <Row label="Frais plateforme" amount={-platformFees} muted />}
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-[15px] font-semibold text-ink">
            <span>Total commande</span>
            <Price amount={order.totalAmount} />
          </div>
        </div>
      </div>

      {order.status === 'PAID' && (
        <Button variant="accent" size="lg" block onClick={confirmOrder} disabled={confirming}>
          {confirming ? 'Confirmation…' : 'Confirmer la commande'}
        </Button>
      )}
    </div>
  )
}

function Row({ label, amount, muted = false }: { label: string; amount: number; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${muted ? 'text-muted' : 'text-ink'}`}>
      <span>{label}</span>
      <Price amount={amount} />
    </div>
  )
}
