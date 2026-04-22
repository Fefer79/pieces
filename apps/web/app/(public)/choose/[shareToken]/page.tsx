'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'

interface OrderItem {
  id: string
  name: string
  category: string | null
  priceSnapshot: number
  quantity: number
  imageThumbUrl: string | null
  vendorShopName: string
  vendorId: string
}

interface Order {
  id: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  shareToken: string
  items: OrderItem[]
}

type PayMethodId = 'ORANGE_MONEY' | 'MTN_MOMO' | 'WAVE' | 'COD'

type PayMethodConfig = {
  id: PayMethodId
  label: string
  short: string
  subtitle: string
  bg: string
  fg: string
}

const PAY_METHODS: Record<PayMethodId, PayMethodConfig> = {
  ORANGE_MONEY: {
    id: 'ORANGE_MONEY',
    label: 'Orange Money',
    short: 'OM',
    subtitle: 'Paiement instantané',
    bg: 'bg-om',
    fg: 'text-white',
  },
  MTN_MOMO: {
    id: 'MTN_MOMO',
    label: 'MTN MoMo',
    short: 'MTN',
    subtitle: 'Paiement instantané',
    bg: 'bg-mtn',
    fg: 'text-ink',
  },
  WAVE: {
    id: 'WAVE',
    label: 'Wave',
    short: 'W',
    subtitle: 'Frais 0 FCFA',
    bg: 'bg-wave',
    fg: 'text-white',
  },
  COD: {
    id: 'COD',
    label: 'Espèces à la livraison',
    short: 'COD',
    subtitle: 'Payer en main propre',
    bg: 'bg-cod',
    fg: 'text-white',
  },
}

