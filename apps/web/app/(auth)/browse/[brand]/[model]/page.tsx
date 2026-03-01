'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function ModelYearsPage() {
  const router = useRouter()
  const params = useParams()
  const brand = decodeURIComponent(params.brand as string)
  const model = decodeURIComponent(params.model as string)
  const [years, setYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/v1/browse/brands/${encodeURIComponent(brand)}/models/${encodeURIComponent(model)}/years`)
      .then((r) => r.json())
      .then((body) => {
        if (body.error) setError(body.error.message)
        else setYears(body.data)
      })
      .catch(() => setError('Erreur réseau'))
      .finally(() => setLoading(false))
  }, [brand, model])

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#1976D2] hover:underline">&larr; Retour</button>
      <h1 className="mb-1 text-xl font-bold text-[#1A1A1A]">{brand} {model}</h1>
      <p className="mb-4 text-sm text-gray-500">Sélectionnez une année</p>

      {error && <p className="text-sm text-[#D32F2F]">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Chargement...</p>}

      {!loading && !error && (
        <div className="grid grid-cols-4 gap-2">
          {years.map((year) => (
            <button
              key={year}
              onClick={() => router.push(`/browse/${encodeURIComponent(brand)}/${encodeURIComponent(model)}/${year}`)}
              className="rounded-lg border border-gray-200 p-3 text-center text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-gray-50"
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
