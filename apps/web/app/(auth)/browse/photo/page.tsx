'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface PartIdentification {
  name: string
  category: string
  oemReference: string | null
  vehicleCompatibility: string | null
  suggestedPrice: number | null
  confidence: number
}

interface CatalogCandidate {
  id: string
  name: string | null
  category: string | null
  price: number | null
  imageThumbUrl: string | null
  vendor: { id: string; shopName: string }
}

interface IdentifyResult {
  status: 'identified' | 'disambiguation' | 'failed'
  identification: PartIdentification | null
  candidates: CatalogCandidate[]
  matchingParts: CatalogCandidate[]
}

export default function PhotoIdentifyPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IdentifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  async function handleCapture(file: File) {
    setLoading(true)
    setError(null)
    setResult(null)
    setPreview(URL.createObjectURL(file))

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/v1/vision/identify', {
        method: 'POST',
        body: formData,
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors de l\'identification')
        return
      }
      setResult(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  async function handleDisambiguate(category: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/vision/disambiguate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      })
      const body = await res.json()
      if (res.ok) {
        setResult((prev) =>
          prev ? { ...prev, status: 'identified', matchingParts: body.data, candidates: [] } : prev,
        )
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setError(null)
    setPreview(null)
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#1976D2] hover:underline">
        &larr; Retour
      </button>
      <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">Identifier par photo</h1>
      <p className="mb-4 text-sm text-gray-500">
        Prenez une photo de la pièce pour l&apos;identifier automatiquement.
      </p>

      {!result && !loading && (
        <>
          <div className="mb-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="mb-1 text-3xl">📷</p>
            <p className="mb-2 text-sm font-semibold text-[#1A1A1A]">Placez la pièce entière dans le cadre</p>
            <p className="text-xs text-gray-400">Bonne lumière — Pièce entière — Fond uni</p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-lg bg-[#1976D2] py-4 text-lg font-semibold text-white transition-colors hover:bg-[#1565C0]"
            style={{ minHeight: '40vh' }}
          >
            Prendre une photo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleCapture(file)
            }}
          />
        </>
      )}

      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center">
          {preview && (
            <div className="mb-4 h-32 w-32 overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Pièce" className="h-full w-full object-cover" />
            </div>
          )}
          <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#1976D2]" />
          <p className="text-sm text-gray-500">Identification en cours...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-[#D32F2F]">{error}</p>
          <button onClick={reset} className="mt-2 text-sm text-[#1976D2] hover:underline">
            Réessayer
          </button>
        </div>
      )}

      {result?.status === 'identified' && result.identification && (
        <div className="mt-4">
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="text-sm font-semibold text-green-700">
              Pièce identifiée : {result.identification.name}
            </p>
            <p className="text-xs text-green-600">
              Catégorie : {result.identification.category} — Confiance : {Math.round(result.identification.confidence * 100)}%
            </p>
            {result.identification.suggestedPrice && (
              <p className="text-xs text-green-600">Prix estimé : {result.identification.suggestedPrice.toLocaleString()} FCFA</p>
            )}
          </div>

          {result.matchingParts.length > 0 ? (
            <>
              <h2 className="mb-2 text-sm font-semibold text-[#1A1A1A]">Pièces disponibles ({result.matchingParts.length})</h2>
              {result.matchingParts.map((part) => (
                <div key={part.id} className="mb-2 flex items-center gap-3 rounded-lg border border-gray-200 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1A1A1A]">{part.name}</p>
                    <p className="text-xs text-gray-500">{part.vendor.shopName}</p>
                  </div>
                  {part.price && (
                    <p className="text-sm font-bold text-[#1976D2]">{part.price.toLocaleString()} F</p>
                  )}
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-gray-500">Aucune pièce correspondante en stock actuellement.</p>
          )}
          <button onClick={reset} className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Nouvelle recherche
          </button>
        </div>
      )}

      {result?.status === 'disambiguation' && (
        <div className="mt-4">
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-700">Plusieurs possibilités détectées</p>
            <p className="text-xs text-amber-600">Sélectionnez la pièce qui correspond le mieux.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {result.candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => c.category && handleDisambiguate(c.category)}
                className="rounded-lg border border-gray-200 p-3 text-left hover:border-[#1976D2] hover:bg-blue-50"
              >
                <p className="text-sm font-semibold text-[#1A1A1A]">{c.name}</p>
                <p className="text-xs text-gray-500">{c.category}</p>
              </button>
            ))}
          </div>
          <button onClick={reset} className="mt-4 w-full rounded-lg border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50">
            Réessayer avec une autre photo
          </button>
        </div>
      )}

      {result?.status === 'failed' && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">Identification impossible — essayez la recherche par texte ou navigation par marque.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => router.push('/browse')} className="text-sm text-[#1976D2] hover:underline">
              Naviguer par marque
            </button>
            <button onClick={reset} className="text-sm text-[#1976D2] hover:underline">
              Réessayer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
