'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { contactsFetch } from '@/lib/contacts-api'
import { liaisonFetch } from '@/lib/liaison-api'
import { prospectionFetch, type ProspectionInterview } from '@/lib/prospection-api'

interface ProspectOption {
  id: string
  name: string
  shopName: string | null
  phone: string
  commune: string | null
}
interface VendorOption {
  id: string
  shopName: string
  commune: string | null
}

type Mode = 'prospect' | 'vendor'

export default function NewProspectionInterviewPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('prospect')
  const [prospects, setProspects] = useState<ProspectOption[]>([])
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [prospectId, setProspectId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [search, setSearch] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    contactsFetch<{ contacts: ProspectOption[] }>('/?limit=100').then((r) => {
      if (r.ok) setProspects(r.data.contacts)
    })
    liaisonFetch<VendorOption[]>('/vendors').then((r) => {
      if (r.ok) setVendors(r.data)
    })
  }, [])

  const filteredProspects = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return prospects
    return prospects.filter((p) =>
      [p.name, p.shopName, p.phone, p.commune].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }, [prospects, search])

  const filteredVendors = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return vendors
    return vendors.filter((v) =>
      [v.shopName, v.commune].filter(Boolean).join(' ').toLowerCase().includes(q),
    )
  }, [vendors, search])

  const valid = mode === 'prospect' ? Boolean(prospectId) : Boolean(vendorId)

  async function submit() {
    if (!valid) return
    setSubmitting(true)
    setError(null)
    const payload = mode === 'prospect' ? { prospectId } : { vendorId }
    const r = await prospectionFetch<ProspectionInterview>('/interviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!r.ok) {
      setError(r.message)
      return
    }
    router.push(`/liaison/prospection/${r.data.id}`)
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <Link href="/liaison/prospection" className="mb-2 inline-block text-sm text-ink-2 hover:underline">
        ← Retour
      </Link>
      <h1 className="mb-1 font-display text-2xl text-ink">Nouvel entretien de démarchage</h1>
      <p className="mb-5 text-sm text-muted">
        Rattachez l’entretien à un prospect du CRM ou à un vendeur déjà onboardé.
      </p>

      {error && <p className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</p>}

      <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card text-sm">
        {(['prospect', 'vendor'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-2.5 font-medium transition-colors ${
              mode === m ? 'bg-ink-2 text-white' : 'text-ink hover:bg-surface'
            }`}
            style={{ minHeight: 44 }}
          >
            {m === 'prospect' ? 'Prospect (CRM)' : 'Vendeur onboardé'}
          </button>
        ))}
      </div>

      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher (nom, boutique, commune, téléphone)…"
        className="mb-3 w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink placeholder:text-muted-2"
      />

      <div className="max-h-[46vh] overflow-y-auto rounded-md border border-border bg-card">
        {mode === 'prospect' ? (
          filteredProspects.length === 0 ? (
            <p className="p-4 text-sm text-muted">Aucun prospect. Créez-en un depuis « Contacts ».</p>
          ) : (
            <ul className="divide-y divide-border">
              {filteredProspects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setProspectId(p.id)}
                    className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                      prospectId === p.id ? 'bg-[rgba(255,107,0,0.06)]' : 'hover:bg-surface'
                    }`}
                  >
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border ${
                        prospectId === p.id ? 'border-accent bg-accent' : 'border-border-strong'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {p.shopName ?? p.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {[p.commune, p.phone].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : filteredVendors.length === 0 ? (
          <p className="p-4 text-sm text-muted">Aucun vendeur.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredVendors.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setVendorId(v.id)}
                  className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors ${
                    vendorId === v.id ? 'bg-[rgba(255,107,0,0.06)]' : 'hover:bg-surface'
                  }`}
                >
                  <span
                    className={`h-4 w-4 shrink-0 rounded-full border ${
                      vendorId === v.id ? 'border-accent bg-accent' : 'border-border-strong'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{v.shopName}</span>
                    {v.commune && <span className="block truncate text-xs text-muted">{v.commune}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!valid || submitting}
        className="mt-5 w-full rounded-md bg-accent px-4 py-3 text-sm font-medium text-white transition-transform hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
        style={{ minHeight: 48 }}
      >
        {submitting ? 'Création…' : 'Démarrer l’entretien'}
      </button>
    </div>
  )
}
