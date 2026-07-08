'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'
import { bestPartImage } from '@/components/ui/part-thumb'

interface CatalogItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  partSource: string | null
  price: number | null
  imageThumbUrl: string | null
  imageMediumUrl: string | null
  imageOriginalUrl: string | null
  vendor: { shopName: string }
}

// Catalogue filtrable (titre + chips catégories + grille + « Voir plus »).
// Scopé au véhicule sélectionné (localStorage). Partagé entre /catalogue et /browse.
export function CatalogueSection({ titleAs: Title = 'h2' }: { titleAs?: 'h1' | 'h2' }) {
  const { vehicle } = useSelectedVehicle()

  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  const [items, setItems] = useState<CatalogItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)

  // Fetch categories once
  useEffect(() => {
    fetch('/api/v1/browse/categories')
      .then((r) => r.json())
      .then((body) => setCategories(body.data ?? []))
      .catch(() => {})
  }, [])

  const fetchItems = useCallback(
    async (pageToLoad: number, append = false) => {
      setLoading(true)
      try {
        const qs = new URLSearchParams({
          page: String(pageToLoad),
          limit: '20',
        })
        if (vehicle?.brand) qs.set('brand', vehicle.brand)
        if (vehicle?.model) qs.set('model', vehicle.model)
        if (vehicle?.year) qs.set('year', vehicle.year)
        if (selectedCategory) qs.set('category', selectedCategory)

        const r = await fetch(`/api/v1/browse/parts?${qs.toString()}`)
        const body = await r.json()
        const data = body.data ?? {}
        const next = data.items ?? []
        setItems((prev) => (append ? [...prev, ...next] : next))
        setTotal(data.pagination?.total ?? 0)
        setTotalPages(data.pagination?.totalPages ?? 0)
        setPage(pageToLoad)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    },
    [vehicle?.brand, vehicle?.model, vehicle?.year, selectedCategory],
  )

  // Reload when vehicle or category changes
  useEffect(() => {
    fetchItems(1)
  }, [fetchItems])

  return (
    <div>
      {/* Title + count */}
      <div>
        <Title className="font-display text-xl text-ink lg:text-2xl">
          {vehicle
            ? `Pièces compatibles ${vehicle.brand} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}`
            : 'Toutes les pièces disponibles'}
        </Title>
        <p className="mt-1 text-sm text-muted">
          {total > 0
            ? `${total} pièce${total > 1 ? 's' : ''} en stock${selectedCategory ? ` · ${selectedCategory}` : ''}`
            : loading
              ? 'Chargement…'
              : 'Aucune pièce disponible pour ces filtres'}
        </p>
      </div>

      {/* Category chips */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
        <div className="flex w-max gap-2 lg:flex-wrap lg:w-auto">
          <button
            onClick={() => setSelectedCategory('')}
            className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              !selectedCategory
                ? 'bg-ink-2 text-white'
                : 'bg-card text-muted ring-1 ring-border hover:text-ink'
            }`}
            style={{ minHeight: 36 }}
          >
            Toutes
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-ink-2 text-white'
                  : 'bg-card text-muted ring-1 ring-border hover:text-ink'
              }`}
              style={{ minHeight: 36 }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid — cartes produit (4/3/2 colonnes, cf. DESIGN.md) */}
      {items.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {items.map((item) => (
            <ProductCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Skeletons — premier chargement (pas de spinner, cf. DESIGN.md) */}
      {loading && items.length === 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state when not loading and no items */}
      {!loading && items.length === 0 && (
        <div className="mt-5 rounded-md border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted">
            Aucune pièce disponible pour ces filtres.
          </p>
          <p className="mt-1 text-xs text-muted-2">
            {selectedCategory
              ? 'Essayez une autre catégorie.'
              : vehicle
                ? 'Essayez sans véhicule sélectionné ou contactez-nous via WhatsApp.'
                : 'Revenez plus tard.'}
          </p>
        </div>
      )}

      {/* Pagination — "Voir plus" */}
      {page < totalPages && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => fetchItems(page + 1, true)}
            disabled={loading}
          >
            {loading ? 'Chargement…' : 'Voir plus de pièces'}
          </Button>
        </div>
      )}
    </div>
  )
}

function ProductCard({ item }: { item: CatalogItem }) {
  const imageUrl = bestPartImage(item)
  return (
    <Link
      href={`/produit/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition duration-200 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      {/* Média 4:3 + chips condition en absolu top-left (first-class) */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-b from-[rgba(0,35,102,0.06)] to-surface">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.name ?? ''}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center text-muted-2"
            aria-hidden
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="h-9 w-9 opacity-50"
            >
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2.4" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
            </svg>
          </div>
        )}
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1.5">
          {item.condition && <ConditionChip condition={item.condition as Condition} />}
          {item.partSource && <PartSourceChip source={item.partSource as PartSource} />}
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 flex-col p-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-2">
          {item.category ?? '—'}
        </span>
        <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">
          {item.name ?? 'Pièce'}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">{item.vendor.shopName}</p>

        <div className="mt-auto flex items-end justify-between pt-3">
          {item.price != null ? (
            <div>
              <Price amount={item.price} className="text-[17px]" />
              <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-2">
                Prix détaillé →
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-2">Sur demande</span>
          )}
        </div>
      </div>
    </Link>
  )
}

function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-border bg-card">
      <div className="aspect-[4/3] animate-pulse bg-surface" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-2.5 w-1/3 animate-pulse rounded bg-surface" />
        <div className="h-3.5 w-4/5 animate-pulse rounded bg-surface" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface" />
        <div className="mt-2 h-4 w-2/5 animate-pulse rounded bg-surface" />
      </div>
    </div>
  )
}
