'use client'

import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Chip } from '@/components/ui/chip'

interface MechanicProfile {
  id: string
  name: string
  phone: string
  commune: string | null
  address: string | null
  lat: number | null
  lng: number | null
  specialties: string[]
  bio: string | null
  avgRating: number | null
  reviewCount: number
}

interface MechanicReview {
  id: string
  rating: number
  comment: string | null
  verified: boolean
  createdAt: string
  reviewer: { name: string | null }
}

export default function MechanicProfilePage() {
  const params = useParams<{ id: string }>()
  const [mechanic, setMechanic] = useState<MechanicProfile | null>(null)
  const [reviews, setReviews] = useState<MechanicReview[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMechanic = useCallback(async () => {
    setLoading(true)
    try {
      const [mechanicRes, reviewsRes] = await Promise.all([
        fetch(`/api/v1/mechanics/${params.id}`),
        fetch(`/api/v1/mechanics/${params.id}/reviews`),
      ])
      const mechanicBody = await mechanicRes.json()
      if (!mechanicRes.ok) {
        setError(mechanicBody.error?.message ?? 'Fiche introuvable')
        return
      }
      setMechanic(mechanicBody.data)

      if (reviewsRes.ok) {
        const reviewsBody = await reviewsRes.json()
        setReviews(reviewsBody.data.reviews)
      }
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchMechanic()
  }, [fetchMechanic])

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (error || !mechanic) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
        <Link href="/mecaniciens" className="text-sm font-semibold text-accent hover:underline">
          ← Annuaire mécaniciens
        </Link>
        <div className="mt-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error ?? 'Fiche introuvable'}
        </div>
      </main>
    )
  }

  const mapsUrl =
    mechanic.lat != null && mechanic.lng != null
      ? `https://www.google.com/maps?q=${mechanic.lat},${mechanic.lng}`
      : null

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8">
      <Link href="/mecaniciens" className="text-sm font-semibold text-accent hover:underline">
        ← Annuaire mécaniciens
      </Link>

      <div className="mt-4 rounded-xl border border-border bg-card p-7">
        <h1 className="font-display text-3xl text-ink">{mechanic.name}</h1>
        <p className="mt-1 text-[14px] text-muted">
          {mechanic.commune ?? 'Commune non précisée'}
          {mechanic.address && ` · ${mechanic.address}`}
        </p>
        {mechanic.avgRating != null && (
          <p className="mt-1 text-[14px] text-muted">
            ★ {mechanic.avgRating.toFixed(1)} ({mechanic.reviewCount} avis)
          </p>
        )}

        {mechanic.specialties.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {mechanic.specialties.map((s) => (
              <Chip key={s} variant="plain">{s}</Chip>
            ))}
          </div>
        )}

        {mechanic.bio && <p className="mt-4 text-[14.5px] leading-relaxed text-ink">{mechanic.bio}</p>}

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={`tel:${mechanic.phone}`}
            className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            📞 Appeler {mechanic.phone}
          </a>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              Itinéraire
            </a>
          )}
          <Link
            href={`/mecaniciens/recommander?id=${mechanic.id}`}
            className="inline-flex items-center gap-2 rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
          >
            Laisser un avis
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Avis {reviews.length > 0 && `(${reviews.length})`}
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">Aucun avis pour le moment — soyez le premier à recommander.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-md border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">★ {r.rating}/5</span>
                  {r.verified && <Chip variant="status-ok">Avis vérifié</Chip>}
                  <span className="ml-auto text-xs text-muted-2">
                    {r.reviewer.name ?? 'Client'} ·{' '}
                    {new Date(r.createdAt).toLocaleDateString('fr-CI', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                {r.comment && <p className="mt-1.5 text-[14px] text-ink">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
