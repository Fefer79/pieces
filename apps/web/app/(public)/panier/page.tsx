'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'
import { PartThumb } from '@/components/ui/part-thumb'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCart, type CartItem } from '@/lib/cart'
import { apiFetch } from '@/lib/enterprise-api'
import { useAuth } from '@/lib/auth-context'
import {
  ABIDJAN_COMMUNES,
  computeDeliveryFee,
  DELIVERY_MODES,
  type DeliveryPricingMode,
  type DeliveryPricingTier,
} from 'shared/constants'

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
  const { items, itemsByVendor, count, subtotal, vehicle, commune, setQuantity, removeItem, clear, mergeItems, setVehicle, setCommune } =
    useCart()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  // Qui paie ? Ce n'est plus déduit d'un rôle : l'acheteur choisit au checkout.
  // SELF → paiement direct ; OWNER_LINK → lien de validation à partager.
  const [payer, setPayer] = useState<'SELF' | 'OWNER_LINK'>('SELF')
  const paySelf = payer === 'SELF'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedOrder | null>(null)
  const [deliveryMode, setDeliveryMode] = useState<DeliveryPricingMode>('STANDARD')
  // Palier de tarification livraison : FREE par défaut, résolu côté serveur
  // depuis l'abonnement de l'entreprise du véhicule sélectionné. Le palier
  // effectif est dérivé au rendu (pas de setState synchrone dans l'effet).
  const [fetchedTier, setFetchedTier] = useState<DeliveryPricingTier>('FREE')
  const deliveryTier: DeliveryPricingTier =
    isAuthenticated && vehicle?.vehicleId ? fetchedTier : 'FREE'
  const hydrated = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || !vehicle?.vehicleId) return
    let cancelled = false
    apiFetch<{ tier: DeliveryPricingTier }>(
      `/orders/delivery-context?vehicleId=${encodeURIComponent(vehicle.vehicleId)}`,
    ).then((res) => {
      if (!cancelled && res.ok && res.data?.tier) setFetchedTier(res.data.tier)
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, vehicle?.vehicleId])

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
        ...(vehicle ? { vehicleId: vehicle.vehicleId } : {}),
        ...(commune ? { deliveryCommune: commune } : {}),
        deliveryMode,
        payerMode: payer,
      }),
    })
    if (res.ok) {
      // Vide le brouillon-panier serveur pour qu'il ne se re-hydrate pas.
      if (isAuthenticated) {
        await apiFetch('/orders/draft', { method: 'PUT', body: JSON.stringify({ items: [] }) })
      }
      clear()
      // « Je paie moi-même » : aller droit au paiement. Sinon : écran de partage du lien.
      if (paySelf) {
        router.push(`/choose/${res.data.shareToken}`)
        return
      }
      setCreated(res.data)
    } else {
      setError(res.message)
    }
    setSubmitting(false)
  }

  // Frais de livraison : % du sous-total par vendeur (chacun expédie séparément),
  // plancher zone / plafond palier. Même helper que le serveur (createOrder) —
  // l'affichage est donc exactement le montant facturé.
  const vendorCount = itemsByVendor.length
  const vendorSubtotals = itemsByVendor.map((g) => g.subtotal)
  const feeForMode = (mode: DeliveryPricingMode) =>
    computeDeliveryFee({ tier: deliveryTier, mode, commune, vendorSubtotals })
  const deliveryFee = feeForMode(deliveryMode)
  const isPlus = deliveryTier === 'PRO_FLOTTE_PLUS'
  const modeLabel = deliveryMode === 'EXPRESS' ? 'Livraison express' : 'Livraison'
  const priceLines: PriceLine[] = [
    { label: 'Sous-total pièces', amount: subtotal },
    ...(deliveryFee != null
      ? [
          {
            label:
              (vendorCount > 1
                ? `${modeLabel} · ${commune} (${vendorCount} vendeurs)`
                : `${modeLabel} · ${commune}`) + (isPlus ? ' — offerte' : ''),
            amount: deliveryFee,
          },
        ]
      : []),
  ]
  const grandTotal = subtotal + (deliveryFee ?? 0)

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
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Lignes groupées par vendeur */}
            <div className="min-w-0 space-y-5">
              <div className="flex items-baseline justify-between">
                <h1 className="font-display text-2xl text-ink lg:text-3xl">Ma sélection</h1>
                <span className="font-mono tabular text-sm text-muted">
                  {count} article{count > 1 ? 's' : ''}
                </span>
              </div>

              {vehicle && (
                <div className="flex items-center justify-between gap-3 rounded-md border border-accent/30 bg-accent/5 px-4 py-2.5">
                  <span className="min-w-0 text-sm text-ink">
                    🔧 Commande pour&nbsp;
                    <span className="font-semibold">{vehicle.label}</span>
                    <span className="ml-1 text-muted">— rattachée au suivi de coûts du véhicule</span>
                  </span>
                  <button
                    onClick={() => setVehicle(null)}
                    className="ml-3 shrink-0 text-xs text-muted hover:text-ink hover:underline"
                  >
                    Détacher
                  </button>
                </div>
              )}

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
                          <PartThumb src={item.imageThumbUrl} alt={item.name} />
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
            <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
              {/* Lieu de livraison : persisté depuis la fiche produit, modifiable ici. */}
              <div className="mb-4 rounded-md border border-border bg-card px-4 py-3">
                <label
                  htmlFor="cart-delivery-commune"
                  className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
                >
                  Lieu de livraison
                </label>
                <select
                  id="cart-delivery-commune"
                  value={commune}
                  onChange={(e) => setCommune(e.target.value)}
                  className="mt-1.5 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">Choisir votre commune…</option>
                  {ABIDJAN_COMMUNES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                {/* Mode de livraison : tarifs du palier, affichés dès qu'une commune est choisie. */}
                <fieldset className="mt-3">
                  <legend className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    Mode de livraison
                  </legend>
                  <div className="mt-1.5 space-y-1.5">
                    {DELIVERY_MODES.map(({ mode, label, detail }) => {
                      const fee = feeForMode(mode)
                      return (
                        <label
                          key={mode}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-sm border px-3 py-2 ${
                            deliveryMode === mode ? 'border-accent bg-accent/5' : 'border-border bg-surface'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="cart-delivery-mode"
                              value={mode}
                              checked={deliveryMode === mode}
                              onChange={() => setDeliveryMode(mode)}
                              className="accent-accent"
                            />
                            <span className="text-sm text-ink">
                              {label} <span className="text-xs text-muted">{detail}</span>
                            </span>
                          </span>
                          <span className="shrink-0">
                            {fee == null ? (
                              <span className="text-xs text-muted">—</span>
                            ) : fee === 0 ? (
                              <span className="text-xs font-semibold text-accent">Offerte</span>
                            ) : (
                              <Price amount={fee} className="text-xs" />
                            )}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>

              <PriceBreakdown
                lines={priceLines}
                total={grandTotal}
                note="Pièces effectue la livraison et le paiement n'est libéré au vendeur qu'après votre bonne réception."
              />

              {/* Qui paie ? — choix explicite au checkout, quel que soit le profil. */}
              <fieldset className="mt-4 rounded-md border border-border bg-card px-4 py-3">
                <legend className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Qui paie cette commande ?
                </legend>
                <div className="mt-1.5 space-y-1.5">
                  {(
                    [
                      { value: 'SELF', label: 'Je paie moi-même', detail: 'paiement immédiat' },
                      {
                        value: 'OWNER_LINK',
                        label: 'Le propriétaire du véhicule',
                        detail: 'lien de validation à lui envoyer',
                      },
                    ] as const
                  ).map(({ value, label, detail }) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 ${
                        payer === value ? 'border-accent bg-accent/5' : 'border-border bg-surface'
                      }`}
                    >
                      <input
                        type="radio"
                        name="cart-payer"
                        value={value}
                        checked={payer === value}
                        onChange={() => setPayer(value)}
                        className="accent-accent"
                      />
                      <span className="text-sm text-ink">
                        {label} <span className="text-xs text-muted">{detail}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

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
                {submitting
                  ? 'Envoi…'
                  : paySelf
                    ? 'Procéder au paiement'
                    : 'Envoyer au propriétaire'}
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                {paySelf
                  ? 'Vous passez directement au choix du moyen de paiement.'
                  : 'Un lien de validation et de paiement sera généré.'}
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
