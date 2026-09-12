'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import {
  ConditionChip,
  SupplyModeChip,
  PartSourceChip,
  type Condition,
  type PartSource,
} from '@/components/ui/chip'
import { PartThumb } from '@/components/ui/part-thumb'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { useCart, type CartItem } from '@/lib/cart'
import { apiFetch } from '@/lib/enterprise-api'
import { useAuth } from '@/lib/auth-context'
import {
  ABIDJAN_COMMUNES,
  computeDeliveryFee,
  DELIVERY_MODES,
  GABARIT_LABEL,
  maxGabarit,
  computePreorderSchedule,
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

/** Un acheminement chiffré par le serveur pour le panier entier. */
type CartImportQuote = {
  mode: 'SEA_LCL' | 'AIR_ECONOMY' | 'AIR_NOW'
  label: string
  detail: string
  freightFee: number
  customsFee: number
  total: number
  available: boolean
  warnings: string[]
}

export default function PanierPage() {
  const {
    items,
    itemsByVendor,
    count,
    subtotal,
    vehicle,
    commune,
    deliveryMode,
    logisticsMode,
    isImportCart,
    hasMixedSupply,
    setQuantity,
    removeItem,
    clear,
    mergeItems,
    setVehicle,
    setCommune,
    setDeliveryMode,
    setLogisticsMode,
  } = useCart()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  // Qui paie ? Ce n'est plus déduit d'un rôle : l'acheteur choisit au checkout.
  // SELF → paiement direct ; OWNER_LINK → lien de validation à partager.
  const [payer, setPayer] = useState<'SELF' | 'OWNER_LINK'>('SELF')
  const paySelf = payer === 'SELF'
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<CreatedOrder | null>(null)
  // Palier de tarification livraison : FREE par défaut, résolu côté serveur
  // depuis l'abonnement de l'entreprise du véhicule sélectionné. Le palier
  // effectif est dérivé au rendu (pas de setState synchrone dans l'effet).
  const [fetchedTier, setFetchedTier] = useState<DeliveryPricingTier>('FREE')
  // Fret et douane du panier d'import, chiffrés côté serveur (la base douanière
  // est le coût d'achat partenaire, qui ne sort pas de l'API).
  const [importQuotes, setImportQuotes] = useState<CartImportQuote[]>([])
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

  // Devis d'acheminement : rejoué à chaque changement de composition du panier.
  useEffect(() => {
    // Pas de setState synchrone ici : un devis obsolète n'est jamais affiché,
    // `activeQuote` étant conditionné à isImportCart.
    if (!isImportCart) return
    let cancelled = false
    fetch('/api/v1/browse/import-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        items: items.map((i) => ({ catalogItemId: i.catalogItemId, quantity: i.quantity })),
      }),
    })
      .then(async (r) => (r.ok ? ((await r.json()).data.options as CartImportQuote[]) : []))
      .then((options) => {
        if (!cancelled) setImportQuotes(options)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isImportCart, items])

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
        ...(isImportCart ? { logisticsMode } : {}),
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
  const vendorGroups = itemsByVendor.map((g) => ({
    subtotal: g.subtotal,
    categories: g.items.map((i) => i.category),
  }))
  const feeForMode = (mode: DeliveryPricingMode) =>
    computeDeliveryFee({ tier: deliveryTier, mode, commune, vendors: vendorGroups })
  const deliveryFee = feeForMode(deliveryMode)
  const isPlus = deliveryTier === 'PRO_FLOTTE_PLUS'
  // Gabarit affiché : la pièce la plus encombrante du panier, c'est elle qui
  // dicte le véhicule à mobiliser (et donc le plancher tarifaire).
  const cartGabarit = maxGabarit(items.map((i) => i.category))
  const modeLabel =
    deliveryMode === 'EXPRESS'
      ? 'Livraison express'
      : deliveryMode === 'ECO'
        ? 'Livraison économique'
        : 'Livraison'
  // Acheminement retenu : celui du panier s'il est praticable pour ce lot,
  // sinon la première option disponible — même repli que le serveur.
  const activeQuote = isImportCart
    ? (importQuotes.find((q) => q.mode === logisticsMode && q.available) ??
      importQuotes.find((q) => q.available) ??
      null)
    : null

  const priceLines: PriceLine[] = [
    { label: 'Sous-total pièces', amount: subtotal },
    ...(activeQuote
      ? [
          { label: `Fret — ${activeQuote.label.toLowerCase()}`, amount: activeQuote.freightFee },
          { label: 'Droits de douane', amount: activeQuote.customsFee },
        ]
      : []),
    ...(deliveryFee != null
      ? [
          {
            label: isImportCart
              ? `Livraison à ${commune} après dédouanement`
              : (vendorCount > 1
                  ? `${modeLabel} · ${commune} · ${GABARIT_LABEL[cartGabarit].toLowerCase()} (${vendorCount} vendeurs)`
                  : `${modeLabel} · ${commune} · ${GABARIT_LABEL[cartGabarit].toLowerCase()}`) +
                (isPlus ? ' — offerte' : ''),
            amount: deliveryFee,
          },
        ]
      : []),
  ]
  const grandTotal = subtotal + (activeQuote?.total ?? 0) + (deliveryFee ?? 0)

  // Échéancier de la précommande — même fonction que le serveur.
  const schedule =
    isImportCart && activeQuote
      ? computePreorderSchedule({
          partsTotal: subtotal,
          freightFee: activeQuote.freightFee,
          customsFee: activeQuote.customsFee,
          deliveryFee: deliveryFee ?? 0,
        })
      : null

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
                    <span className="ml-1 text-muted">
                      — rattachée au suivi de coûts du véhicule
                    </span>
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
                              <ConditionChip condition={item.condition as Condition} supplyMode={item.supplyMode} />
                            )}
                            <SupplyModeChip supplyMode={item.supplyMode} />
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
              {/* Un panier ne peut pas mélanger local et import : deux
                  échéanciers de paiement et deux délais incompatibles. Le dire
                  ici plutôt que de laisser l'API refuser au moment de payer. */}
              {hasMixedSupply && (
                <div className="mb-4 rounded-md border border-warn-fg/25 bg-warn-bg px-4 py-3">
                  <p className="text-[13px] font-semibold text-warn-fg">
                    Deux commandes séparées sont nécessaires.
                  </p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                    Votre panier contient à la fois des pièces disponibles à Abidjan et des pièces
                    à importer. Les premières se paient en une fois et arrivent en quelques jours ;
                    les secondes se précommandent avec un acompte. Retirez l&apos;un des deux
                    groupes pour continuer, puis passez la seconde commande.
                  </p>
                </div>
              )}

              {/* Acheminement depuis l'étranger — l'arbitrage principal d'une
                  précommande : le bateau divise le fret, l'avion divise l'attente. */}
              {isImportCart && importQuotes.length > 0 && (
                <fieldset className="mb-4 rounded-md border border-border bg-card px-4 py-3">
                  <legend className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    Acheminement depuis l&apos;étranger
                  </legend>
                  <div className="mt-1.5 space-y-1.5">
                    {importQuotes.map((quote) => (
                      <label
                        key={quote.mode}
                        className={`flex items-center justify-between gap-2 rounded-sm border px-3 py-2 ${
                          !quote.available
                            ? 'cursor-not-allowed border-border bg-surface opacity-60'
                            : activeQuote?.mode === quote.mode
                              ? 'cursor-pointer border-accent bg-accent/5'
                              : 'cursor-pointer border-border bg-surface'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <input
                            type="radio"
                            name="cart-logistics-mode"
                            value={quote.mode}
                            checked={activeQuote?.mode === quote.mode}
                            disabled={!quote.available}
                            onChange={() => setLogisticsMode(quote.mode)}
                            className="accent-accent"
                          />
                          <span className="min-w-0 text-sm text-ink">
                            {quote.label} <span className="text-xs text-muted">{quote.detail}</span>
                          </span>
                        </span>
                        <span className="shrink-0">
                          {quote.available ? (
                            <Price amount={quote.total} className="text-xs" />
                          ) : (
                            <span className="text-xs text-muted">Indisponible</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  {importQuotes
                    .filter((q) => !q.available && q.warnings.length > 0)
                    .map((q) => (
                      <p key={q.mode} className="mt-2 text-xs leading-relaxed text-muted">
                        {q.label} : {q.warnings[0]}
                      </p>
                    ))}
                </fieldset>
              )}

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
                            deliveryMode === mode
                              ? 'border-accent bg-accent/5'
                              : 'border-border bg-surface'
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
                note={
                  isImportCart
                    ? "Acompte sous séquestre, et intégralement remboursé si la pièce s'avère indisponible."
                    : "Pièces effectue la livraison et le paiement n'est libéré au vendeur qu'après votre bonne réception."
                }
              />

              {/* Échéancier de la précommande — le montant réellement appelé. */}
              {schedule && (
                <div className="mt-4 rounded-md border border-ink/15 bg-ink px-4 py-3.5 text-white">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-white/70">
                      À payer aujourd&apos;hui — acompte
                    </span>
                    <Price amount={schedule.depositAmount} className="text-base text-white" />
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[13px] text-white/70">
                      Solde à l&apos;arrivée à Abidjan
                    </span>
                    <Price amount={schedule.balanceAmount} className="text-[13px] text-white/90" />
                  </div>
                </div>
              )}

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
                disabled={submitting || hasMixedSupply}
                onClick={handleSend}
              >
                {submitting
                  ? 'Envoi…'
                  : paySelf
                    ? isImportCart
                      ? "Précommander et payer l'acompte"
                      : 'Procéder au paiement'
                    : 'Envoyer au propriétaire'}
              </Button>
              <p className="mt-2 text-center text-xs text-muted">
                {hasMixedSupply
                  ? 'Séparez les pièces à importer des pièces disponibles à Abidjan pour continuer.'
                  : paySelf
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
