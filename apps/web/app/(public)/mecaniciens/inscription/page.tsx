'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ABIDJAN_COMMUNES, MECHANIC_SPECIALTIES, type MechanicSpecialty } from 'shared/constants'
import { getMechanicAuthToken, mechanicFetch } from '@/lib/mechanic-api'
import { Button } from '@/components/ui/button'

// Leaflet touche `window` au chargement — chargé côté client uniquement,
// comme partout ailleurs où VendorMapPicker est utilisé.
const VendorMapPicker = dynamic(
  () => import('@/components/vendor-map-picker').then((m) => m.VendorMapPicker),
  { ssr: false },
)

export default function MechanicRegisterPage() {
  const router = useRouter()
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [authed, setAuthed] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null })
  const [specialties, setSpecialties] = useState<MechanicSpecialty[]>([])
  const [bio, setBio] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMechanicAuthToken().then((token) => {
      setAuthed(!!token)
      setCheckingAuth(false)
    })
  }, [])

  const toggleSpecialty = useCallback((s: MechanicSpecialty) => {
    setSpecialties((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError('Le nom et le téléphone sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const r = await mechanicFetch<{ id: string }>('/', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          commune: commune || undefined,
          address: address.trim() || undefined,
          lat: coords.lat ?? undefined,
          lng: coords.lng ?? undefined,
          specialties,
          bio: bio.trim() || undefined,
        }),
      })
      if (!r.ok) {
        setError(r.message)
        return
      }
      router.push(`/mecaniciens/atelier/${r.data.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
        <p className="text-sm text-muted">Chargement…</p>
      </main>
    )
  }

  if (!authed) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl text-ink">Inscrire mon atelier</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Connectez-vous (ou créez un compte gratuit en quelques secondes) pour publier votre
          fiche mécanicien sur l&apos;annuaire.
        </p>
        <Link
          href="/login?returnTo=/mecaniciens/inscription"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Se connecter
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <h1 className="mb-2 font-display text-3xl text-ink">Inscrire mon atelier</h1>
      <p className="mb-8 text-[14.5px] text-muted">
        Votre fiche est publiée immédiatement. L&apos;équipe Pièces peut la suspendre en cas de
        signalement.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Nom de l&apos;atelier</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Garage Koffi Auto"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+225…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Commune</label>
            <select
              value={commune}
              onChange={(e) => setCommune(e.target.value)}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none"
            >
              <option value="">—</option>
              {ABIDJAN_COMMUNES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink">Adresse (optionnel)</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rue, quartier…"
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Localisation sur la carte (optionnel — améliore votre visibilité « près de moi »)
          </label>
          <VendorMapPicker
            lat={coords.lat}
            lng={coords.lng}
            onChange={(c) => setCoords(c)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Spécialités</label>
          <div className="flex flex-wrap gap-2">
            {MECHANIC_SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleSpecialty(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  specialties.includes(s)
                    ? 'bg-ink-2 text-white'
                    : 'border border-border bg-card text-muted hover:border-border-strong hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Présentation (optionnel)</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Votre expérience, vos marques de prédilection…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting}>
          {submitting ? 'Publication…' : 'Publier ma fiche'}
        </Button>
      </form>
    </main>
  )
}
