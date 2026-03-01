'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface PartResult {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  oemReference: string | null
  vendor: { id: string; shopName: string }
}

export default function YearPartsPage() {
  const router = useRouter()
  const params = useParams()
  const brand = decodeURIComponent(params.brand as string)
  const model = decodeURIComponent(params.model as string)
  const year = params.year as string

  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [parts, setParts] = useState<PartResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/browse/categories')
      .then((r) => r.json())
      .then((body) => setCategories(body.data))
      .catch(() => {})
  }, [])

  const fetchParts = useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ brand, model, year })
      if (selectedCategory) qs.set('category', selectedCategory)
      const r = await fetch(`/api/v1/browse/parts?${qs}`)
      const body = await r.json()
      setParts(body.data.items)
      setTotal(body.data.pagination.total)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [brand, model, year, selectedCategory])

  useEffect(() => {
    fetchParts()
  }, [fetchParts])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#1976D2] hover:underline">&larr; Retour</button>
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">{brand} {model} {year}</h1>
      <p className="mb-4 text-sm text-gray-500">{total} pièce{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${!selectedCategory ? 'bg-[#1976D2] text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Toutes
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${selectedCategory === cat ? 'bg-[#1976D2] text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!loading && parts.length === 0 && (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">Aucune pièce disponible pour ce véhicule.</p>
          <p className="mt-1 text-xs text-gray-400">Essayez une autre catégorie ou cherchez par référence.</p>
        </div>
      )}

      {!loading && parts.length > 0 && (
        <div className="space-y-3">
          {parts.map((part) => (
            <div key={part.id} className="flex gap-3 rounded-lg border border-gray-200 p-3">
              <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
                {part.imageThumbUrl ? (
                  <img src={part.imageThumbUrl} alt={part.name ?? ''} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">—</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#1A1A1A]">{part.name ?? 'Pièce'}</p>
                <p className="text-xs text-gray-500">{part.category ?? '—'}</p>
                <p className="text-xs text-gray-400">{part.vendor.shopName}</p>
              </div>
              {part.price && (
                <p className="text-sm font-bold text-[#1A1A1A]">{part.price.toLocaleString('fr-FR')} F</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
