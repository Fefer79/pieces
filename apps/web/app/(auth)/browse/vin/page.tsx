'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface VinResult {
  vin: string
  make: string | null
  model: string | null
  year: number | null
  decoded: boolean
}

export default function VinDecodePage() {
  const router = useRouter()
  const [vin, setVin] = useState('')
  const [result, setResult] = useState<VinResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDecode() {
    if (vin.length !== 17) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/v1/browse/vin-decode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: vin.toUpperCase() }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du décodage')
        return
      }
      setResult(body.data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#1976D2] hover:underline">&larr; Retour</button>
      <h1 className="mb-2 text-xl font-bold text-[#1A1A1A]">Décodage VIN</h1>
      <p className="mb-4 text-sm text-gray-500">Saisissez le VIN à 17 caractères de la carte grise.</p>

      <input
        type="text"
        value={vin}
        onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0, 17))}
        placeholder="Ex: JTDKN3DU5A0123456"
        maxLength={17}
        className="mb-2 w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm tracking-wider focus:border-[#1976D2] focus:outline-none"
      />
      <p className="mb-4 text-xs text-gray-400">{vin.length}/17 caractères</p>

      <button
        onClick={handleDecode}
        disabled={vin.length !== 17 || loading}
        className="w-full rounded-lg bg-[#1976D2] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300"
      >
        {loading ? 'Décodage...' : 'Décoder le VIN'}
      </button>

      {error && <p className="mt-4 text-sm text-[#D32F2F]">{error}</p>}

      {result && result.decoded && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-700">
            Véhicule confirmé : {result.make} {result.model} ({result.year})
          </p>
          <button
            onClick={() => {
              if (result.make) {
                const brand = encodeURIComponent(result.make)
                const model = result.model ? encodeURIComponent(result.model) : ''
                const year = result.year ?? ''
                router.push(`/browse/${brand}${model ? `/${model}` : ''}${year ? `/${year}` : ''}`)
              }
            }}
            className="mt-2 text-sm text-[#1976D2] hover:underline"
          >
            Chercher des pièces pour ce véhicule &rarr;
          </button>
        </div>
      )}

      {result && !result.decoded && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-700">VIN non reconnu — essayez la navigation par marque/modèle/année</p>
          <button onClick={() => router.push('/browse')} className="mt-2 text-sm text-[#1976D2] hover:underline">
            Naviguer par marque &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
