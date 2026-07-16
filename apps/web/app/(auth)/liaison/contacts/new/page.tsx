'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { contactsFetch } from '@/lib/contacts-api'

const COMMUNES = [
  'Abobo', 'Adjamé', 'Anyama', 'Attécoubé', 'Bingerville', 'Cocody',
  'Koumassi', 'Marcory', 'Plateau', 'Port-Bouët', 'Songon', 'Treichville', 'Yopougon',
]

const PIECES_SUGGESTIONS = [
  'Moteur', 'Boîte', 'Alternateur', 'Démarreur', 'Amortisseur', 'Disque frein',
  'Plaquette', 'Échappement', 'Radiateur', 'Climatisation', 'Injecteur', 'Turbo',
  'Pare-brise', 'Rétroviseur', 'Phare', 'Feu arrière', 'Pare-choc', 'Aile',
  'Portière', 'Capot', 'Siège', 'Tableau bord', 'Volant', 'Cardan', 'Biellette',
  'Triangle', 'Silentbloc', 'Pompe', 'Embrayage', 'Batterie', 'Faisceau', 'Calculateur',
]

export default function NewContactPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    shopName: '',
    phone: '',
    phone2: '',
    whatsapp: '',
    email: '',
    commune: '',
    address: '',
    pieces: [] as string[],
    piecesLibre: '',
    remarques: '',
  })

  const [pieceInput, setPieceInput] = useState('')

  function update(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function addPiece(piece: string) {
    const trimmed = piece.trim()
    if (!trimmed || form.pieces.includes(trimmed)) return
    update('pieces', [...form.pieces, trimmed])
    setPieceInput('')
  }

  function removePiece(index: number) {
    update('pieces', form.pieces.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.phone) {
      setError('Nom et téléphone requis')
      return
    }

    setSaving(true)
    setError(null)

    const r = await contactsFetch('/contacts/', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        shopName: form.shopName || undefined,
        phone: form.phone,
        phone2: form.phone2 || null,
        whatsapp: form.whatsapp || null,
        email: form.email || null,
        commune: form.commune || null,
        address: form.address || null,
        pieces: form.pieces,
        piecesLibre: form.piecesLibre || null,
        remarques: form.remarques || null,
      }),
    })

    setSaving(false)

    if (r.ok) {
      router.push('/liaison/contacts')
    } else {
      setError(r.message)
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl text-ink">Nouveau contact</h1>
        <p className="mt-1 text-sm text-muted">Ajoutez un vendeur de pièces à votre carnet</p>
      </header>

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Nom *</label>
          <input
            required
            placeholder="Nom du contact"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
            style={{ minHeight: 44 }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Boutique</label>
          <input
            placeholder="Nom de la boutique (optionnel)"
            value={form.shopName}
            onChange={(e) => update('shopName', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
            style={{ minHeight: 44 }}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Téléphone *</label>
            <input
              required
              type="tel"
              placeholder="+225 XX XX XX XX XX"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted font-mono"
              style={{ minHeight: 44 }}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-ink">Téléphone 2</label>
            <input
              type="tel"
              placeholder="Second numéro"
              value={form.phone2}
              onChange={(e) => update('phone2', e.target.value)}
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted font-mono"
              style={{ minHeight: 44 }}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">WhatsApp</label>
          <input
            type="tel"
            placeholder="Numéro WhatsApp si différent"
            value={form.whatsapp}
            onChange={(e) => update('whatsapp', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted font-mono"
            style={{ minHeight: 44 }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Commune</label>
          <select
            value={form.commune}
            onChange={(e) => update('commune', e.target.value)}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"
            style={{ minHeight: 44 }}
          >
            <option value="">-- Commune --</option>
            {COMMUNES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <input
            value={form.address}
            onChange={(e) => update('address', e.target.value)}
            placeholder="Adresse / quartier"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
            style={{ minHeight: 44 }}
          />
          {form.address && (
            <button
              type="button"
              onClick={() => {
                const url = `https://www.google.com/maps/search/${encodeURIComponent(form.address + ' Abidjan')}`
                window.open(url, '_blank')
              }}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted hover:text-ink"
              style={{ minHeight: 44 }}
            >
              Maps
            </button>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Pièces</label>
          <div className="flex flex-wrap gap-1.5">
            {form.pieces.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-ink"
              >
                {p}
                <button
                  type="button"
                  onClick={() => removePiece(i)}
                  className="ml-0.5 text-muted hover:text-red-600"
                  aria-label={`Retirer ${p}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={pieceInput}
              onChange={(e) => setPieceInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPiece(pieceInput) } }}
              placeholder="Ajouter une pièce"
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
              style={{ minHeight: 44 }}
            />
            <button
              type="button"
              onClick={() => addPiece(pieceInput)}
              className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted hover:text-ink"
              style={{ minHeight: 44 }}
            >
              +
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {PIECES_SUGGESTIONS.filter((s) => !form.pieces.includes(s) && s.toLowerCase().includes(pieceInput.toLowerCase())).slice(0, 12).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => addPiece(s)}
                className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted hover:border-ink hover:text-ink"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Pièces (libre)</label>
          <textarea
            placeholder="Autres pièces, description libre..."
            value={form.piecesLibre}
            onChange={(e) => update('piecesLibre', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Remarques</label>
          <textarea
            placeholder="Notes, observations..."
            value={form.remarques}
            onChange={(e) => update('remarques', e.target.value)}
            rows={2}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ minHeight: 44 }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer le contact'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-ink"
            style={{ minHeight: 44 }}
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
