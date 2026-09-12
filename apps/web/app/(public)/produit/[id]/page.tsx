'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import {
  ConditionChip,
  PartSourceChip,
  SupplyModeChip,
  type Condition,
  type PartSource,
} from '@/components/ui/chip'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { MiniCartButton } from '@/components/cart/mini-cart'
import { useCart } from '@/lib/cart'
import { useSelectedVehicle, type SelectedVehicle } from '@/lib/selected-vehicle'
import { apiFetch } from '@/lib/enterprise-api'
import { createClient } from '@/lib/supabase'
import {
  ABIDJAN_COMMUNES,
  DELIVERY_MODES,
  type DeliveryPricingMode,
  computeDeliveryFee,
  formatWarranty,
  warrantyLabel,
  RETURN_POLICY,
  computePreorderSchedule,
  originCountryLabel,
  type ImportFreightMode,
  type WarrantyUnit,
} from 'shared/constants'

const WA_NUMBER = '2250706846268'

type Photo = {
  id: string
  urlThumb: string | null
  urlMedium: string | null
  urlLarge: string | null
  urlOriginal: string | null
}

type Fitment = {
  id: string
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
  engine: string | null
}

type Vendor = {
  id: string
  shopName: string
  aggregateRating: number | null
  avgReviewRating: number | null
  ordersDelivered: number
  reviewsCount: number
}

type ProductDetail = {
  id: string
  name: string | null
  category: string | null
  oemReference: string | null
  vehicleCompatibility: string | null
  condition: Condition | null
  partSource: PartSource | null
  supplyMode: 'LOCAL' | 'IMPORT' | null
  originCountry: string | null
  supplierLeadDays: number | null
  price: number | null
  warrantyValue: number | null
  warrantyUnit: WarrantyUnit | null
  inStock: boolean
  isUniversallyCompatible: boolean
  imageOriginalUrl: string | null
  imageThumbUrl: string | null
  imageSmallUrl: string | null
  imageMediumUrl: string | null
  imageLargeUrl: string | null
  vendor: Vendor
  photos: Photo[]
  fitments: Fitment[]
}

/** Un acheminement chiffré par le serveur (fret + douane). */
type ImportQuote = {
  mode: ImportFreightMode
  label: string
  detail: string
  transitDays: number
  freightFee: number
  customsFee: number
  total: number
  available: boolean
  warnings: string[]
}

type CompareOffer = {
  id: string
  vendorId: string
  vendorName: string
  vendorRating: number | null
  price: number | null
  condition: string | null
  partSource: string | null
  warrantyValue: number | null
  warrantyUnit: WarrantyUnit | null
  valueScore: number | null
}

type CompareGroup = {
  oemReference: string | null
  offers: CompareOffer[]
}

function photoUrl(p: Photo): string | null {
  return p.urlLarge ?? p.urlMedium ?? p.urlOriginal ?? p.urlThumb
}

function fitmentLabel(f: Fitment): string {
  const years =
    f.yearFrom && f.yearTo
      ? ` (${f.yearFrom}–${f.yearTo})`
      : f.yearFrom
        ? ` (depuis ${f.yearFrom})`
        : f.yearTo
          ? ` (jusqu'à ${f.yearTo})`
          : ''
  return [f.brand, f.model].filter(Boolean).join(' ') + years + (f.engine ? ` · ${f.engine}` : '')
}

// Reproduit la logique de fitment de compareParts (browse.service) côté client.
function matchesVehicle(fitments: Fitment[], vehicle: SelectedVehicle): boolean {
  const brand = vehicle.brand.trim().toLowerCase()
  const model = vehicle.model.trim().toLowerCase()
  const year = parseInt(vehicle.year, 10)
  return fitments.some((f) => {
    if (f.brand.trim().toLowerCase() !== brand) return false
    if (f.model && model && f.model.trim().toLowerCase() !== model) return false
    if (!Number.isNaN(year)) {
      if (f.yearFrom != null && year < f.yearFrom) return false
      if (f.yearTo != null && year > f.yearTo) return false
    }
    return true
  })
}

