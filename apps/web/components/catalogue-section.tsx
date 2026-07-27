'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'
import {
  ProductGridCard,
  ProductGridCardSkeleton,
  type ProductGridItem,
} from '@/components/ui/product-grid-card'

type CatalogItem = ProductGridItem

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
            <ProductGridCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Skeletons — premier chargement (pas de spinner, cf. DESIGN.md) */}
      {loading && items.length === 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductGridCardSkeleton key={i} />
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
