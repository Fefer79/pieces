'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type SupabaseClient = ReturnType<typeof createClient>

interface Vehicle {
  id: string
  brand: string
  model: string
  year: number
  vin: string | null
  createdAt: string
}

export default function VehiclesPage() {
  const router = useRouter()
  const supabaseRef = useRef<SupabaseClient | null>(null)
  function getSupabase() {
    if (!supabaseRef.current) supabaseRef.current = createClient()
    return supabaseRef.current
  }

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [vin, setVin] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchVehicles = useCallback(async () => {
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch('/api/v1/users/me/vehicles', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const body = await res.json()
        setVehicles(body.data)
      }
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { fetchVehicles() }, [fetchVehicles])

  async function handleAdd() {
    if (!brand || !model || !year) return
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return

      const res = await fetch('/api/v1/users/me/vehicles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand,
          model,
          year: parseInt(year, 10),
          ...(vin.length === 17 ? { vin: vin.toUpperCase() } : {}),
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message ?? "Erreur lors de l'ajout")
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
    setDeleting(vehicleId)
    try {
      const { data: { session } } = await getSupabase().auth.getSession()
      if (!session) return

      const res = await fetch(`/api/v1/users/me/vehicles/${vehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok || res.status === 204) {
        setVehicles((prev) => prev.filter((v) => v.id !== vehicleId))
      }
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center">
        <p className="text-gray-500">Chargement...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 pt-8 lg:max-w-lg">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Mes véhicules</h1>

      {vehicles.length === 0 && !showForm && (
        <div className="mb-6 rounded-lg border border-dashed border-gray-300 p-6 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 01-3-3V8.25m17.25 6V3.75a.75.75 0 00-.75-.75H6a.75.75 0 00-.75.75v10.5" />
          </svg>
          <p className="mb-1 text-sm font-medium text-gray-700">Aucun vehicule enregistre</p>
          <p className="text-xs text-gray-500">Ajoutez un vehicule pour pre-remplir vos recherches de pieces.</p>
        </div>
      )}

      {vehicles.map((v) => (
        <div key={v.id} className="mb-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold text-gray-900">{v.brand} {v.model}</p>
              <p className="text-sm text-gray-500">{v.year}</p>
              {v.vin && <p className="mt-1 font-mono text-xs text-gray-400">{v.vin}</p>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/browse/${encodeURIComponent(v.brand)}/${encodeURIComponent(v.model)}/${v.year}`)}
                className="rounded-lg bg-[#002366] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[#1565C0]"
              >
                Chercher pieces
              </button>
              <button
                onClick={() => handleDelete(v.id)}
                disabled={deleting === v.id}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
              >
                {deleting === v.id ? '...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {!showForm && vehicles.length < 5 && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 transition-colors hover:border-[#002366] hover:text-[#002366]"
        >
          + Ajouter un vehicule
        </button>
      )}

      {vehicles.length >= 5 && (
        <p className="mt-2 text-center text-xs text-gray-400">Limite de 5 vehicules atteinte</p>
      )}

      {showForm && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4">
          <p className="mb-3 text-sm font-medium text-gray-700">Nouveau vehicule</p>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Marque (ex: Toyota)"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Modele (ex: Corolla)"
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Annee (ex: 2015)"
            min="1980"
            max={new Date().getFullYear() + 1}
            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />
          <input
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0, 17))}
            placeholder="VIN (optionnel, 17 caracteres)"
            maxLength={17}
            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2.5 font-mono text-sm focus:border-[#002366] focus:outline-none focus:ring-1 focus:ring-[#002366]"
          />

          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!brand || !model || !year || saving}
              className="flex-1 rounded-lg bg-[#002366] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1565C0] disabled:bg-gray-300"
            >
              {saving ? 'Ajout...' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
