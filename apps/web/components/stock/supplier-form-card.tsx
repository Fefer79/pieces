'use client'

import { useState } from 'react'
import { stockFetch, type Supplier } from '@/lib/stock-api'

/**
 * Formulaire fournisseur partagé : création (POST /suppliers) ou édition
 * (PATCH /suppliers/:id quand `supplierId` est fourni). Les champs vides sont
 * envoyés à null — le schéma API les accepte.
 */
export function SupplierFormCard({
  title,
  supplierId,
  initial,
  onSaved,
  onClose,
}: {
  title: string
  supplierId?: string
  initial?: Partial<Supplier>
  onSaved: () => void
  onClose?: () => void
}) {
  const [nom, setNom] = useState(initial?.nom ?? '')
  const [pays, setPays] = useState(initial?.pays ?? '')
  const [ville, setVille] = useState(initial?.ville ?? '')
  const [contactName, setContactName] = useState(initial?.contactName ?? '')
  const [telephone, setTelephone] = useState(initial?.telephone ?? '')
  const [whatsapp, setWhatsapp] = useState(initial?.whatsapp ?? '')
  const [email, setEmail] = useState(initial?.email ?? '')
  const [devise, setDevise] = useState(initial?.devise ?? 'AED')
  const [delai, setDelai] = useState(
    initial?.delaiTypiqueJours != null ? String(initial.delaiTypiqueJours) : '',
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (nom.trim().length < 2 || busy) return
    const delaiNum = Number.parseInt(delai, 10)
    setBusy(true)
    setError(null)
    const res = await stockFetch(supplierId ? `/suppliers/${supplierId}` : '/suppliers', {
      method: supplierId ? 'PATCH' : 'POST',
      body: JSON.stringify({
        nom: nom.trim(),
        pays: pays.trim() || null,
        ville: ville.trim() || null,
        contactName: contactName.trim() || null,
        telephone: telephone.trim() || null,
        whatsapp: whatsapp.trim() || null,
        email: email.trim() || null,
        devise: devise.trim().toUpperCase() || 'AED',
        delaiTypiqueJours: Number.isInteger(delaiNum) ? delaiNum : null,
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onSaved()
  }

  return (
    <div className="mb-4 rounded-md border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
        {onClose && (
          <button onClick={onClose} className="text-muted hover:text-ink">
            ✕
          </button>
        )}
      </div>
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Nom *"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm sm:col-span-2"
        />
        <input
          value={pays}
          onChange={(e) => setPays(e.target.value)}
          placeholder="Pays (ex. Émirats)"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Ville (ex. Dubaï)"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Contact"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Téléphone"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="WhatsApp"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={devise}
          onChange={(e) => setDevise(e.target.value)}
          placeholder="Devise (AED)"
          maxLength={3}
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <input
          value={delai}
          onChange={(e) => setDelai(e.target.value)}
          inputMode="numeric"
          placeholder="Délai typique (jours)"
          className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
          {error && <p className="flex-1 text-xs text-error-fg">{error}</p>}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={busy || nom.trim().length < 2}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
            >
              {busy ? 'Enregistrement…' : supplierId ? 'Enregistrer' : 'Créer le fournisseur'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
