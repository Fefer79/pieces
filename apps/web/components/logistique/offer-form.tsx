'use client'

import { useState } from 'react'
import { sourcingFetch, CHANNEL_LABEL, type SourcingChannel } from '@/lib/sourcing-api'
import { SUPPORTED_CURRENCIES } from 'shared/constants'

const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const inputCls =
  'mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

/** Champs libres de la condition — repris tels quels de l'annonce. */
const CONDITION_SUGGESTIONS = ['Neuf', 'Occasion importée', 'Ré-usiné', 'Aftermarket', 'OEM']

/**
 * Saisie manuelle d'une offre : le chemin standard du module. L'opérateur a
 * trouvé une annonce, il la relève ici et elle entre aussitôt dans la matrice
 * d'arbitrage.
 *
 * Seul le nom du fournisseur est exigé — une offre sans prix reste utile (elle
 * matérialise une piste à chiffrer), une offre bloquée par un champ manquant ne
 * l'est pas.
 */
export function OfferForm({ searchId, onAdded }: { searchId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [supplierName, setSupplierName] = useState('')
  const [url, setUrl] = useState('')
  const [priceAmount, setPriceAmount] = useState('')
  const [priceCurrency, setPriceCurrency] = useState('EUR')
  const [priceConfirmed, setPriceConfirmed] = useState(false)
  const [conditionLabel, setConditionLabel] = useState('')
  const [leadTimeDays, setLeadTimeDays] = useState('')
  const [country, setCountry] = useState('')
  const [channel, setChannel] = useState<SourcingChannel>('MARKETPLACE_INTL')
  const [weightKg, setWeightKg] = useState('')
  const [oemReference, setOemReference] = useState('')
  const [title, setTitle] = useState('')
  const [moq, setMoq] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [opsNote, setOpsNote] = useState('')

  function reset() {
    setSupplierName('')
    setUrl('')
    setPriceAmount('')
    setPriceConfirmed(false)
    setConditionLabel('')
    setLeadTimeDays('')
    setCountry('')
    setWeightKg('')
    setOemReference('')
    setTitle('')
    setMoq('')
    setContactWhatsapp('')
    setContactEmail('')
    setOpsNote('')
    setMore(false)
  }

  const num = (v: string) => {
    const n = Number(v)
    return v.trim() !== '' && Number.isFinite(n) ? n : undefined
  }
  const str = (v: string) => (v.trim() !== '' ? v.trim() : undefined)

  async function submit() {
    if (supplierName.trim().length === 0) {
      setError('Le nom du fournisseur est obligatoire.')
      return
    }
    setBusy(true)
    setError(null)
    const price = num(priceAmount)
    const res = await sourcingFetch(`/searches/${searchId}/offers`, {
      method: 'POST',
      body: JSON.stringify({
        supplierName: supplierName.trim(),
        channel,
        ...(str(url) ? { url: str(url) } : {}),
        ...(price != null ? { priceAmount: price, priceCurrency } : {}),
        priceConfirmed,
        ...(str(conditionLabel) ? { conditionLabel: str(conditionLabel) } : {}),
        ...(num(leadTimeDays) != null ? { leadTimeDays: num(leadTimeDays) } : {}),
        ...(str(country) ? { country: str(country) } : {}),
        ...(num(weightKg) != null ? { weightKg: num(weightKg) } : {}),
        ...(str(oemReference) ? { oemReference: str(oemReference) } : {}),
        ...(str(title) ? { title: str(title) } : {}),
        ...(num(moq) != null ? { moq: num(moq) } : {}),
        ...(str(contactWhatsapp) ? { contactWhatsapp: str(contactWhatsapp) } : {}),
        ...(str(contactEmail) ? { contactEmail: str(contactEmail) } : {}),
        ...(str(opsNote) ? { opsNote: str(opsNote) } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    reset()
    onAdded()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Ajouter une offre
      </button>
    )
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-display text-lg text-ink">Ajouter une offre</h3>
          <p className="mt-1 text-sm text-muted">
            Collez le lien de l&apos;annonce et ce que la page indique. Seul le fournisseur est
            obligatoire — une piste sans prix reste utile.
          </p>
        </div>
        <button
          onClick={() => {
            setOpen(false)
            setError(null)
          }}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink hover:bg-surface"
        >
          Fermer
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Fournisseur *</label>
          <input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="Al Nahda Auto Parts, ebay — vendeur xyz…"
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Lien de l&apos;annonce</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Prix unitaire</label>
          <div className="mt-1 flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={priceAmount}
              onChange={(e) => setPriceAmount(e.target.value)}
              placeholder="Montant"
              className="w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
            />
            <select
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
              className="rounded-sm border border-border-strong bg-card px-2 py-2 text-sm text-ink"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Condition</label>
          <input
            list="offer-conditions"
            value={conditionLabel}
            onChange={(e) => setConditionLabel(e.target.value)}
            placeholder="Neuf, Occasion importée…"
            className={inputCls}
          />
          <datalist id="offer-conditions">
            {CONDITION_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={priceConfirmed}
              onChange={(e) => setPriceConfirmed(e.target.checked)}
            />
            Prix confirmé auprès du vendeur (et non simplement lu sur la page)
          </label>
        </div>
      </div>

      {more && (
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
          <div>
            <label className={labelCls}>Canal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as SourcingChannel)}
              className={inputCls}
            >
              {Object.entries(CHANNEL_LABEL).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Pays</label>
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="AE, CN, CI…"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Délai de préparation (jours)</label>
            <input
              type="number"
              inputMode="numeric"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Poids (kg)</label>
            <input
              type="number"
              inputMode="decimal"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Référence OEM</label>
            <input
              value={oemReference}
              onChange={(e) => setOemReference(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Quantité minimale</label>
            <input
              type="number"
              inputMode="numeric"
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Intitulé de l&apos;annonce</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>WhatsApp du vendeur</label>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>E-mail du vendeur</label>
            <input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Note interne</label>
            <textarea
              value={opsNote}
              onChange={(e) => setOpsNote(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-error-fg">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? 'Ajout…' : 'Ajouter l’offre'}
        </button>
        <button
          onClick={() => setMore((m) => !m)}
          className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink hover:bg-surface"
        >
          {more ? 'Moins de champs' : 'Plus de champs'}
        </button>
      </div>
    </div>
  )
}
