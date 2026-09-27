'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getMechanicAuthToken, mechanicFetchOptionalAuth } from '@/lib/mechanic-api'
import { Button } from '@/components/ui/button'

function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+]/g, '')
}

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

  const [authorName, setAuthorName] = useState('')
  const [authorPhone, setAuthorPhone] = useState('')

  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string }[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const MAX_PHOTOS = 5

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    setPhotos((prev) =>
      [...prev, ...files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))].slice(
        0,
        MAX_PHOTOS,
      ),
    )
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  async function uploadPhotos(): Promise<{ ok: true; urls: string[] } | { ok: false; message: string }> {
    if (photos.length === 0) return { ok: true, urls: [] }
    const token = await getMechanicAuthToken()
    if (!token) return { ok: true, urls: [] }

    setUploadingPhotos(true)
    try {
      const urls: string[] = []
      for (const { file } of photos) {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch('/api/v1/mechanics/reviews/photo-upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          return { ok: false, message: body?.error?.message ?? "Échec de l'envoi d'une photo" }
        }
        urls.push(body.data.url)
      }
      return { ok: true, urls }
    } finally {
      setUploadingPhotos(false)
    }
  }

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
    if (!authed && !authorName.trim() && !authorPhone.trim()) {
      setError('Indiquez votre nom ou votre téléphone (vous n’avez pas de compte connecté)')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const uploadResult = await uploadPhotos()
      if (!uploadResult.ok) {
        setError(uploadResult.message)
        return
      }
      const photoUrls = uploadResult.urls

      const parsedAmount = amountPaid.trim() ? Number(amountPaid.trim()) : undefined

      const r = await mechanicFetchOptionalAuth(`/${selected.id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating,
          comment: comment.trim() || undefined,
          amountPaid: parsedAmount,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
          authorName: !authed && authorName.trim() ? authorName.trim() : undefined,
          authorPhone: !authed && authorPhone.trim() ? authorPhone.trim() : undefined,
        }),
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

        {!authed && (
          <div className="rounded-md border border-border bg-surface p-3.5">
            <p className="mb-3 text-[13px] text-muted">
              Vous n&apos;êtes pas connecté — indiquez votre nom ou votre téléphone pour publier
              votre avis (au moins l&apos;un des deux).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Votre nom</label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Koffi Bamba"
                  className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">Votre téléphone</label>
                <input
                  type="tel"
                  value={authorPhone}
                  onChange={(e) => setAuthorPhone(sanitizePhoneInput(e.target.value))}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
                />
              </div>
            </div>
          </div>
        )}

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
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Ce qui s&apos;est passé (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Votre expérience avec cet atelier — la panne, la réparation, le délai…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Montant payé en FCFA (optionnel)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="15000"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Photos (optionnel)</label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative h-16 w-16 overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-[10px] text-white"
                  aria-label="Retirer la photo"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-strong text-xs text-muted hover:border-ink-2">
                +
                <input type="file" accept="image/*" multiple hidden onChange={handlePhotoSelect} />
              </label>
            )}
          </div>
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting || uploadingPhotos}>
          {uploadingPhotos ? 'Envoi des photos…' : submitting ? 'Envoi…' : 'Publier mon avis'}
        </Button>
      </form>
    </main>
  )
}
