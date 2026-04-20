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
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  const inputCls = 'w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Garage
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Mes véhicules</h1>
      </div>

      {vehicles.length === 0 && !showForm && (
        <div className="mb-6 rounded-md border border-dashed border-border-strong bg-card/40 p-8 text-center">
          <svg className="mx-auto mb-3 h-10 w-10 text-muted-2" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0H21M3.375 14.25h-.375a3 3 0 01-3-3V8.25m17.25 6V3.75a.75.75 0 00-.75-.75H6a.75.75 0 00-.75.75v10.5" />
          </svg>
          <p className="mb-1 text-sm font-medium text-ink">Aucun véhicule enregistré</p>
          <p className="text-xs text-muted">Ajoutez un véhicule pour pré-remplir vos recherches de pièces.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {vehicles.map((v) => (
          <div key={v.id} className="rounded-md border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-ink">{v.brand} {v.model}</p>
                <p className="font-mono text-xs tabular text-muted">{v.year}</p>
                {v.vin && <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-muted-2">{v.vin}</p>}
              </div>
              <div className="flex flex-shrink-0 gap-2">
                <button
                  onClick={() => router.push(`/browse/${encodeURIComponent(v.brand)}/${encodeURIComponent(v.model)}/${v.year}`)}
                  className="rounded-md bg-ink-2 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink"
                >
                  Chercher pièces
                </button>
                <button
                  onClick={() => handleDelete(v.id)}
                  disabled={deleting === v.id}
                  className="rounded-md border border-error-fg/30 bg-error-bg px-3 py-1.5 text-xs font-semibold text-error-fg transition-colors hover:border-error-fg/50 disabled:opacity-50"
                >
                  {deleting === v.id ? '…' : 'Supprimer'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!showForm && vehicles.length < 5 && (
        <button
          onClick={() => setShowForm(true)}
          className="mt-3 w-full rounded-md border-2 border-dashed border-border-strong bg-card/40 py-3.5 text-sm font-semibold text-muted transition-all hover:border-ink-2 hover:text-ink-2"
        >
          + Ajouter un véhicule
        </button>
      )}

      {vehicles.length >= 5 && (
        <p className="mt-3 text-center font-mono text-xs text-muted-2">Limite de 5 véhicules atteinte</p>
      )}

      {showForm && (
        <div className="mt-4 rounded-md border border-border bg-card p-5">
          <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Nouveau véhicule
          </p>
          <div className="space-y-2.5">
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Marque (ex : Toyota)"
              className={inputCls}
            />
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Modèle (ex : Corolla)"
              className={inputCls}
            />
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Année (ex : 2015)"
              min="1980"
              max={new Date().getFullYear() + 1}
              className={`${inputCls} font-mono`}
            />
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0, 17))}
              placeholder="VIN (optionnel, 17 caractères)"
              maxLength={17}
              className={`${inputCls} font-mono uppercase tracking-wider`}
            />
          </div>

          {error && (
            <div className="mt-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!brand || !model || !year || saving}
              className="flex-1 rounded-md bg-accent py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Ajout…' : 'Ajouter'}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(null) }}
              className="rounded-md border border-border-strong bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
