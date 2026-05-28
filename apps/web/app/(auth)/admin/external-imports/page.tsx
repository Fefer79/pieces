'use client'

import { useEffect, useState, useCallback } from 'react'
import { adminFetch } from '@/lib/admin-api'

type IngestSource =
  | 'HAUTOPARTS_3H'
  | 'MAPA_CI'
  | 'JUMIA_CI'
  | 'COINAFRIQUE_CI'
  | 'ANNUAIRE_CI'
  | 'GLOBAL_AUTO_CI'
  | 'OSM'
  | 'GOOGLE_PLACES'
  | 'NHTSA'
  | 'WIKIPEDIA'
  | 'PARTSOUQ'
  | 'MANUAL'

const SOURCE_LABELS: Record<IngestSource, string> = {
  HAUTOPARTS_3H: '3H Autoparts',
  MAPA_CI: 'MAPA-CI',
  JUMIA_CI: 'Jumia CI',
  COINAFRIQUE_CI: 'CoinAfrique CI',
  ANNUAIRE_CI: 'Annuaire CI',
  GLOBAL_AUTO_CI: 'Global Auto Online',
  OSM: 'OSM',
  GOOGLE_PLACES: 'Google Places',
  NHTSA: 'NHTSA',
  WIKIPEDIA: 'Wikipedia',
  PARTSOUQ: 'partsouq',
  MANUAL: 'Manuel',
}

interface ExternalItem {
  id: string
  name: string
  category: string | null
  oemReference: string | null
  price: number | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  condition: string | null
  partSource: string | null
  inStock: boolean
  imageOriginalUrl: string | null
  externalSource: IngestSource | null
  externalSourceId: string | null
  externalSourceUrl: string | null
  createdAt: string
  updatedAt: string
  vendor: { id: string; shopName: string; isExternal: boolean } | null
}

interface ListResponse {
  items: ExternalItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

interface SourceStat {
  source: IngestSource
  total: number
  withOem: number
  withoutOem: number
  lastImportAt: string | null
}

interface StatsResponse {
  sources: SourceStat[]
}

function formatPrice(p: number | null): string {
  if (p == null) return '—'
  return `${p.toLocaleString('fr-FR')} FCFA`
}

function formatDate(d: string | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function AdminExternalImportsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [q, setQ] = useState('')
  const [source, setSource] = useState<IngestSource | ''>('')
  const [hasOem, setHasOem] = useState<'' | 'true' | 'false'>('')
  const [status, setStatus] = useState<'' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'>('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (source) params.set('source', source)
    if (hasOem) params.set('hasOem', hasOem)
    if (status) params.set('status', status)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/external-imports/list?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [q, source, hasOem, status, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    adminFetch<StatsResponse>('/admin/external-imports/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl text-ink">Imports externes</h1>
        <p className="mt-1 text-sm text-muted">
          Annonces issues des scrapers (3H Autoparts, etc.). Revue manuelle avant publication large.
        </p>
      </div>

      {/* Stats bandeau */}
      {stats && stats.sources.length > 0 && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.sources.map((s) => (
            <div key={s.source} className="rounded-md border border-border bg-card p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                {SOURCE_LABELS[s.source] ?? s.source}
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink">{s.total.toLocaleString('fr-FR')}</div>
              <div className="mt-1 text-xs text-muted">
                {s.withOem} avec OEM · {s.withoutOem} sans OEM
              </div>
              <div className="mt-1 text-xs text-muted">Dernier import : {formatDate(s.lastImportAt)}</div>
            </div>
          ))}
        </div>
      )}
      {stats && stats.sources.length === 0 && (
        <div className="mb-4 rounded-md border border-border bg-card p-4 text-sm text-muted">
          Aucun import externe en base. Lance <code className="font-mono text-xs">pnpm -F ingest ingest --source=3h --commit</code> pour peupler.
        </div>
      )}

      {/* Filtres */}
      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="Rechercher (nom, catégorie, OEM, ID source)"
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        />
        <select
          value={source}
          onChange={(e) => { setPage(1); setSource(e.target.value as IngestSource | '') }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Toutes sources</option>
          {(Object.keys(SOURCE_LABELS) as IngestSource[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={hasOem}
          onChange={(e) => { setPage(1); setHasOem(e.target.value as '' | 'true' | 'false') }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">OEM (tous)</option>
          <option value="true">Avec OEM</option>
          <option value="false">Sans OEM</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous statuts</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2">Titre</th>
                  <th className="px-3 py-2">Catégorie</th>
                  <th className="px-3 py-2">OEM</th>
                  <th className="px-3 py-2 text-right">Prix</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Lien</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => (
                  <tr key={it.id} className="border-t border-border align-top">
                    <td className="px-3 py-2">
                      {it.imageOriginalUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageOriginalUrl} alt="" className="h-12 w-12 rounded-sm object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-sm bg-surface" />
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink-2">{it.name}</div>
                      <div className="font-mono text-[10px] text-muted">{it.externalSourceId ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{it.category ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-xs">{it.oemReference ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatPrice(it.price)}</td>
                    <td className="px-3 py-2 text-xs">{it.status}</td>
                    <td className="px-3 py-2 text-xs">{it.externalSource ? SOURCE_LABELS[it.externalSource] : '—'}</td>
                    <td className="px-3 py-2 text-xs">
                      {it.externalSourceUrl ? (
                        <a
                          href={it.externalSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-2 underline hover:no-underline"
                        >
                          ↗
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
                {data.items.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-sm text-muted">Aucun import externe.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} imports · page {data.pagination.page}/{data.pagination.totalPages || 1}</div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >←</button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
