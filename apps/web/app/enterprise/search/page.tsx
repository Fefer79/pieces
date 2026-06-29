'use client'

import { useState, useEffect, useCallback } from 'react'
import { VEHICLE_BRANDS, getEngines } from 'shared/constants/vehicles'
import { formatWarranty, type WarrantyUnit } from 'shared/constants'
import { Price } from '@/components/ui/price'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'

interface SearchResult {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { shopName: string }
}

interface CompareOffer {
  id: string
  vendorId: string
  vendorName: string
  vendorRating: number | null
  vendorOrdersDelivered: number
  price: number | null
  condition: string | null
  partSource: string | null
  warrantyValue: number | null
  warrantyUnit: WarrantyUnit | null
  inStock: boolean
  imageThumbUrl: string | null
}

interface CompareGroup {
  groupKey: string
  oemReference: string | null
  name: string | null
  category: string | null
  offerCount: number
  minPrice: number | null
  offers: CompareOffer[]
}

export default function EnterpriseSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [groups, setGroups] = useState<CompareGroup[]>([])
  const [grouped, setGrouped] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  // Vehicle filter state
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedMotor, setSelectedMotor] = useState('')

  const brandNames = Object.keys(VEHICLE_BRANDS).sort()
  const brandData = selectedBrand ? VEHICLE_BRANDS[selectedBrand] : undefined
  const models = brandData ? Object.keys(brandData.models).sort() : []
  const modelYears = brandData && selectedModel ? brandData.models[selectedModel] : undefined
  const years = modelYears ? [...modelYears].sort((a, b) => b - a) : []
  const engines = selectedBrand && selectedModel ? getEngines(selectedBrand, selectedModel) : []

  // Reset cascading
  useEffect(() => {
    setSelectedModel('')
    setSelectedYear('')
    setSelectedMotor('')
  }, [selectedBrand])

  useEffect(() => {
    setSelectedYear('')
    setSelectedMotor('')
  }, [selectedModel])

  useEffect(() => {
    setSelectedMotor('')
  }, [selectedYear])

  const handleSearch = useCallback(
    async (q: string, brand: string, model: string, year: string, useGrouped: boolean) => {
      const hasVehicle = Boolean(brand)
      const hasText = q.trim().length >= 2
      if (!hasVehicle && !hasText) {
        setResults([])
        setGroups([])
        return
      }
      setSearching(true)
      try {
        if (useGrouped && hasVehicle) {
          const params = new URLSearchParams()
          params.set('brand', brand)
          if (model) params.set('model', model)
          if (year) params.set('year', year)
          const res = await fetch(`/api/v1/browse/compare?${params.toString()}`)
          const body = await res.json()
          setGroups(body.data?.groups ?? [])
          setResults([])
        } else {
          let url: string
          if (hasVehicle) {
            const params = new URLSearchParams()
            params.set('brand', brand)
            if (model) params.set('model', model)
            if (year) params.set('year', year)
            if (hasText) params.set('q', q)
            url = `/api/v1/browse/parts?${params.toString()}`
          } else {
            url = `/api/v1/browse/search?q=${encodeURIComponent(q)}`
          }
          const res = await fetch(url)
          const body = await res.json()
          setResults(body.data?.items ?? [])
          setGroups([])
        }
      } catch {
        setResults([])
        setGroups([])
      } finally {
        setSearching(false)
      }
    },
    [],
  )

  useEffect(() => {
    const timer = setTimeout(
      () => handleSearch(searchQuery, selectedBrand, selectedModel, selectedYear, grouped),
      300,
    )
    return () => clearTimeout(timer)
  }, [searchQuery, selectedBrand, selectedModel, selectedYear, grouped, handleSearch])

  // Suggestions de noms de pièces, scopées au véhicule sélectionné (sans vendeur).
  const fetchSuggestions = useCallback(async (term: string): Promise<PredictiveItem[]> => {
    const params = new URLSearchParams({ q: term })
    if (selectedBrand) params.set('brand', selectedBrand)
    if (selectedModel) params.set('model', selectedModel)
    if (selectedYear) params.set('year', selectedYear)
    const res = await fetch(`/api/v1/browse/suggest?${params.toString()}`)
    const body = await res.json()
    const labels: string[] = body.data?.suggestions ?? []
    return labels.map((label) => ({ label }))
  }, [selectedBrand, selectedModel, selectedYear])

  const resetFilters = () => {
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedYear('')
    setSelectedMotor('')
    setSearchQuery('')
    setResults([])
    setGroups([])
    setExpandedGroup(null)
  }

  const filterInput =
    'w-full rounded-sm border border-border bg-card px-3 py-2 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)] disabled:opacity-50'
  const filterLabel =
    'mb-1.5 block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <div className="flex h-full">
      {/* Left sidebar filters */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card p-6">
        <h2 className="mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          Filtres
        </h2>

        <div className="space-y-4">
          <div>
            <label className={filterLabel}>Recherche</label>
            <PredictiveSearch
              value={searchQuery}
              onChange={setSearchQuery}
              fetchSuggestions={fetchSuggestions}
              placeholder="Nom, référence…"
              inputClassName={filterInput}
            />
          </div>

          <div>
            <label className={filterLabel}>Marque</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className={filterInput}
            >
              <option value="">Toutes</option>
              {brandNames.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabel}>Modèle</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand}
              className={filterInput}
            >
              <option value="">Tous</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabel}>Année</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={!selectedModel}
              className={filterInput}
            >
              <option value="">Toutes</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={filterLabel}>Motorisation</label>
            <select
              value={selectedMotor}
              onChange={(e) => setSelectedMotor(e.target.value)}
              disabled={!selectedYear || engines.length === 0}
              className={filterInput}
            >
              <option value="">Toutes</option>
              {engines.map((eng) => (
                <option key={eng} value={eng}>{eng}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={grouped}
              onChange={(e) => setGrouped(e.target.checked)}
              disabled={!selectedBrand}
              className="h-4 w-4"
            />
            <span className={selectedBrand ? '' : 'opacity-50'}>
              Comparer par référence
            </span>
          </label>

          <button
            onClick={resetFilters}
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-ink transition-colors hover:bg-surface"
          >
            Réinitialiser
          </button>
        </div>
      </aside>

      {/* Results grid */}
      <div className="flex-1 p-6 lg:p-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Entreprise
            </div>
            <h1 className="mt-1 font-display text-3xl text-ink">Recherche de pièces</h1>
          </div>
          {(results.length > 0 || groups.length > 0) && (
            <p className="font-mono text-xs tabular text-muted">
              {grouped
                ? `${groups.length} référence${groups.length > 1 ? 's' : ''}`
                : `${results.length} résultat${results.length > 1 ? 's' : ''}`}
            </p>
          )}
        </div>

        {searching && <p className="text-sm text-muted">Recherche en cours…</p>}

        {!searching && results.length === 0 && groups.length === 0 && searchQuery.trim().length < 2 && !selectedBrand && (
          <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong bg-card py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="mt-4 text-sm font-medium text-ink">Sélectionnez un véhicule ou saisissez un terme</p>
            <p className="mt-1 text-xs text-muted">Filtre véhicule = pièces compatibles. Texte = recherche libre.</p>
          </div>
        )}

        {!searching && results.length === 0 && groups.length === 0 && (searchQuery.trim().length >= 2 || selectedBrand) && (
          <div className="rounded-md border border-dashed border-border-strong bg-card p-10 text-center">
            <p className="text-sm font-medium text-ink">Aucun résultat</p>
            <p className="mt-1 text-xs text-muted">Essayez d&apos;élargir les filtres ou un autre terme.</p>
          </div>
        )}

        {grouped && groups.length > 0 && (
          <ul className="space-y-3">
            {groups.map((g) => {
              const open = expandedGroup === g.groupKey
              const cheapest = g.offers[0]
              const topRated = g.offers
                .filter((o) => o.vendorRating != null)
                .reduce<CompareOffer | null>(
                  (best, o) => (best == null || (o.vendorRating ?? 0) > (best.vendorRating ?? 0) ? o : best),
                  null,
                )
              return (
                <li
                  key={g.groupKey}
                  className="overflow-hidden rounded-md border border-border bg-card"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedGroup(open ? null : g.groupKey)}
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold text-ink">
                        {g.name ?? 'Pièce'}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted">
                        {g.oemReference ? `Réf. ${g.oemReference}` : 'Sans réf. OEM'}
                        {g.category ? ` · ${g.category}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-4">
                      <div className="text-right">
                        <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                          Dès
                        </div>
                        {g.minPrice != null ? (
                          <Price amount={g.minPrice} className="text-base font-semibold text-ink" />
                        ) : (
                          <span className="text-sm text-muted">—</span>
                        )}
                      </div>
                      <span className="rounded-full bg-surface px-2.5 py-1 font-mono text-[11px] tabular text-ink">
                        {g.offerCount} offre{g.offerCount > 1 ? 's' : ''}
                      </span>
                      <span className="text-muted-2">{open ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {open && (
                    <div className="border-t border-border">
                      <Table>
                        <Thead>
                          <Tr hover={false}>
                            <Th>Fournisseur</Th>
                            <Th>Note</Th>
                            <Th>État</Th>
                            <Th>Garantie</Th>
                            <Th align="right">Prix</Th>
                            <Th>Dispo</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {g.offers.map((o) => (
                            <Tr key={o.id}>
                              <Td className="text-ink">
                                {o.vendorName}
                                {o.id === cheapest?.id && (
                                  <span className="ml-2 rounded-full bg-[#148C50]/10 px-2 py-0.5 font-mono text-[10px] text-[#148C50]">
                                    Meilleur prix
                                  </span>
                                )}
                                {topRated && o.id === topRated.id && o.id !== cheapest?.id && (
                                  <span className="ml-2 rounded-full bg-[#1E3A8A]/10 px-2 py-0.5 font-mono text-[10px] text-[#1E3A8A]">
                                    Mieux noté
                                  </span>
                                )}
                              </Td>
                              <Td className="text-muted">
                                {o.vendorRating != null ? (
                                  <span className="tabular text-ink">
                                    {Math.round(o.vendorRating)}/100
                                    <span className="ml-1 font-mono text-[10px] text-muted-2">
                                      ({o.vendorOrdersDelivered})
                                    </span>
                                  </span>
                                ) : (
                                  <span className="font-mono text-[10px] text-muted-2">N/A</span>
                                )}
                              </Td>
                              <Td className="text-muted">
                                {o.condition === 'NEW' && 'Neuf'}
                                {o.condition === 'USED' && 'Occasion'}
                                {o.condition === 'REFURBISHED' && 'Ré-usiné'}
                                {!o.condition && '—'}
                              </Td>
                              <Td className="text-muted">
                                {formatWarranty(o.warrantyValue, o.warrantyUnit) ?? '—'}
                              </Td>
                              <Td align="right">
                                {o.price != null ? (
                                  <Price amount={o.price} className="font-semibold text-ink" />
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </Td>
                              <Td>
                                {o.inStock ? (
                                  <span className="text-[#148C50]">✓ Stock</span>
                                ) : (
                                  <span className="text-muted-2">Épuisé</span>
                                )}
                              </Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-md border border-border bg-card transition-all hover:border-border-strong hover:shadow-md"
              >
                <div className="h-40 bg-surface">
                  {item.imageThumbUrl ? (
                    <img
                      src={item.imageThumbUrl}
                      alt={item.name ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-2">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold text-ink">
                    {item.name ?? 'Pièce'}
                  </h3>
                  <p className="mt-1 text-xs text-muted">
                    {item.category ?? '—'} · {item.vendor.shopName}
                  </p>
                  {item.price != null && (
                    <div className="mt-2">
                      <Price amount={item.price} className="text-base font-semibold text-ink" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
