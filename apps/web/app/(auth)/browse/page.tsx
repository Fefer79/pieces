'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function BrowsePage() {
  const router = useRouter()
  const [brands, setBrands] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string | null; category: string | null; price: number | null; imageThumbUrl: string | null; vendor: { shopName: string } }>>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/browse/brands')
      .then((r) => r.json())
      .then((body) => setBrands(body.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await fetch(`/api/v1/browse/search?q=${encodeURIComponent(q)}`)
      const body = await res.json()
      setSearchResults(body.data?.items ?? [])
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 300)
    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-4 text-xl font-bold text-[#1A1A1A]">Trouver une pièce</h1>

      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Rechercher par nom, référence OEM..."
        className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-[#1976D2] focus:outline-none"
      />

      {searching && <p className="mb-4 text-sm text-gray-500">Recherche...</p>}

      {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-sm font-semibold text-gray-600">Résultats</h2>
          {searchResults.map((item) => (
            <div key={item.id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
              <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {item.imageThumbUrl ? (
                  <img src={item.imageThumbUrl} alt={item.name ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name ?? 'Pièce'}</p>
                <p className="text-xs text-gray-500">{item.category ?? '—'} · {item.vendor.shopName}</p>
              </div>
              {item.price && (
                <p className="text-sm font-semibold">{item.price.toLocaleString('fr-FR')} F</p>
              )}
            </div>
          ))}
        </div>
      )}

      {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
        <div className="mb-6 rounded-lg border border-gray-200 p-6 text-center">
          <p className="text-sm text-gray-500">Aucun résultat pour &ldquo;{searchQuery}&rdquo;</p>
          <p className="mt-1 text-xs text-gray-400">Essayez de naviguer par marque ci-dessous</p>
        </div>
      )}

      {searchQuery.trim().length < 2 && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-gray-600">Par marque</h2>
          {loading ? (
            <p className="text-sm text-gray-500">Chargement...</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {brands.map((brand) => (
                <button
                  key={brand}
                  onClick={() => router.push(`/browse/${encodeURIComponent(brand)}`)}
                  className="rounded-lg border border-gray-200 p-4 text-center text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-gray-50"
                >
                  {brand}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