export default function OwnerChoicePage() {
  const params = useParams()
  const router = useRouter()
  const shareToken = params.shareToken as string
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<PayMethodId | null>(null)

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/orders/share/${shareToken}`)
      if (!res.ok) {
        setError('Commande introuvable')
        return
      }
      const body = await res.json()
      setOrder(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [shareToken])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  async function handlePay() {
    if (!order || !selectedMethod) return
    setPaying(true)
    try {
      const res = await fetch(`/api/v1/orders/${order.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: selectedMethod }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur de paiement')
        return
      }
      setOrder(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-muted">Chargement…</p>
      </div>
    )
  }

  if (error && !order) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-md border border-error-fg/20 bg-error-bg p-4 text-sm text-error-fg">
          {error}
        </div>
      </div>
    )
  }

  if (!order) return null

  const grandTotal = order.totalAmount + order.deliveryFee + (order.laborCost ?? 0)

  const availableMethods: PayMethodId[] = [
    'ORANGE_MONEY',
    'MTN_MOMO',
    'WAVE',
    ...((grandTotal <= 75000 ? ['COD'] : []) as PayMethodId[]),
  ]

  const priceLines: PriceLine[] = [
    { label: 'Pièces', amount: order.totalAmount },
    ...(order.laborCost != null && order.laborCost > 0
      ? [{ label: "Main d'œuvre", amount: order.laborCost }]
      : []),
    { label: 'Livraison', amount: order.deliveryFee },
  ]

  return (
    <div className="min-h-dvh bg-surface pb-16">
      {/* Header band */}
      <div className="bg-[linear-gradient(135deg,#00113A_0%,#002366_100%)] px-4 py-6 text-white md:px-10 md:py-10">
        <div className="mx-auto max-w-3xl lg:max-w-[1280px]">
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            Commande partagée · #{order.id.slice(0, 8)}
          </div>
          <h1 className="mt-2 font-display text-[28px] leading-tight md:text-[40px]">
            Votre mécanicien vous demande d&apos;approuver
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 md:text-base">
            {order.items.length} {order.items.length > 1 ? 'articles' : 'article'} sélectionnés.
            Vérifiez le détail, choisissez votre moyen de paiement. Fonds sous séquestre jusqu&apos;à livraison.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6 md:px-10 md:py-8 lg:max-w-[1280px] lg:py-10">
        {order.status === 'DRAFT' && (
          <div className="grid gap-6 md:grid-cols-[1fr_380px] lg:gap-10 lg:grid-cols-[1fr_420px]">
            {/* Items */}
            <div className="space-y-3">
              <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Articles
              </h2>
              <div className="overflow-hidden rounded-md border border-border bg-card">
                {order.items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3.5 px-4 py-3.5 ${idx > 0 ? 'border-t border-border' : ''}`}
                  >
                    <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                      {item.imageThumbUrl ? (
                        <img
                          src={item.imageThumbUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-muted-2">
                          —
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                      <p className="truncate text-xs text-muted">
                        {item.vendorShopName}
                        {item.category ? ` · ${item.category}` : ''}
                        {item.quantity > 1 ? ` · x${item.quantity}` : ''}
                      </p>
                    </div>
                    <Price amount={item.priceSnapshot} currency={false} className="text-sm" />
                  </div>
                ))}
              </div>
            </div>

            {/* Sidebar: breakdown + payment */}
            <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
              <PriceBreakdown
                lines={priceLines}
                total={grandTotal}
                note={
                  <span>
                    <strong>Paiement sous séquestre.</strong> L&apos;argent n&apos;est libéré au vendeur
                    qu&apos;après confirmation de livraison. Aucune marge cachée.
                  </span>
                }
              />

              <div>
                <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Moyen de paiement
                </h2>
                <div className="space-y-2">
                  {availableMethods.map((id) => {
                    const pm = PAY_METHODS[id]
                    const isSelected = selectedMethod === id
                    return (
                      <button
                        key={id}
                        onClick={() => setSelectedMethod(id)}
                        className={`flex w-full items-center gap-3 rounded-md border-2 bg-card p-3 text-left transition-all ${
                          isSelected
                            ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
                            : 'border-border hover:border-border-strong'
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm font-mono text-[13px] font-bold ${pm.bg} ${pm.fg}`}
                        >
                          {pm.short}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-ink">{pm.label}</div>
                          <div className="text-[11.5px] text-muted">{pm.subtitle}</div>
                        </div>
                        <div
                          className={`relative h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 ${
                            isSelected ? 'border-ink-2' : 'border-border-strong'
                          }`}
                        >
                          {isSelected && (
                            <div className="absolute inset-[3px] rounded-full bg-ink-2" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="rounded-sm border border-error-fg/20 bg-error-bg p-3 text-[13px] text-error-fg">
                  {error}
                </div>
              )}

              <Button
                variant="accent"
                size="lg"
                block
                onClick={handlePay}
                disabled={!selectedMethod || paying}
              >
                {paying ? 'Traitement…' : (
                  <>
                    Payer <Price amount={grandTotal} />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Non-DRAFT statuses */}
        {order.status !== 'DRAFT' && (
          <div className="space-y-4">
            {order.status === 'PAID' && (
              <StatusCard
                variant="ok"
                title="Paiement confirmé"
                description="Le vendeur a 45 minutes pour confirmer votre commande."
              />
            )}
            {order.status === 'VENDOR_CONFIRMED' && (
              <StatusCard
                variant="ok"
                title="Commande confirmée par le vendeur"
                description="Préparation en cours. Un livreur sera assigné sous peu."
              />
            )}
            {order.status === 'DISPATCHED' && (
              <StatusCard
                variant="info"
                title="Livreur en route vers le vendeur"
                description="Suivi en temps réel bientôt disponible."
              />
            )}
            {order.status === 'IN_TRANSIT' && (
              <StatusCard
                variant="info"
                title="Livraison en cours"
                description="Votre commande arrive."
              />
            )}
            {order.status === 'DELIVERED' && (
              <StatusCard
                variant="info"
                title="Livré — en attente de confirmation"
                description="Confirmez la réception pour libérer le paiement au vendeur."
              />
            )}
            {order.status === 'CONFIRMED' && (
              <StatusCard
                variant="ok"
                title="Livraison confirmée"
                description="Paiement libéré au vendeur."
              />
            )}
            {order.status === 'COMPLETED' && (
              <StatusCard
                variant="ok"
                title="Commande terminée"
                description="Merci pour votre confiance."
              />
            )}
            {order.status === 'CANCELLED' && (
              <StatusCard
                variant="err"
                title="Commande annulée"
                description="Cette commande a été annulée."
              />
            )}

            <div className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Récapitulatif
              </h2>
              <PriceBreakdown lines={priceLines} total={grandTotal} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col gap-2">
          {['DRAFT', 'PAID', 'VENDOR_CONFIRMED'].includes(order.status) && (
            <Button
              variant="secondary"
              block
              onClick={async () => {
                const res = await fetch(`/api/v1/orders/${order.id}/cancel`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                })
                if (res.ok) {
                  const body = await res.json()
                  setOrder(body.data)
                }
              }}
            >
              Annuler la commande
            </Button>
          )}

          <button
            onClick={() => router.push('/browse')}
            className="mt-1 text-center text-sm text-ink-2 underline-offset-2 hover:underline"
          >
            Retour au catalogue
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  variant,
  title,
  description,
}: {
  variant: 'ok' | 'warn' | 'err' | 'info'
  title: string
  description: string
}) {
  const classes =
    variant === 'ok'
      ? 'border-success-fg/20 bg-success-bg text-success-fg'
      : variant === 'warn'
        ? 'border-warn-fg/20 bg-warn-bg text-warn-fg'
        : variant === 'err'
          ? 'border-error-fg/20 bg-error-bg text-error-fg'
          : 'border-occasion-fg/20 bg-occasion-bg text-occasion-fg'
  const chipVariant =
    variant === 'ok'
      ? 'status-ok'
      : variant === 'warn'
        ? 'status-warn'
        : variant === 'err'
          ? 'status-err'
          : 'occasion'
  return (
    <div className={`rounded-md border p-5 ${classes}`}>
      <div className="mb-1.5">
        <Chip variant={chipVariant as 'status-ok' | 'status-warn' | 'status-err' | 'occasion'}>
          {variant === 'ok' ? 'OK' : variant === 'warn' ? 'Attention' : variant === 'err' ? 'Annulé' : 'En cours'}
        </Chip>
      </div>
      <div className="font-display text-lg leading-tight text-ink">{title}</div>
      <div className="mt-1 text-[13px] text-muted">{description}</div>
    </div>
  )
}
