'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ABIDJAN_COMMUNES } from 'shared/constants'
import type { MechanicMapPoint } from '@/components/mechanics-map'

const MechanicsMap = dynamic(
  () => import('@/components/mechanics-map').then((m) => m.MechanicsMap),
  { ssr: false },
)

interface MechanicResult {
  id: string
  name: string
  commune: string | null
  lat: number | null
  lng: number | null
}

interface SearchResponse {
  mechanics: MechanicResult[]
  total: number
}

export default function MecaniciensCartePage() {
  const [commune, setCommune] = useState('')
  const [points, setPoints] = useState<MechanicMapPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (commune) params.set('commune', commune)
      const res = await fetch(`/api/v1/mechanics?${params.toString()}`)
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors du chargement')
        return
      }
      const data = body.data as SearchResponse
      const geolocated = data.mechanics
        .filter((m): m is MechanicResult & { lat: number; lng: number } => m.lat != null && m.lng != null)
        .map((m) => ({ id: m.id, name: m.name, commune: m.commune, lat: m.lat, lng: m.lng }))
      setPoints(geolocated)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [commune])

  useEffect(() => {
    load()
  }, [load])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
      <div className="mb-6">
        <h1 className="font-display text-4xl text-ink">Carte des mécaniciens</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Les ateliers géolocalisés de l&apos;annuaire, par zone. Cliquez sur un marqueur pour
          ouvrir la fiche.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={commune}
          onChange={(e) => setCommune(e.target.value)}
          className="rounded-md border border-border-strong bg-card px-3 py-2 text-[13px] outline-none"
        >
          <option value="">Toutes les communes</option>
          {ABIDJAN_COMMUNES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <Link href="/mecaniciens" className="text-[13px] font-semibold text-accent hover:underline">
          Voir la liste plutôt →
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!loading && points.length === 0 && !error && (
        <div className="mb-4 rounded-xl border border-dashed border-border-strong bg-card/40 p-6 text-center text-sm text-muted">
          Aucun mécanicien géolocalisé pour cette zone.
        </div>
      )}

      <MechanicsMap points={points} />

      {!loading && (
        <p className="mt-3 text-xs text-muted-2">
          {points.length} atelier{points.length > 1 ? 's' : ''} géolocalisé{points.length > 1 ? 's' : ''}
        </p>
      )}
    </main>
  )
}
