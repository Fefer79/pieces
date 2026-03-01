'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
  vin: string | null
}

export default function VehiclesPage() {
  const router = useRouter()
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [vin, setVin] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/users/me/vehicles')
      if (res.ok) {
        const body = await res.json()
        setVehicles(body.data)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVehicles()
  }, [fetchVehicles])

  async function handleAdd() {
    if (!brand || !model || !year) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/users/me/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          model,
          year: parseInt(year, 10),
          ...(vin.length === 17 ? { vin: vin.toUpperCase() } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? 'Erreur lors de l\'ajout')
        return
      }
      const body = await res.json()
      setVehicles((prev) => [body.data, ...prev])
      setBrand('')
      setModel('')
      setYear('')
      setVin('')
      setShowForm(false)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vehicleId: string) {
    const res = await fetch(`/api/v1/users/me/vehicles/${vehicleId}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><p className="text-gray-500">Chargement...</p></div>
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6">
      <button onClick={() => router.back()} className="mb-2 text-sm text-[#1976D2] hover:underline">&larr; Retour</button>
      <h1 className="mb-4 text-xl font-bold text-[#1A1A1A]">Mes véhicules</h1>

      {vehicles.length === 0 && !showForm && (
        <p className="mb-4 text-sm text-gray-500">Aucun véhicule enregistré. Ajoutez-en un pour pré-remplir vos recherches.</p>
      )}

      {vehicles.map((v) => (
        <div key={v.id} className="mb-3 flex items-center justify-between rounded-lg border border-gray-200 p-3">
          <div>
            <p className="font-semibold text-[#1A1A1A]">{v.brand} {v.model} ({v.year})</p>
            {v.vin && <p className="text-xs text-gray-400 font-mono">{v.vin}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/browse/${encodeURIComponent(v.brand)}/${encodeURIComponent(v.model)}/${v.year}`)}
              className="text-sm text-[#1976D2] hover:underline"
            >
              Chercher
            </button>
            <button onClick={() => handleDelete(v.id)} className="text-sm text-[#D32F2F] hover:underline">
              Supprimer
            </button>
          </div>
        </div>
      ))}

      {!showForm && vehicles.length < 5 && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm text-gray-500 hover:border-[#1976D2] hover:text-[#1976D2]"
        >
          + Ajouter un véhicule
        </button>
      )}

      {showForm && (
        <div className="mt-4 rounded-lg border border-gray-200 p-4">
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marque (ex: Toyota)"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Modèle (ex: Corolla)"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Année (ex: 2015)"
            min="1980"
            max={new Date().getFullYear() + 1}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#1976D2] focus:outline-none"
          />
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0, 17))}
            placeholder="VIN (optionnel, 17 caractères)"
            maxLength={17}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm focus:border-[#1976D2] focus:outline-none"
          />

          {error && <p className="mb-2 text-sm text-[#D32F2F]">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!brand || !model || !year || saving}
              className="flex-1 rounded-lg bg-[#1976D2] py-2 text-sm font-semibold text-white hover:bg-[#1565C0] disabled:bg-gray-300"
            >
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
