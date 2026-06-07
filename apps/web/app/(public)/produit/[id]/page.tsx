'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { MiniCartButton } from '@/components/cart/mini-cart'
import { useCart } from '@/lib/cart'
import { useSelectedVehicle, type SelectedVehicle } from '@/lib/selected-vehicle'
import { apiFetch } from '@/lib/enterprise-api'

const WA_NUMBER = '2250709021708'

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
}

type ProductDetail = {
  id: string
  name: string | null
  category: string | null
  oemReference: string | null
  vehicleCompatibility: string | null
  condition: Condition | null
  partSource: PartSource | null
  price: number | null
  warrantyMonths: number | null
  inStock: boolean
  imageOriginalUrl: string | null
  imageThumbUrl: string | null
  imageSmallUrl: string | null
  imageMediumUrl: string | null
  imageLargeUrl: string | null
  vendor: Vendor
  photos: Photo[]
  fitments: Fitment[]
}

type CompareOffer = {
  id: string
  vendorId: string
  vendorName: string
  vendorRating: number | null
  price: number | null
  condition: string | null
  partSource: string | null
  warrantyMonths: number | null
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

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const { vehicle } = useSelectedVehicle()
  const { addItem } = useCart()

  const [item, setItem] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [buying, setBuying] = useState(false)
  const [offers, setOffers] = useState<CompareOffer[]>([])
  const [offerSort, setOfferSort] = useState<'price' | 'value'>('value')

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

  // Offres concurrentes : autres vendeurs ayant la même référence OEM.
  useEffect(() => {
    if (!item?.oemReference) return
    let cancelled = false
    fetch(`/api/v1/browse/compare?oem=${encodeURIComponent(item.oemReference)}&sort=${offerSort}`)
      .then(async (r) => (r.ok ? ((await r.json()).data as { groups: CompareGroup[] } | CompareGroup[]) : []))
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

  const priceLines: PriceLine[] =
    item?.price != null ? [{ label: `Prix pièce × ${qty}`, amount: item.price * qty }] : []

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
    const res = await apiFetch<{ shareToken: string }>('/orders', {
      method: 'POST',
      body: JSON.stringify({ items: [{ catalogItemId: item.id, quantity: qty }] }),
    })
    setBuying(false)
    if (res.ok) router.push(`/choose/${res.data.shareToken}`)
  }

  const warrantyBadge =
    item?.warrantyMonths && item.warrantyMonths > 0
      ? `Garantie ${item.warrantyMonths} mois`
      : item?.condition === 'USED'
        ? 'Occasion garantie 30 j'
        : 'Retour sous 48 h'

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
                        i === activePhoto ? 'border-accent' : 'border-border hover:border-border-strong'
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
                      : 'bg-warning-bg text-warning-fg'
                  }`}
                >
                  <span aria-hidden>{compatibility ? '✅' : '⚠️'}</span>
                  <span>
                    {compatibility
                      ? `Compatible avec votre ${vehicle!.brand} ${vehicle!.model} ${vehicle!.year}`
                      : `Compatibilité non confirmée avec votre ${vehicle!.brand} ${vehicle!.model} ${vehicle!.year}`}
                  </span>
                </div>
              )}

              {/* 2. Titre + chips */}
              <h1 className="font-display text-2xl text-ink lg:text-3xl">{item.name ?? 'Pièce'}</h1>
              <p className="mt-1 text-sm text-muted">{item.category ?? 'Pièce'}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.condition && <ConditionChip condition={item.condition} />}
                {item.partSource && <PartSourceChip source={item.partSource} />}
                {!item.inStock && (
                  <span className="rounded-sm bg-surface px-2 py-1 text-xs font-medium text-muted">
                    Rupture de stock
                  </span>
                )}
              </div>

              {/* 3. Bloc vendeur */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{item.vendor.shopName}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {item.vendor.aggregateRating != null
                      ? `Note vendeur ${Math.round(item.vendor.aggregateRating)}/100`
                      : 'Nouveau vendeur'}
                    {item.vendor.ordersDelivered > 0 && ` · ${item.vendor.ordersDelivered} livrées`}
                  </p>
                </div>
                <span className="rounded-full bg-success-bg px-2.5 py-1 text-[11.5px] font-semibold text-success-fg">
                  🛡️ {warrantyBadge}
                </span>
              </div>

              {/* 5. Prix (recalculé × quantité) */}
              {item.price != null ? (
                <div className="mt-5">
                  <PriceBreakdown
                    lines={priceLines}
                    total={item.price * qty}
                    note="Livraison et main d'œuvre calculées à la commande — aucun frais caché."
                  />
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
                {item.warrantyMonths != null && item.warrantyMonths > 0 && (
                  <div className="flex justify-between gap-4 px-4 py-2.5">
                    <dt className="text-muted">Garantie</dt>
                    <dd className="text-ink">{item.warrantyMonths} mois</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 px-4 py-2.5">
                  <dt className="text-muted">Vendeur</dt>
                  <dd className="text-ink">{item.vendor.shopName}</dd>
                </div>
              </dl>

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
              {offers.length > 0 && (() => {
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
                      <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                            {o.condition && <ConditionChip condition={o.condition as Condition} />}
                            <span className="text-xs text-muted">
                              {o.vendorRating != null ? `${Math.round(o.vendorRating)}/100` : 'Nouveau'}
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
