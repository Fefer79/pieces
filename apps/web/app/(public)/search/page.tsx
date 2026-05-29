'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { Button } from '@/components/ui/button'
import { ProductCard, type ProductCardItem } from '@/components/ui/product-card'
import { PartSearchAutocomplete } from '@/components/part-search-autocomplete'

const CONDITION_OPTIONS = [
  { value: 'NEW', label: 'Neuf' },
  { value: 'USED', label: 'Occasion importée' },
  { value: 'REFURBISHED', label: 'Ré-usiné' },
] as const

const SORT_OPTIONS = [
  { value: 'recent', label: 'Les plus récents' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
] as const

function SearchPageContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { vehicle: localVehicle, clearVehicle } = useSelectedVehicle()

  // URL is the source of truth. Vehicle falls back to localStorage when URL is silent.
  const brand = searchParams.get('brand') ?? localVehicle?.brand ?? ''
  const model = searchParams.get('model') ?? localVehicle?.model ?? ''
  const year = searchParams.get('year') ?? localVehicle?.year ?? ''
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const conditionRaw = searchParams.get('condition') ?? ''
  const conditions = conditionRaw ? conditionRaw.split(',').filter(Boolean) : []
  const conditionKey = conditions.join(',')
  const priceMin = searchParams.get('priceMin') ?? ''
  const priceMax = searchParams.get('priceMax') ?? ''
  const sortBy = searchParams.get('sortBy') ?? 'recent'
  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1

  // Local inputs are kept in sync with URL but allow staged editing
  const [qInput, setQInput] = useState(q)
  const [priceMinInput, setPriceMinInput] = useState(priceMin)
  const [priceMaxInput, setPriceMaxInput] = useState(priceMax)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setQInput(q), [q])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPriceMinInput(priceMin), [priceMin])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setPriceMaxInput(priceMax), [priceMax])

  const [items, setItems] = useState<ProductCardItem[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<string[]>([])

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') next.delete(key)
        else next.set(key, value)
      }
      if (!('page' in changes)) next.delete('page')
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [pathname, router, searchParams],
  )

  useEffect(() => {
    fetch('/api/v1/browse/categories')
      .then((r) => r.json())
      .then((b) => setCategories(b.data ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '20' })
    if (brand) qs.set('brand', brand)
    if (model) qs.set('model', model)
    if (year) qs.set('year', year)
    if (q) qs.set('q', q)
    if (category) qs.set('category', category)
    if (conditionKey) qs.set('condition', conditionKey)
    if (priceMin) qs.set('priceMin', priceMin)
    if (priceMax) qs.set('priceMax', priceMax)
    if (sortBy && sortBy !== 'recent') qs.set('sortBy', sortBy)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    fetch(`/api/v1/browse/parts?${qs.toString()}`)
      .then((r) => r.json())
      .then((body) => {
        const data = body.data ?? {}
        setItems(data.items ?? [])
        setTotal(data.pagination?.total ?? 0)
        setTotalPages(data.pagination?.totalPages ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [brand, model, year, q, category, conditionKey, priceMin, priceMax, sortBy, page])

  const toggleCondition = (c: string) => {
    const next = conditions.includes(c) ? conditions.filter((x) => x !== c) : [...conditions, c]
    updateParams({ condition: next.length > 0 ? next.join(',') : null })
  }

  const applyPriceRange = () => {
    updateParams({
      priceMin: priceMinInput.trim() || null,
      priceMax: priceMaxInput.trim() || null,
    })
  }

  const resetAll = () => {
    // Keep vehicle context, drop everything else
    const next = new URLSearchParams()
    if (brand) next.set('brand', brand)
    if (model) next.set('model', model)
    if (year) next.set('year', year)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const hasVehicle = Boolean(brand && model)

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-4 lg:px-6">
          <Link href="/" className="flex flex-col">
            <span className="font-display text-2xl text-ink lg:text-3xl">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">Recherche</span>
          </Link>
          <Link href="/browse" className="text-sm font-medium text-ink-2 hover:underline">
            ← Accueil
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-4 py-6 lg:px-6">
        {/* Vehicle pill — required for vehicle-specific search */}
        <div
          className={`flex items-center justify-between gap-3 rounded-md border-2 px-4 py-2.5 lg:px-5 ${
            hasVehicle
              ? 'border-ink-2 bg-[rgba(0,35,102,0.04)]'
              : 'border-accent bg-[rgba(255,107,0,0.06)]'
          }`}
          style={{ minHeight: 48 }}
        >
          {hasVehicle ? (
            <>
              <p className="min-w-0 truncate text-sm">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink-2">
                  Véhicule ·{' '}
                </span>
                <span className="font-semibold text-ink">
                  {brand} · {model}
                  {year ? ` · ${year}` : ''}
                </span>
              </p>
              <button
                onClick={() => {
                  clearVehicle()
                  updateParams({ brand: null, model: null, year: null })
                }}
                className="flex-shrink-0 p-1 text-muted-2 transition-colors hover:text-ink"
                aria-label="Supprimer le véhicule"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </>
          ) : (
            <Link href="/browse" className="flex w-full items-center gap-2.5">
              <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-accent">
                Sélectionnez votre véhicule
              </span>
              <span className="text-sm text-ink">— pour des résultats compatibles avec votre voiture</span>
            </Link>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Filter sidebar */}
          <aside className="space-y-6 rounded-md border border-border bg-card p-4">
            {/* Search avec prédictions, restreintes au véhicule */}
            <div className="space-y-2">
              <label className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Rechercher
              </label>
              <PartSearchAutocomplete
                value={qInput}
                onChange={setQInput}
                onSubmit={(v) => updateParams({ q: v.trim() || null })}
                vehicle={hasVehicle ? { brand, model, year } : null}
                placeholder="ex. plaquettes, alternateur…"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => updateParams({ category: e.target.value || null })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                <option value="">Toutes</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <fieldset className="space-y-2">
              <legend className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                État
              </legend>
              {CONDITION_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={conditions.includes(opt.value)}
                    onChange={() => toggleCondition(opt.value)}
                    className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  {opt.label}
                </label>
              ))}
            </fieldset>

            {/* Price range */}
            <div className="space-y-2">
              <label className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Prix (FCFA)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={priceMinInput}
                  onChange={(e) => setPriceMinInput(e.target.value)}
                  onBlur={applyPriceRange}
                  placeholder="Min"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
                />
                <span className="text-muted-2">–</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={priceMaxInput}
                  onChange={(e) => setPriceMaxInput(e.target.value)}
                  onBlur={applyPriceRange}
                  placeholder="Max"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted-2 focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            {/* Sort */}
            <div className="space-y-2">
              <label className="block font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Trier par
              </label>
              <select
                value={sortBy}
                onChange={(e) => updateParams({ sortBy: e.target.value === 'recent' ? null : e.target.value })}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="w-full text-sm text-muted transition-colors hover:text-ink"
            >
              Réinitialiser les filtres
            </button>
          </aside>

          {/* Results */}
          <section>
            <div>
              <h1 className="font-display text-xl text-ink lg:text-2xl">
                {q
                  ? `Résultats pour « ${q} »`
                  : category
                    ? category
                    : hasVehicle
                      ? `Pièces compatibles ${brand} ${model}${year ? ` ${year}` : ''}`
                      : 'Recherche de pièces'}
              </h1>
              <p className="mt-1 text-sm text-muted">
                {loading
                  ? 'Chargement…'
                  : total > 0
                    ? `${total} résultat${total > 1 ? 's' : ''}`
                    : 'Aucun résultat'}
              </p>
            </div>

            {items.length > 0 && (
              <ul className="mt-5 divide-y divide-border rounded-md border border-border bg-card">
                {items.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </ul>
            )}

            {!loading && items.length === 0 && (
              <div className="mt-5 rounded-md border border-border bg-card p-8 text-center">
                <p className="text-sm text-muted">
                  {hasVehicle
                    ? `Aucune pièce compatible trouvée pour votre ${brand} ${model}${year ? ` ${year}` : ''}.`
                    : 'Aucun résultat pour ces filtres.'}
                </p>
                <p className="mt-1 text-xs text-muted-2">
                  Essayez de changer la catégorie, élargir la fourchette de prix, ou contactez-nous via WhatsApp.
                </p>
              </div>
            )}

            {page < totalPages && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => updateParams({ page: String(page + 1) })}
                  disabled={loading}
                >
                  {loading ? 'Chargement…' : 'Page suivante'}
                </Button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-surface" />}>
      <SearchPageContent />
    </Suspense>
  )
}
