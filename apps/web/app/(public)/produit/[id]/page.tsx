'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { PriceBreakdown, type PriceLine } from '@/components/ui/price-breakdown'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'

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
  vendor: { id: string; shopName: string }
  photos: Photo[]
  fitments: Fitment[]
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

export default function ProductPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [item, setItem] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activePhoto, setActivePhoto] = useState(0)

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

  // Galerie : photos dédiées sinon images principales de la fiche
  const gallery: string[] = item
    ? (item.photos.map(photoUrl).filter((u): u is string => !!u).length > 0
        ? item.photos.map(photoUrl).filter((u): u is string => !!u)
        : [item.imageLargeUrl ?? item.imageMediumUrl ?? item.imageOriginalUrl].filter(
            (u): u is string => !!u,
          ))
    : []

  const priceLines: PriceLine[] = item?.price != null ? [{ label: 'Prix pièce', amount: item.price }] : []

  return (
    <div className="min-h-dvh bg-surface">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Fiche produit</span>
          </Link>
          <Link href="/browse" className="text-sm font-medium text-ink-2 hover:underline">
            ← Retour
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {loading && <p className="py-16 text-center text-sm text-muted">Chargement…</p>}

        {error && !loading && (
          <div className="mx-auto mt-8 max-w-md rounded-md border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted">Cette pièce est introuvable ou n&apos;est plus disponible.</p>
            <Link href="/browse" className="mt-3 inline-block text-sm font-medium text-accent hover:underline">
              Retour à la recherche
            </Link>
          </div>
        )}

        {item && !loading && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Galerie */}
            <div>
              <div className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-card">
                {gallery[activePhoto] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gallery[activePhoto]} alt={item.name ?? ''} className="h-full w-full object-cover" />
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

            {/* Détails */}
            <div>
              <h1 className="font-display text-2xl text-ink lg:text-3xl">{item.name ?? 'Pièce'}</h1>
              <p className="mt-1 text-sm text-muted">
                {item.category ?? 'Pièce'} · {item.vendor.shopName}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {item.condition && <ConditionChip condition={item.condition} />}
                {item.partSource && <PartSourceChip source={item.partSource} />}
                {!item.inStock && (
                  <span className="rounded-sm bg-surface px-2 py-1 text-xs font-medium text-muted">
                    Rupture de stock
                  </span>
                )}
              </div>

              {/* Caractéristiques */}
              <dl className="mt-5 divide-y divide-border rounded-md border border-border bg-card text-sm">
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

              {/* Prix */}
              {item.price != null ? (
                <div className="mt-6">
                  <PriceBreakdown
                    lines={priceLines}
                    total={item.price}
                    note="Livraison et main d'œuvre calculées à la commande — aucun frais caché."
                  />
                </div>
              ) : (
                <div className="mt-6 rounded-md border border-border bg-card p-5 text-sm text-muted">
                  Prix sur demande.
                </div>
              )}

              {/* CTA */}
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
                  `Bonjour, je suis intéressé par : ${item.name ?? 'cette pièce'}${
                    item.oemReference ? ` (réf. ${item.oemReference})` : ''
                  }.`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block"
              >
                <Button variant="accent" size="lg" block>
                  Commander via WhatsApp
                </Button>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
