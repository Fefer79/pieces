'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { contactsFetch } from '@/lib/contacts-api'

interface Contact {
  id: string
  name: string
  shopName: string | null
  phone: string
  whatsapp: string | null
  commune: string | null
  pieces: string[]
  piecesLibre: string | null
  statut: string
  relanceLe: string | null
  derniereVisite: string | null
  derniereCommande: string | null
  updatedAt: string
  _count: { liens: number }
}

interface ListResult {
  contacts: Contact[]
  total: number
  limit: number
  offset: number
}

const STATUT_LABELS: Record<string, string> = {
  A_CONTACTER: 'A contacter',
  APPELE: 'Appelé',
  VISITE: 'Visité',
  RELANCE: 'A relancer',
  CONCLU: 'Conclu',
  INJOIGNABLE: 'Injoignable',
  A_REVOIR: 'A revoir',
  REJETE: 'Rejeté',
}

const STATUT_CLASSES: Record<string, string> = {
  A_CONTACTER: 'bg-amber-50 text-amber-800 border-amber-200',
  APPELE: 'bg-blue-50 text-blue-800 border-blue-200',
  VISITE: 'bg-violet-50 text-violet-800 border-violet-200',
  RELANCE: 'bg-orange-50 text-orange-800 border-orange-200',
  CONCLU: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  INJOIGNABLE: 'bg-red-50 text-red-800 border-red-200',
  A_REVOIR: 'bg-sky-50 text-sky-800 border-sky-200',
  REJETE: 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ContactsListPage() {
  const [result, setResult] = useState<ListResult | null>(null)
  const [relances, setRelances] = useState<Contact[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('')

  useEffect(() => {
    contactsFetch<Contact[]>('/relances').then((r) => {
      if (r.ok) setRelances(r.data)
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.append('search', search)
    if (statutFilter) params.append('statut', statutFilter)
    params.append('limit', '50')

    contactsFetch<ListResult>(`/?${params.toString()}`).then((r) => {
      if (r.ok) setResult(r.data)
      else setError(r.message)
      setLoading(false)
    })
  }, [search, statutFilter])

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Contacts</h1>
          <p className="mt-1 text-sm text-muted">
            {result ? `${result.total} contact(s)` : 'Gérez vos contacts vendeurs'}
          </p>
        </div>
        <Link
          href="/liaison/contacts/new"
          className="rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white"
          style={{ minHeight: 44 }}
        >
          + Nouveau
        </Link>
      </header>

      {relances.length > 0 && (
        <section className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-2 text-sm font-semibold text-amber-900">
            À relancer aujourd&apos;hui ({relances.length})
          </h2>
          <ul className="space-y-1.5">
            {relances.map((c) => {
              const overdue = c.relanceLe && new Date(c.relanceLe).getTime() < new Date().setHours(0, 0, 0, 0)
              return (
                <li key={c.id}>
                  <Link
                    href={`/liaison/contacts/${c.id}`}
                    className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-amber-950 hover:bg-amber-100"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {c.name}
                      {c.shopName && <span className="font-normal text-amber-800"> · {c.shopName}</span>}
                    </span>
                    {overdue && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        En retard
                      </span>
                    )}
                    <span className="shrink-0 font-mono text-xs text-amber-800">{c.phone}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Rechercher (nom, boutique, téléphone)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
          style={{ minHeight: 44 }}
        />
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"
          style={{ minHeight: 44 }}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-border bg-card p-3 text-sm text-[#D32F2F]">{error}</p>
      )}

      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && result?.contacts.length === 0 && (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted">
          Aucun contact. Ajoutez votre premier vendeur de pièces.
        </div>
      )}

      {result?.contacts.length ? (
        <ul className="divide-y divide-border rounded-md border border-border bg-card">
          {result.contacts.map((c) => (
            <li key={c.id}>
              <Link
                href={`/liaison/contacts/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink/[0.02]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                  <p className="truncate text-xs text-muted">
                    {c.shopName && <>{c.shopName} &middot; </>}
                    {c.phone}
                    {c.commune && <> &middot; {c.commune}</>}
                  </p>
                  {c.pieces.length > 0 && (
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      {c.pieces.map((p, i) => (
                        <span key={i} className="rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted">
                          {p}
                        </span>
                      ))}
                      {c.piecesLibre && (
                        <span className="truncate text-[10px] text-muted">+ {c.piecesLibre}</span>
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUT_CLASSES[c.statut] ?? 'border-border bg-card text-muted'}`}
                >
                  {STATUT_LABELS[c.statut] ?? c.statut}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

    </div>
  )
}
