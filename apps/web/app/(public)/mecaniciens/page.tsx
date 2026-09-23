'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ABIDJAN_COMMUNES, MECHANIC_SPECIALTIES } from 'shared/constants'
import { Chip } from '@/components/ui/chip'

interface MechanicResult {
  id: string
  name: string
  commune: string | null
  specialties: string[]
  avgRating: number | null
  reviewCount: number
  distanceKm?: number
}

interface SearchResponse {
  mechanics: MechanicResult[]
  total: number
  page: number
  limit: number
}

export default function MecaniciensSearchPage() {
  const [commune, setCommune] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const [results, setResults] = useState<MechanicResult[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (commune) params.set('commune', commune)
      if (specialty) params.set('specialty', specialty)
      if (coords) {
        params.set('lat', String(coords.lat))
        params.set('lng', String(coords.lng))
        params.set('radiusKm', '15')
      }
      const res = await fetch(`/api/v1/mechanics?${params.toString()}`)
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message ?? 'Erreur lors de la recherche')
        return
      }
      const data = body.data as SearchResponse
      setResults(data.mechanics)
      setTotal(data.total)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setLoading(false)
    }
  }, [commune, specialty, coords])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Géolocalisation non disponible sur cet appareil')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Localisation refusée — filtrez par commune à la place')
        setLocating(false)
      },
      { timeout: 8000 },
    )
  }, [])

  const heading = useMemo(() => {
    if (coords) return 'Mécaniciens près de vous'
    if (commune) return `Mécaniciens à ${commune}`
    return 'Trouvez un mécanicien de confiance'
  }, [coords, commune])

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8">
      <div className="mb-8">
        <h1 className="font-display text-4xl text-ink">{heading}</h1>
        <p className="mt-2 max-w-2xl text-[15px] text-muted">
          Un annuaire ouvert de mécaniciens et garages en Côte d&apos;Ivoire — inscrits par
          eux-mêmes, recommandés par leurs clients.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleLocate}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-ink-2 disabled:opacity-60"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
          {locating ? 'Localisation…' : 'Près de moi'}
        </button>

        <select
          value={commune}
          onChange={(e) => {
            setCommune(e.target.value)
            setCoords(null)
          }}
          className="rounded-md border border-border-strong bg-card px-3 py-2 text-[13px] outline-none"
        >
          <option value="">Toutes les communes</option>
          {ABIDJAN_COMMUNES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-md border border-border-strong bg-card px-3 py-2 text-[13px] outline-none"
        >
          <option value="">Toutes spécialités</option>
          {MECHANIC_SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {geoError && <p className="mb-4 text-xs text-warn-fg">{geoError}</p>}
      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {loading && <p className="text-sm text-muted">Recherche…</p>}

      {!loading && results.length === 0 && (
        <div className="rounded-xl border border-dashed border-border-strong bg-card/40 p-12 text-center">
          <p className="mb-1 text-sm font-medium text-ink">Aucun mécanicien trouvé</p>
          <p className="text-xs text-muted">Essayez une autre commune ou élargissez la recherche.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p className="mb-3 text-xs text-muted-2">{total} atelier{total > 1 ? 's' : ''}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((m) => (
              <Link
                key={m.id}
                href={`/mecaniciens/atelier/${m.id}`}
                className="rounded-xl border border-border bg-card p-5 transition-all hover:border-border-strong hover:shadow-sm"
              >
                <h2 className="text-[15px] font-semibold text-ink">{m.name}</h2>
                <p className="mt-1 text-[13px] text-muted">
                  {m.commune ?? 'Commune non précisée'}
                  {m.distanceKm != null && ` · ${m.distanceKm.toFixed(1)} km`}
                </p>
                {m.avgRating != null && (
                  <p className="mt-1 text-[13px] text-muted">
                    ★ {m.avgRating.toFixed(1)} ({m.reviewCount} avis)
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.specialties.slice(0, 3).map((s) => (
                    <Chip key={s} variant="plain">{s}</Chip>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
