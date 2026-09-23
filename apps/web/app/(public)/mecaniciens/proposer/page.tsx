'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ABIDJAN_COMMUNES, MECHANIC_SPECIALTIES, type MechanicSpecialty } from 'shared/constants'
import { Button } from '@/components/ui/button'

// Dépôt ouvert — aucune authentification requise, à la différence de
// l'inscription self-service (mecaniciens/inscription) qui publie une fiche
// pour son propre atelier. Ici on propose un tiers, modéré avant publication.
export default function ProposerMechanicPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [specialty, setSpecialty] = useState<MechanicSpecialty | ''>('')
  const [note, setNote] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !phone.trim()) {
      setError('Le nom et le téléphone sont obligatoires')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/v1/mechanics/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          commune: commune || undefined,
          address: address.trim() || undefined,
          specialty: specialty || undefined,
          note: note.trim() || undefined,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body?.error?.message ?? 'Erreur lors de l’envoi')
        return
      }
      setDone(true)
    } catch {
      setError('Erreur réseau. Vérifiez votre connexion.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16 text-center lg:px-8">
        <h1 className="font-display text-3xl text-ink">Merci !</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
          Votre proposition a bien été reçue. L&apos;équipe Pièces la vérifie avant de publier la
          fiche dans l&apos;annuaire.
        </p>
        <Link
          href="/mecaniciens"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Voir l&apos;annuaire
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 lg:px-8">
      <h1 className="mb-2 font-display text-3xl text-ink">Proposer un mécanicien</h1>
      <p className="mb-8 text-[14.5px] text-muted">
        Vous connaissez un atelier fiable qui n&apos;est pas encore dans l&apos;annuaire ?
        Proposez-le — aucun compte n&apos;est nécessaire. L&apos;équipe Pièces vérifie
        l&apos;information avant publication.
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">Nom de l&apos;atelier ou du mécanicien</label>
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
          <label className="mb-1.5 block text-sm font-medium text-ink">Spécialité (optionnel)</label>
          <div className="flex flex-wrap gap-2">
            {MECHANIC_SPECIALTIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpecialty((prev) => (prev === s ? '' : s))}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  specialty === s
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
          <label className="mb-1.5 block text-sm font-medium text-ink">Pourquoi le recommander ? (optionnel)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Ce qui le rend fiable, ce qu'il fait bien…"
            className="w-full rounded-md border border-border-strong bg-card px-3 py-2.5 text-sm outline-none focus:border-ink-2"
          />
        </div>

        <Button type="submit" variant="accent" size="lg" block disabled={submitting}>
          {submitting ? 'Envoi…' : 'Envoyer la proposition'}
        </Button>
      </form>
    </main>
  )
}
