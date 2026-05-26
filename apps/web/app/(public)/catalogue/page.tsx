'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'
import { Price } from '@/components/ui/price'
import { ConditionChip, type Condition } from '@/components/ui/chip'

interface CatalogItem {
  id: string
  name: string | null
  category: string | null
  condition: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { shopName: string }
}

export default function CataloguePage() {
  const { vehicle, clearVehicle } = useSelectedVehicle()

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
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Catalogue</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-ink-2 hover:underline"
          >
            ← Accueil
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {/* Vehicle pill */}
        <div
          className={`flex items-center justify-between gap-3 rounded-md border-2 px-4 py-2.5 lg:px-5 ${
            vehicle
              ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
              : 'border-accent bg-[rgba(255,107,0,0.06)]'
          }`}
          style={{ minHeight: 48 }}
        >
          {vehicle ? (
            <>
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-ink-2 text-white"
                  aria-hidden
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="h-4 w-4"
                  >
                    <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                  </svg>
                </span>
                <p className="truncate text-sm">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">
                    Véhicule sélectionné ·{' '}
                  </span>
                  <span className="font-semibold text-ink">
                    {vehicle.brand} · {vehicle.model}
                    {vehicle.year ? ` · ${vehicle.year}` : ''}
                    {vehicle.motor ? ` · ${vehicle.motor}` : ''}
                  </span>
                </p>
              </div>
              <button
                onClick={clearVehicle}
                className="flex-shrink-0 p-1 text-muted-2 transition-colors hover:text-ink"
                aria-label="Supprimer le véhicule"
                style={{ minWidth: 44, minHeight: 44 }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-5 w-5"
                >
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </>
          ) : (
            <Link
              href="/browse"
              className="flex w-full items-center gap-2.5 text-left"
            >
              <span
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white"
                aria-hidden
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M3.5 13.5 5 9a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 9l1.5 4.5v5a1 1 0 0 1-1 1H18a1 1 0 0 1-1-1v-1H7v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-5Zm3-1h11l-.9-2.7a.5.5 0 0 0-.5-.3H7.9a.5.5 0 0 0-.5.3l-.9 2.7Zm.5 3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm10 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" />
                </svg>
              </span>
              <span className="truncate text-sm">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">
                  Sélectionnez votre véhicule ·{' '}
                </span>
                <span className="text-ink">
                  Toutes les pièces sont affichées
                </span>
              </span>
            </Link>
          )}
        </div>

        {/* Title + count */}
        <div className="mt-6">
          <h1 className="font-display text-xl text-ink lg:text-2xl">
            {vehicle
              ? `Pièces compatibles ${vehicle.brand} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}`
              : 'Toutes les pièces disponibles'}
          </h1>
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

        {/* List */}
        {items.length > 0 && (
          <ul className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex gap-3 px-3 py-3 transition-colors hover:bg-surface"
              >
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-sm bg-surface">
                  {item.imageThumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageThumbUrl}
                      alt={item.name ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-2">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {item.name ?? 'Pièce'}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {item.category ?? '—'} · {item.vendor.shopName}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    {item.condition && (
                      <ConditionChip condition={item.condition as Condition} />
                    )}
                  </div>
                </div>
                {item.price != null && (
                  <Price amount={item.price} className="self-center text-sm" />
                )}
              </li>
            ))}
          </ul>
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
    </div>
  )
}
