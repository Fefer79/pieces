'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getMechanicAuthToken, mechanicFetch } from '@/lib/mechanic-api'
import { Button } from '@/components/ui/button'

interface MechanicOption {
  id: string
  name: string
  commune: string | null
}

// `useSearchParams` (mécanicien préselectionné depuis sa fiche) impose une
// frontière Suspense, sans quoi le prérendu de la page échoue au build.
export default function RecommanderPage() {
  return (
    <Suspense fallback={<div className="p-10 text-sm text-muted">Chargement…</div>}>
      <RecommanderPageContent />
    </Suspense>
  )
}

function RecommanderPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('id')

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authed, setAuthed] = useState(false)

  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<MechanicOption[]>([])
  const [selected, setSelected] = useState<MechanicOption | null>(null)

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMechanicAuthToken().then((token) => {
      setAuthed(!!token)
      setCheckingAuth(false)
    })
  }, [])

  useEffect(() => {
    if (!preselectedId) return
    fetch(`/api/v1/mechanics/${preselectedId}`)
      .then((r) => r.json())
      .then((body) => {
        if (body?.data) setSelected({ id: body.data.id, name: body.data.name, commune: body.data.commune })
      })
  }, [preselectedId])

  const search = useCallback(async (term: string) => {
    setQuery(term)
    if (term.trim().length < 2) {
      setOptions([])
      return
    }
    const res = await fetch(`/api/v1/mechanics?q=${encodeURIComponent(term)}&limit=8`)
    const body = await res.json()
    if (res.ok) setOptions(body.data.mechanics)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) {
      setError('Choisissez un mécanicien à recommander')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const r = await mechanicFetch(`/${selected.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      })
      if (!r.ok) {
        setError(r.message)
        return
      }
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10 lg:px-8">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl text-ink">Recommander un mécanicien</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Connectez-vous pour laisser un avis — cela évite les faux avis et protège les
          mécaniciens.
        </p>
        <Link
          href={`/login?returnTo=/mecaniciens/recommander${preselectedId ? `?id=${preselectedId}` : ''}`}
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Se connecter
        </Link>
      </main>
    )
  }

  if (submitted && selected) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl text-ink">Merci !</h1>
        <p className="mt-3 text-[15px] text-muted">
          Votre avis sur {selected.name} a été publié.
        </p>
        <Link
          href={`/mecaniciens/atelier/${selected.id}`}
          className="mt-6 inline-block text-sm font-semibold text-accent hover:underline"
        >
          Voir la fiche →
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10 lg:px-8">
      <h1 className="mb-2 font-display text-3xl text-ink">Recommander un mécanicien</h1>
      <p className="mb-8 text-[14.5px] text-muted">
        Votre avis aide d&apos;autres automobilistes à trouver un atelier de confiance.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Mécanicien</label>
          {selected ? (
            <div className="flex items-center justify-between rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm">
              <span>{selected.name}{selected.commune && ` · ${selected.commune}`}</span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs font-semibold text-accent hover:underline"
              >
                Changer
              </button>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="Rechercher un atelier par nom…"
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
              />
              {options.length > 0 && (
                <div className="mt-1.5 overflow-hidden rounded-md border border-border bg-card">
                  {options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setSelected(o)
                        setOptions([])
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                    >
                      <span>{o.name}</span>
                      <span className="text-xs text-muted-2">{o.commune}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Note</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                className={`h-10 w-10 rounded-md text-lg transition-colors ${
                  n <= rating ? 'bg-accent text-white' : 'border border-border bg-card text-muted-2'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Commentaire (optionnel)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Votre expérience avec cet atelier…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting}>
          {submitting ? 'Envoi…' : 'Publier mon avis'}
        </Button>
      </form>
    </main>
  )
}