/** Note vendeur « façon Amazon » : étoiles pleines selon la note, + nombre d'avis vérifiés. */
function VendorRating({ rating, reviewsCount }: { rating: number | null; reviewsCount: number }) {
  const value = rating ?? 0
  const rounded = Math.round(value * 2) / 2
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`text-sm leading-none ${
              i <= rounded ? 'text-[#F5A623]' : 'text-border-strong'
            }`}
          >
            ★
          </span>
        ))}
      </span>
      {reviewsCount > 0 ? (
        <span className="text-xs text-muted">
          {value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} · {reviewsCount} avis
          vérifié{reviewsCount > 1 ? 's' : ''}
        </span>
      ) : (
        <span className="text-xs text-muted-2">Pas encore d&apos;avis</span>
      )}
    </div>
  )
}

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { vehicle } = useSelectedVehicle()
  const {
    addItem,
    commune: deliveryCommune,
    setCommune: setDeliveryCommune,
    deliveryMode,
    setDeliveryMode,
    logisticsMode,
    setLogisticsMode,
  } = useCart()

  const [item, setItem] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [buying, setBuying] = useState(false)
  const [offers, setOffers] = useState<CompareOffer[]>([])
  const [offerSort, setOfferSort] = useState<'price' | 'value'>('value')
  const [importQuotes, setImportQuotes] = useState<ImportQuote[]>([])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    fetch(`/api/v1/browse/items/${id}`)
      .then(async (r) => {
        if (!r.ok) return null
        const body = await r.json()
        return body.data as ProductDetail
      })
      .then((data) => {
        if (cancelled) return
        if (data) setItem(data)
        else setError(true)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Fret et douane d'une pièce à importer. Chiffrés côté serveur : la base
  // douanière est le coût d'achat chez le partenaire, qui ne sort pas de l'API.
  const isImport = item?.supplyMode === 'IMPORT'
  useEffect(() => {
    // Pas de setState synchrone ici : `activeQuote` est conditionné à isImport,
    // un devis laissé derrière n'est donc jamais affiché.
    if (!item || item.supplyMode !== 'IMPORT') return
    let cancelled = false
    fetch('/api/v1/browse/import-quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items: [{ catalogItemId: item.id, quantity: qty }] }),
    })
      .then(async (r) => (r.ok ? ((await r.json()).data.options as ImportQuote[]) : []))
      .then((options) => {
        if (!cancelled) setImportQuotes(options)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [item, qty])

  // Offres concurrentes : autres vendeurs ayant la même référence OEM.
  useEffect(() => {
    if (!item?.oemReference) return
    let cancelled = false
    fetch(`/api/v1/browse/compare?oem=${encodeURIComponent(item.oemReference)}&sort=${offerSort}`)
      .then(async (r) =>
        r.ok ? ((await r.json()).data as { groups: CompareGroup[] } | CompareGroup[]) : [],
      )
      .then((data) => {
        if (cancelled) return
        const groups = Array.isArray(data) ? data : data.groups
        const all = groups.flatMap((g) => g.offers)
        setOffers(all.filter((o) => o.id !== item.id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [item?.oemReference, item?.id, offerSort])

  // Galerie : photos dédiées sinon images principales de la fiche
  const gallery: string[] = item
    ? item.photos.map(photoUrl).filter((u): u is string => !!u).length > 0
      ? item.photos.map(photoUrl).filter((u): u is string => !!u)
      : [item.imageLargeUrl ?? item.imageMediumUrl ?? item.imageOriginalUrl].filter(
          (u): u is string => !!u,
        )
    : []

  // Estimation au palier Gratuit (la fiche produit n'a pas de contexte flotte) —
  // même formule que le panier et le serveur (delivery-pricing.ts). Le délai
  // choisi ici est persisté dans le panier et suit jusqu'au paiement.
  const feeForMode = (mode: DeliveryPricingMode): number | null =>
    item?.price != null
      ? computeDeliveryFee({
          tier: 'FREE',
          mode,
          commune: deliveryCommune,
          vendors: [{ subtotal: item.price * qty, categories: [item.category] }],
        })
      : null
  const deliveryFee = feeForMode(deliveryMode)
  const modeLabel = DELIVERY_MODES.find((m) => m.mode === deliveryMode)?.label ?? 'Standard'

  // Acheminement retenu : celui du panier s'il est praticable pour cette pièce,
  // sinon la première option disponible (le bateau n'a pas de sens sur une
  // bougie — le serveur applique exactement le même repli).
  const activeQuote = isImport
    ? (importQuotes.find((q) => q.mode === logisticsMode && q.available) ??
      importQuotes.find((q) => q.available) ??
      null)
    : null

  const partsTotal = item?.price != null ? item.price * qty : 0

  // Échéancier de la précommande — même fonction que le serveur, pour que le
  // montant annoncé ici soit celui qui sera appelé au paiement.
  const schedule =
    isImport && activeQuote
      ? computePreorderSchedule({
          partsTotal,
          freightFee: activeQuote.freightFee,
          customsFee: activeQuote.customsFee,
          deliveryFee: deliveryFee ?? 0,
        })
      : null

  const priceLines: PriceLine[] =
    item?.price != null
      ? [
          { label: `Prix pièce × ${qty}`, amount: partsTotal },
          // Fret et douane : les deux lignes qui distinguent une pièce à
          // importer d'une pièce déjà à Abidjan. Jamais fondues dans le prix.
          ...(activeQuote
            ? [
                { label: `Fret — ${activeQuote.label.toLowerCase()}`, amount: activeQuote.freightFee },
                { label: 'Droits de douane', amount: activeQuote.customsFee },
              ]
            : []),
          ...(deliveryFee != null
            ? [
                {
                  label: isImport
                    ? `Livraison à ${deliveryCommune} après dédouanement`
                    : `Livraison ${modeLabel.toLowerCase()} · ${deliveryCommune}`,
                  amount: deliveryFee,
                },
              ]
            : []),
        ]
      : []

  const priceTotal =
    item?.price != null
      ? partsTotal + (activeQuote?.total ?? 0) + (deliveryFee ?? 0)
      : 0

  const compatibility = useMemo(() => {
    if (!item || !vehicle || item.fitments.length === 0) return null
    return matchesVehicle(item.fitments, vehicle)
  }, [item, vehicle])

  function handleAdd() {
    if (!item) return
    addItem(
      {
        catalogItemId: item.id,
        name: item.name ?? 'Pièce',
        category: item.category,
        vendorId: item.vendor.id,
        vendorShopName: item.vendor.shopName,
        price: item.price,
        condition: item.condition,
        partSource: item.partSource,
        supplyMode: item.supplyMode,
        originCountry: item.originCountry,
        imageThumbUrl: item.imageThumbUrl,
      },
      qty,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  async function handleBuyNow() {
    if (!item) return
    setBuying(true)

    // Non connecté → renvoyer vers la connexion, avec retour sur cette fiche.
    const {
      data: { session },
    } = await createClient().auth.getSession()
    if (!session) {
      const returnTo = `/produit/${item.id}`
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }

    const res = await apiFetch<{ shareToken: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        items: [{ catalogItemId: item.id, quantity: qty }],
        ...(deliveryCommune ? { deliveryCommune } : {}),
        deliveryMode,
        // Acheminement choisi sur cette fiche — le serveur re-tarife et bascule
        // sur une option praticable si celle-ci ne l'est pas pour ce colis.
        ...(isImport ? { logisticsMode: activeQuote?.mode ?? logisticsMode } : {}),
      }),
    })
    setBuying(false)
    if (res.ok) router.push(`/choose/${res.data.shareToken}`)
  }

  const warrantyText = formatWarranty(item?.warrantyValue, item?.warrantyUnit)
  // La garantie est décidée par le vendeur, pièce par pièce : sans garantie, on
  // le dit — plus de « Garantie : 7J » par défaut, qui n'engageait personne.
  const warranty = warrantyLabel(item?.warrantyValue, item?.warrantyUnit)

  return (
    <div className="min-h-dvh bg-surface pb-24 lg:pb-8">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Fiche produit</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/browse" className="text-sm font-medium text-ink-2 hover:underline">
              ← Retour
            </Link>
            <MiniCartButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {loading && <p className="py-16 text-center text-sm text-muted">Chargement…</p>}

        {error && !loading && (
          <div className="mx-auto mt-8 max-w-md rounded-md border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">
              Cette pièce est introuvable ou n&apos;est plus disponible.
            </p>
            <Link
              href="/browse"
              className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
            >
              Retour à la recherche
            </Link>
          </div>
        )}

        {item && !loading && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Galerie */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-card">
                {gallery[activePhoto] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={gallery[activePhoto]}
                    alt={item.name ?? ''}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-2">
                    Pas de photo
                  </div>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {gallery.map((url, i) => (
                    <button
                      key={url}
                      onClick={() => setActivePhoto(i)}
                      className={`h-16 w-16 overflow-hidden rounded-sm border-2 transition-colors ${
                        i === activePhoto
                          ? 'border-accent'
                          : 'border-border hover:border-border-strong'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Décision */}
            <div>
              {/* 1. Bandeau compatibilité contextuel */}
              {compatibility !== null && (
                <div
                  className={`mb-4 flex items-start gap-2 rounded-md px-3.5 py-2.5 text-[13px] font-medium ${
                    compatibility
                      ? 'bg-success-bg text-success-fg'
                      : item.isUniversallyCompatible
                        ? 'bg-card ring-1 ring-border'
                        : 'bg-warning-bg text-warning-fg'
                  }`}
                >
                  <span aria-hidden>
                    {compatibility ? '✅' : item.isUniversallyCompatible ? '🌐' : '⚠️'}
                  </span>
                  <span>
                    {compatibility
                      ? `Compatible avec votre ${vehicle!.brand} ${vehicle!.model} ${vehicle!.year}`
                      : item.isUniversallyCompatible
                        ? "Pièce compatible universelle — s'adapte à tous les véhicules"
                        : `Compatibilité non confirmée avec votre ${vehicle!.brand} ${vehicle!.model} ${vehicle!.year}`}
                  </span>
                </div>
              )}
              {compatibility === null &&
                item.isUniversallyCompatible &&
                item.fitments.length === 0 && (
                  <div className="mb-4 flex items-start gap-2 rounded-md bg-card px-3.5 py-2.5 text-[13px] font-medium ring-1 ring-border">
                    <span aria-hidden>🌐</span>
                    <span>Pièce compatible universelle — s&apos;adapte à tous les véhicules</span>
                  </div>
                )}

              {/* 2. Titre + chips */}
              <h1 className="font-display text-2xl text-ink lg:text-3xl">{item.name ?? 'Pièce'}</h1>
              <p className="mt-1 text-sm text-muted">{item.category ?? 'Pièce'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.condition && <ConditionChip condition={item.condition} supplyMode={item.supplyMode} />}
                <SupplyModeChip supplyMode={item.supplyMode} />
                {item.partSource && <PartSourceChip source={item.partSource} />}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] leading-tight ${
                    warranty.hasWarranty
                      ? 'bg-success-bg text-success-fg'
                      : 'bg-surface text-muted ring-1 ring-border'
                  }`}
                >
                  {warranty.text}
                </span>
                {!item.inStock && (
                  <span className="rounded-sm bg-surface px-2 py-1 text-xs font-medium text-muted">
                    Rupture de stock
                  </span>
                )}
              </div>

              {/* 2 bis. Pièce à importer : le dire avant le prix. Le client doit
                  savoir qu'il précommande une pièce qui n'est pas encore dans
                  le pays — c'est la contrepartie de l'acompte. */}
              {isImport && (
                <div className="mt-4 rounded-md border border-import-fg/25 bg-import-bg p-4">
                  <p className="text-[13.5px] font-semibold text-import-fg">
                    {item.condition === 'NEW'
                      ? 'Pièce neuve à faire venir en Côte d’Ivoire.'
                      : item.condition === 'USED'
                        ? 'Pièce d’occasion à faire venir en Côte d’Ivoire.'
                        : 'Pièce à faire venir en Côte d’Ivoire.'}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    Cette référence est en stock chez un partenaire international
                    {originCountryLabel(item.originCountry)
                      ? ` (${originCountryLabel(item.originCountry)})`
                      : ''}
                    . Elle n&apos;est pas à Abidjan aujourd&apos;hui : vous précommandez, nous
                    l&apos;achetons, l&apos;acheminons et la dédouanons pour vous.
                  </p>
                  {activeQuote && (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                      Délai estimé :{' '}
                      <strong className="font-semibold text-ink">
                        {item.supplierLeadDays
                          ? `${item.supplierLeadDays + Math.round(activeQuote.transitDays)} jours`
                          : activeQuote.detail}
                      </strong>{' '}
                      — préparation chez le partenaire puis {activeQuote.label.toLowerCase()}.
                    </p>
                  )}
                </div>
              )}

              {!item.inStock && (
                <div className="mt-3 rounded-md border border-accent/30 bg-accent/5 p-4">
                  <p className="text-[13.5px] leading-relaxed text-ink">
                    Cette pièce n&apos;est pas en stock actuellement. Vous pouvez la faire importer
                    — estimation immédiate, sans compte, en deux minutes.
                  </p>
                  <Link
                    href={`/logistique/devis?piece=${encodeURIComponent(item.name ?? '')}${
                      item.oemReference ? `&oem=${encodeURIComponent(item.oemReference)}` : ''
                    }`}
                    className="mt-2 inline-block rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
                  >
                    Demander une cotation d&apos;import →
                  </Link>
                </div>
              )}

              {/* 3. Bloc vendeur — note d'abord (façon Amazon), nom discret */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <VendorRating
                    rating={item.vendor.avgReviewRating ?? item.vendor.aggregateRating}
                    reviewsCount={item.vendor.reviewsCount}
                  />
                  <p className="mt-1 text-xs text-muted-2">
                    Vendu par <span className="text-muted">{item.vendor.shopName}</span>
                  </p>
                </div>
              </div>

              {/* 5. Prix (recalculé × quantité + livraison) */}
              {item.price != null ? (
                <div className="mt-5 space-y-3">
                  {/* Acheminement depuis l'étranger — l'arbitrage principal
                      d'une précommande : le bateau divise le fret, l'avion
                      divise l'attente. Une option impraticable est affichée
                      grisée AVEC son motif, jamais masquée. */}
                  {isImport && importQuotes.length > 0 && (
                    <fieldset className="rounded-md border border-border bg-card px-4 py-3">
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
                                name="produit-logistics-mode"
                                value={quote.mode}
                                checked={activeQuote?.mode === quote.mode}
                                disabled={!quote.available}
                                onChange={() => setLogisticsMode(quote.mode)}
                                className="accent-accent"
                              />
                              <span className="min-w-0 text-sm text-ink">
                                {quote.label}{' '}
                                <span className="text-xs text-muted">{quote.detail}</span>
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
                      <p className="mt-2 text-xs text-muted-2">
                        Fret et droits de douane inclus dans le montant affiché.
                      </p>
                    </fieldset>
                  )}

                  {/* Lieu de livraison → frais de livraison */}
                  <div className="rounded-md border border-border bg-card px-4 py-3">
                    <label
                      htmlFor="delivery-commune"
                      className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted"
                    >
                      Lieu de livraison
                    </label>
                    <select
                      id="delivery-commune"
                      value={deliveryCommune}
                      onChange={(e) => setDeliveryCommune(e.target.value)}
                      // La commune est persistée dans le panier (cart store) →
                      // elle survit à la navigation vers /panier et au paiement.
                      className="mt-1.5 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                    >
                      <option value="">Choisir votre commune…</option>
                      {ABIDJAN_COMMUNES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    {deliveryFee == null ? (
                      <p className="mt-1.5 text-xs text-muted">
                        Sélectionnez votre commune pour calculer les frais de livraison.
                      </p>
                    ) : (
                      <fieldset className="mt-3">
                        <legend className="block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                          Délai de livraison
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
                                <span className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="radio"
                                    name="produit-delivery-mode"
                                    value={mode}
                                    checked={deliveryMode === mode}
                                    // Persisté dans le panier comme la commune :
                                    // le choix survit à la navigation et au paiement.
                                    onChange={() => setDeliveryMode(mode)}
                                    className="accent-accent"
                                  />
                                  <span className="min-w-0 text-sm text-ink">
                                    {label} <span className="text-xs text-muted">{detail}</span>
                                  </span>
                                </span>
                                <span className="shrink-0">
                                  {fee == null ? (
                                    <span className="text-xs text-muted">—</span>
                                  ) : fee === 0 ? (
                                    <span className="text-xs font-semibold text-accent">
                                      Offerte
                                    </span>
                                  ) : (
                                    <Price amount={fee} className="text-xs" />
                                  )}
                                </span>
                              </label>
                            )
                          })}
                        </div>
                      </fieldset>
                    )}
                  </div>

                  <PriceBreakdown title="Prix" eyebrow="" lines={priceLines} total={priceTotal} />

                  {/* Échéancier : c'est l'information qui décide de l'achat.
                      Un client qui découvre l'acompte au moment de payer se
                      sent piégé — il le lit ici, avant d'ajouter au panier. */}
                  {schedule && (
                    <div className="rounded-md border border-ink/15 bg-ink px-4 py-3.5 text-white">
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
                      <p className="mt-2.5 text-xs leading-relaxed text-white/70">
                        Si le partenaire ne peut finalement pas fournir la pièce, votre acompte
                        vous est <strong className="font-semibold text-white">intégralement
                        remboursé</strong>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 rounded-md border border-border bg-card p-5 text-sm text-muted">
                  Prix sur demande.
                </div>
              )}

              {/* 4. Quantité + CTA */}
              <div className="mt-4 flex items-center gap-3">
                <QuantityStepper value={qty} onChange={setQty} />
                <Button
                  variant="accent"
                  size="lg"
                  block
                  onClick={handleAdd}
                  disabled={!item.inStock}
                >
                  {added ? 'Ajouté ✓' : 'Ajouter à la sélection'}
                </Button>
              </div>
              <Button
                variant="secondary"
                size="lg"
                block
                className="mt-2.5"
                onClick={handleBuyNow}
                disabled={!item.inStock || buying}
              >
                {buying ? 'Préparation…' : 'Acheter maintenant'}
              </Button>

              {/* Caractéristiques */}
              <dl className="mt-6 divide-y divide-border rounded-md border border-border bg-card text-sm">
                {item.oemReference && (
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-muted">Référence OEM</dt>
                    <dd className="font-mono text-ink">{item.oemReference}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">Garantie</dt>
                  <dd className="text-ink">{warrantyText ?? 'Aucune — fixée par le vendeur'}</dd>
                </div>
              </dl>

              {/* Socle de reprise : ce que l'acheteur obtient même sans garantie. */}
              <div className="mt-3 rounded-md border border-border bg-card p-4">
                <p className="text-sm font-medium text-ink">{RETURN_POLICY.title}</p>
                <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted">
                  {RETURN_POLICY.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span aria-hidden className="text-success-fg">
                        ✓
                      </span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Compatibilité véhicule */}
              {(item.fitments.length > 0 || item.vehicleCompatibility) && (
                <div className="mt-5">
                  <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                    Véhicules compatibles
                  </h2>
                  {item.fitments.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {item.fitments.map((f) => (
                        <li
                          key={f.id}
                          className="rounded-sm border border-border bg-card px-2.5 py-1 text-xs text-ink"
                        >
                          {fitmentLabel(f)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">{item.vehicleCompatibility}</p>
                  )}
                </div>
              )}

              {/* 6. Offres concurrentes */}
              {offers.length > 0 &&
                (() => {
                  const bestValueId = offers.reduce<CompareOffer | null>((acc, o) => {
                    if (o.valueScore == null) return acc
                    return acc == null || o.valueScore > (acc.valueScore ?? -1) ? o : acc
                  }, null)?.id
                  return (
                    <div className="mt-6">
                      <div className="flex items-center justify-between gap-3">
                        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                          {offers.length} autre{offers.length > 1 ? 's' : ''} vendeur
                          {offers.length > 1 ? 's' : ''} pour cette pièce
                        </h2>
                        <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5 text-[11px]">
                          <button
                            onClick={() => setOfferSort('value')}
                            className={`rounded-sm px-2 py-1 font-medium ${offerSort === 'value' ? 'bg-ink-2 text-white' : 'text-muted hover:text-ink'}`}
                          >
                            Qualité-prix
                          </button>
                          <button
                            onClick={() => setOfferSort('price')}
                            className={`rounded-sm px-2 py-1 font-medium ${offerSort === 'price' ? 'bg-ink-2 text-white' : 'text-muted hover:text-ink'}`}
                          >
                            Prix
                          </button>
                        </div>
                      </div>
                      <ul className="mt-2 divide-y divide-border rounded-md border border-border bg-card">
                        {offers.slice(0, 6).map((o) => (
                          <li
                            key={o.id}
                            className="flex items-center justify-between gap-3 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/produit/${o.id}`}
                                  className="truncate text-sm font-medium text-ink hover:underline"
                                >
                                  {o.vendorName}
                                </Link>
                                {o.id === bestValueId && (
                                  <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                                    Meilleur rapport
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {o.condition && (
                                  <ConditionChip condition={o.condition as Condition} />
                                )}
                                <span className="text-xs text-muted">
                                  {o.vendorRating != null
                                    ? `${Math.round(o.vendorRating)}/100`
                                    : 'Nouveau'}
                                </span>
                                {o.valueScore != null && (
                                  <span className="font-mono text-[10px] text-muted">
                                    · score {o.valueScore}
                                  </span>
                                )}
                              </div>
                            </div>
                            {o.price != null && <Price amount={o.price} className="text-sm" />}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                })()}

              {/* CTA tertiaire WhatsApp */}
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                  `Bonjour, je suis intéressé par : ${item.name ?? 'cette pièce'}${
                    item.oemReference ? ` (réf. ${item.oemReference})` : ''
                  }.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center text-sm font-medium text-ink-2 hover:underline"
              >
                Une question ? Commander via WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
