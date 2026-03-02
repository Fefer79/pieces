'use client'

import { useState, useEffect, useCallback } from 'react'
import { VEHICLE_BRANDS } from 'shared/constants/vehicles'

interface SearchResult {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { shopName: string }
}

export default function EnterpriseSearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Vehicle filter state
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedYear, setSelectedYear] = useState('')

  const brandNames = Object.keys(VEHICLE_BRANDS).sort()
  const brandData = selectedBrand ? VEHICLE_BRANDS[selectedBrand] : undefined
  const models = brandData ? Object.keys(brandData.models).sort() : []
  const modelYears = brandData && selectedModel ? brandData.models[selectedModel] : undefined
  const years = modelYears ? [...modelYears].sort((a, b) => b - a) : []

  // Reset cascading
  useEffect(() => {
    setSelectedModel('')
    setSelectedYear('')
  }, [selectedBrand])

  useEffect(() => {
    setSelectedYear('')
  }, [selectedModel])

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/v1/browse/search?q=${encodeURIComponent(q)}`)
      const body = await res.json()
      setResults(body.data?.items ?? [])
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const resetFilters = () => {
    setSelectedBrand('')
    setSelectedModel('')
    setSelectedYear('')
    setSearchQuery('')
    setResults([])
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar filters */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Filtres</h2>

        <div className="space-y-4">
          {/* Search */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Recherche</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, référence..."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
            />
          </div>

          {/* Brand */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Marque</label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
            >
              <option value="">Toutes</option>
              {brandNames.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Modèle</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={!selectedBrand}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none disabled:opacity-50"
            >
              <option value="">Tous</option>
              {models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700">Année</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              disabled={!selectedModel}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none disabled:opacity-50"
            >
              <option value="">Toutes</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={resetFilters}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
          >
            Réinitialiser
          </button>
        </div>
      </aside>

      {/* Results grid */}
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Recherche de pièces</h1>
          {results.length > 0 && (
            <p className="text-sm text-gray-500">{results.length} résultat{results.length > 1 ? 's' : ''}</p>
          )}
        </div>

        {searching && (
          <p className="text-sm text-gray-500">Recherche en cours...</p>
        )}

        {!searching && searchQuery.trim().length < 2 && results.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p className="mt-4 text-sm text-gray-500">Saisissez un terme pour rechercher des pièces</p>
            <p className="mt-1 text-xs text-gray-400">Utilisez les filtres à gauche pour affiner vos résultats</p>
          </div>
        )}

        {!searching && searchQuery.trim().length >= 2 && results.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
            <p className="text-sm text-gray-500">Aucun résultat pour &ldquo;{searchQuery}&rdquo;</p>
            <p className="mt-1 text-xs text-gray-400">Essayez un autre terme ou modifiez vos filtres</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {results.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-md"
              >
                {/* Image */}
                <div className="h-40 bg-gray-100">
                  {item.imageThumbUrl ? (
                    <img
                      src={item.imageThumbUrl}
                      alt={item.name ?? ''}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="truncate text-sm font-semibold text-gray-900">
                    {item.name ?? 'Pièce'}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.category ?? '—'} &middot; {item.vendor.shopName}
                  </p>
                  {item.price != null && (
                    <p className="mt-2 text-base font-bold text-[#1976D2]">
                      {item.price.toLocaleString('fr-FR')} FCFA
                    </p>
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
