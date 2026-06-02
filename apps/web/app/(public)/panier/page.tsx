'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCart, type CartItem } from '@/lib/cart'
import { apiFetch } from '@/lib/enterprise-api'
import { useAuth } from '@/lib/auth-context'

type CreatedOrder = { id: string; shareToken: string }

type DraftItem = {
  catalogItemId: string
  name: string
  category: string | null
  vendorId: string
  vendorShopName: string
  priceSnapshot: number
  quantity: number
  imageThumbUrl: string | null
}
type Draft = { items: DraftItem[] } | null

export default function PanierPage() {
  const { items, itemsByVendor, count, subtotal, setQuantity, removeItem, clear, mergeItems } =
    useCart()
  const { isAuthenticated } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedOrder | null>(null)
  const hydrated = useRef(false)

  // Hybride : au montage (connecté), fusionner le brouillon serveur dans le local.
  useEffect(() => {
    if (!isAuthenticated || hydrated.current) return
    let cancelled = false
    apiFetch<Draft>('/orders/draft').then((res) => {
      if (cancelled) return
      hydrated.current = true
      if (res.ok && res.data?.items?.length) {
        const incoming: CartItem[] = res.data.items.map((d) => ({
          catalogItemId: d.catalogItemId,
          name: d.name,
          category: d.category,
          vendorId: d.vendorId,
          vendorShopName: d.vendorShopName,
          price: d.priceSnapshot,
          condition: null,
          partSource: null,
          imageThumbUrl: d.imageThumbUrl,
          quantity: d.quantity,
        }))
        mergeItems(incoming)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, mergeItems])

  // Hybride : pousser le panier local vers le brouillon serveur (debounce), après hydratation.
  useEffect(() => {
    if (!isAuthenticated || !hydrated.current || created) return
    const t = setTimeout(() => {
      void apiFetch('/orders/draft', {
        method: 'PUT',
        body: JSON.stringify({
          items: items.map((i) => ({ catalogItemId: i.catalogItemId, quantity: i.quantity })),
        }),
      })
    }, 800)
    return () => clearTimeout(t)
  }, [items, isAuthenticated, created])

  async function handleSend() {
    setSubmitting(true)
    setError(null)
    const res = await apiFetch<CreatedOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((i) => ({ catalogItemId: i.catalogItemId, quantity: i.quantity })),
      }),
    })
    if (res.ok) {
      // Vide le brouillon-panier serveur pour qu'il ne se re-hydrate pas.
      if (isAuthenticated) {
        await apiFetch('/orders/draft', { method: 'PUT', body: JSON.stringify({ items: [] }) })
      }
      setCreated(res.data)
      clear()
    } else {
      setError(res.message)
    }
    setSubmitting(false)
  }

  const priceLines: PriceLine[] = [{ label: 'Sous-total pièces', amount: subtotal }]

  return (
    <div className="min-h-dvh bg-surface pb-24 lg:pb-8">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Ma sélection</span>
          </Link>
          <Link href="/browse" className="text-sm font-medium text-ink-2 hover:underline">
            ← Continuer mes achats
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {/* Confirmation : commande créée */}
        {created && (
          <div className="mx-auto max-w-lg rounded-md border border-border bg-card p-6 text-center">
            <h1 className="font-display text-2xl text-ink">Sélection envoyée</h1>
            <p className="mt-2 text-sm text-muted">
              Partagez ce lien avec le propriétaire pour qu&apos;il valide et paie. La décomposition
              complète des prix (pièces, main-d&apos;œuvre, livraison, frais) y est affichée.
            </p>
            <Link
              href={`/choose/${created.shareToken}`}
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              Ouvrir la page de validation →
            </Link>
            <ShareLink shareToken={created.shareToken} />
            <Link href="/browse" className="mt-5 block">
              <Button variant="secondary" block>
                Nouvelle sélection
              </Button>
            </Link>
          </div>
        )}

        {/* Panier vide */}
        {!created && items.length === 0 && (
          <div className="mx-auto mt-8 max-w-md rounded-md border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">Votre sélection est vide.</p>
            <Link
              href="/browse"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Parcourir les pièces
            </Link>
          </div>
        )}

        {/* Panier rempli */}
        {!created && items.length > 0 && (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Lignes groupées par vendeur */}
            <div className="space-y-5">
              <div className="flex items-baseline justify-between">
                <h1 className="font-display text-2xl text-ink lg:text-3xl">Ma sélection</h1>
                <span className="font-mono tabular text-sm text-muted">
                  {count} article{count > 1 ? 's' : ''}
                </span>
              </div>

              {itemsByVendor.map((group) => (
                <div
                  key={group.vendorId}
                  className="overflow-hidden rounded-md border border-border bg-card"
                >
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="text-sm font-semibold text-ink">{group.vendorShopName}</span>
                    <Price amount={group.subtotal} className="text-sm" />
                  </div>
                  <ul className="divide-y divide-border">
                    {group.items.map((item) => (
                      <li key={item.catalogItemId} className="flex gap-3.5 px-4 py-3.5">
                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                          {item.imageThumbUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageThumbUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
                              —
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/produit/${item.catalogItemId}`}
                            className="truncate text-sm font-medium text-ink hover:underline"
                          >
                            {item.name}
                          </Link>
                          <p className="truncate text-xs text-muted">{item.category ?? '—'}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {item.condition && (
                              <ConditionChip condition={item.condition as Condition} />
                            )}
                            {item.partSource && (
                              <PartSourceChip source={item.partSource as PartSource} />
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-3">
                            <QuantityStepper
                              size="sm"
                              value={item.quantity}
                              onChange={(q) => setQuantity(item.catalogItemId, q)}
                            />
                            <div className="flex items-center gap-3">
                              {item.price != null ? (
                                <Price amount={item.price * item.quantity} className="text-sm" />
                              ) : (
                                <span className="text-xs text-muted">Prix sur demande</span>
                              )}
                              <button
                                type="button"
                                onClick={() => removeItem(item.catalogItemId)}
                                className="text-xs text-muted hover:text-error-fg"
                                aria-label="Retirer"
                              >
                                Retirer
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Récapitulatif */}
            <aside className="lg:sticky lg:top-6 lg:self-start">
              <PriceBreakdown
                lines={priceLines}
                total={subtotal}
                note="Main-d'œuvre, livraison et frais plateforme calculés à la commande — aucun frais caché."
              />

              {error && (
                <p className="mt-3 rounded-sm bg-error-bg px-3 py-2 text-[12.5px] text-error-fg">
                  {error}
                </p>
              )}

              <Button
                variant="accent"
                size="lg"
                block
                className="mt-4"
                disabled={submitting}
                onClick={handleSend}
              >
                {submitting ? 'Envoi…' : 'Envoyer au propriétaire'}
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                Un lien de validation et de paiement sera généré.
              </p>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

function ShareLink({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/choose/${shareToken}` : ''

  return (
    <div className="mt-4 flex items-center gap-2 rounded-sm border border-border bg-surface px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-left font-mono text-xs text-muted">{url}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(url).then(
            () => {
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            },
            () => {},
          )
        }}
        className="flex-shrink-0 text-xs font-medium text-accent hover:underline"
      >
        {copied ? 'Copié ✓' : 'Copier'}
      </button>
    </div>
  )
}
