'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminFetch } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

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

// Ordre du funnel : de la découverte à la conclusion.
const FUNNEL_ORDER = ['A_CONTACTER', 'APPELE', 'VISITE', 'RELANCE', 'A_REVOIR', 'CONCLU', 'INJOIGNABLE', 'REJETE']

interface Stats {
  total: number
  converted: number
  recentActivities: number
  byStatut: { statut: string; count: number }[]
  byCommune: { commune: string | null; count: number }[]
  byLiaison: { liaisonId: string | null; liaisonName: string | null; count: number; conclu: number }[]
}

interface LiaisonOption {
  id: string
  name: string | null
  phone: string | null
}

interface ContactRow {
  id: string
  name: string
  shopName: string | null
  phone: string
  whatsapp: string | null
  commune: string | null
  statut: string
  relanceLe: string | null
  liaisonId: string | null
  vendorId: string | null
  source: string
  updatedAt: string
  liens: { id: string; url: string; type: string; label: string | null }[]
}

interface RadarSourceStats {
  source: string
  scanned: number
  imported: number
  dejaConnus: number
  sansTelephone: number
}

interface RadarResult {
  dryRun: boolean
  sources: RadarSourceStats[]
  totalImported: number
}

function sourceLabel(source: string): string {
  if (source === 'MANUEL') return 'Manuel'
  if (source === 'OSM') return 'OSM'
  const base = source.replace(/_CI$/i, '').replace(/_/g, ' ').toLowerCase()
  return base.charAt(0).toUpperCase() + base.slice(1)
}

interface ListResult {
  contacts: ContactRow[]
  total: number
}

export default function AdminProspectionPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [liaisons, setLiaisons] = useState<LiaisonOption[]>([])
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [statutFilter, setStatutFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [radar, setRadar] = useState<RadarResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<RadarResult | null>(null)

  const loadContacts = useCallback(() => {
    const params = new URLSearchParams()
    if (statutFilter) params.append('statut', statutFilter)
    if (sourceFilter) params.append('source', sourceFilter)
    if (search) params.append('search', search)
    params.append('limit', '100')
    adminFetch<ListResult>(`/contacts/?${params.toString()}`)
      .then((r) => {
        setContacts(r.contacts)
        setTotal(r.total)
      })
      .catch((e) => setError(e.message))
  }, [statutFilter, sourceFilter, search])

  useEffect(() => {
    adminFetch<Stats>('/contacts/stats').then(setStats).catch((e) => setError(e.message))
    adminFetch<LiaisonOption[]>('/admin/liaisons').then(setLiaisons).catch(() => {})
    adminFetch<RadarResult>('/contacts/radar/preview').then(setRadar).catch(() => {})
  }, [])

  async function runImport() {
    setImporting(true)
    setImportResult(null)
    try {
      const result = await adminFetch<RadarResult>('/contacts/radar/import', { method: 'POST' })
      setImportResult(result)
      loadContacts()
      adminFetch<Stats>('/contacts/stats').then(setStats).catch(() => {})
      adminFetch<RadarResult>('/contacts/radar/preview').then(setRadar).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur serveur')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  async function assign(contactId: string, liaisonId: string) {
    setBusyId(contactId)
    try {
      await adminFetch(`/contacts/${contactId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liaisonId: liaisonId || null }),
      })
      loadContacts()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur serveur')
    } finally {
      setBusyId(null)
    }
  }

  async function convert(contact: ContactRow) {
    if (!confirm(`Convertir « ${contact.shopName ?? contact.name} » en vendeur ?`)) return
    setBusyId(contact.id)
    try {
      await adminFetch(`/contacts/${contact.id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorType: 'INFORMAL' }),
      })
      loadContacts()
      adminFetch<Stats>('/contacts/stats').then(setStats).catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur serveur')
    } finally {
      setBusyId(null)
    }
  }

  const statutCounts = new Map(stats?.byStatut.map((s) => [s.statut, s.count]) ?? [])

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-1 font-display text-2xl text-ink">Prospection vendeurs</h1>
      <p className="mb-4 text-sm text-muted">
        Suivi du démarchage terrain : funnel, attribution aux liaisons et conversion en vendeurs.
      </p>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-md border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Prospects</p>
              <p className="mt-1 font-display text-2xl text-ink">{stats.total}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Convertis en vendeurs</p>
              <p className="mt-1 font-display text-2xl text-ink">{stats.converted}</p>
            </div>
            <div className="rounded-md border border-border bg-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">Actions (7 jours)</p>
              <p className="mt-1 font-display text-2xl text-ink">{stats.recentActivities}</p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {FUNNEL_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setStatutFilter(statutFilter === s ? '' : s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  STATUT_CLASSES[s]
                } ${statutFilter === s ? 'ring-2 ring-accent ring-offset-1' : 'opacity-80 hover:opacity-100'}`}
              >
                {STATUT_LABELS[s]} · {statutCounts.get(s) ?? 0}
              </button>
            ))}
          </div>

          {stats.byLiaison.length > 0 && (
            <div className="mb-4 overflow-x-auto rounded-md border border-border bg-card">
              <Table>
                <Thead>
                  <Tr hover={false}>
                    <Th>Liaison</Th>
                    <Th align="right">Prospects</Th>
                    <Th align="right">Conclus</Th>
                    <Th align="right">Taux</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {stats.byLiaison.map((l) => (
                    <Tr key={l.liaisonId ?? 'none'}>
                      <Td>{l.liaisonName ?? <span className="text-muted">Non assigné</span>}</Td>
                      <Td align="right" num>{l.count}</Td>
                      <Td align="right" num>{l.conclu}</Td>
                      <Td align="right" num>
                        {l.count > 0 ? `${Math.round((l.conclu / l.count) * 100)} %` : '—'}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </div>
          )}
        </>
      )}

      {radar && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg text-ink">Radar de leads</h2>
              <p className="text-xs text-muted">
                Boutiques OSM et vendeurs marketplaces déjà en base, transformables en prospects.
              </p>
            </div>
            <button
              onClick={runImport}
              disabled={importing || radar.totalImported === 0}
              className="shrink-0 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {importing
                ? 'Import en cours…'
                : radar.totalImported > 0
                  ? `Importer ${radar.totalImported} lead(s)`
                  : 'Aucun nouveau lead'}
            </button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted">
            {radar.sources.map((s) => (
              <li key={s.source}>
                <span className="font-medium text-ink">{sourceLabel(s.source)}</span> : {s.imported} importable(s) ·{' '}
                {s.dejaConnus} déjà connu(s) · {s.sansTelephone} sans téléphone
              </li>
            ))}
            {radar.sources.length === 0 && (
              <li>
                Aucune source détectée — lancez d&apos;abord <code className="font-mono">pnpm -F ingest ingest --source=osm</code>{' '}
                ou l&apos;import CoinAfrique.
              </li>
            )}
          </ul>
          {importResult && (
            <p className="mt-2 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              ✓ {importResult.totalImported} prospect(s) importé(s)
            </p>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Rechercher (nom, boutique, téléphone)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-ink placeholder-muted"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">Toutes les sources</option>
          <option value="MANUEL">Manuel</option>
          {radar?.sources.map((s) => (
            <option key={s.source} value={s.source}>{sourceLabel(s.source)}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Prospect</Th>
              <Th>Commune</Th>
              <Th>Statut</Th>
              <Th>Liaison assignée</Th>
              <Th>Relance</Th>
              <Th align="right">Actions</Th>
            </Tr>
          </Thead>
          <Tbody>
            {contacts.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="font-medium text-ink">{c.name}</p>
                  <p className="text-xs text-muted">
                    {c.shopName && <>{c.shopName} · </>}
                    <span className="font-mono">{c.phone}</span>
                    {c.source !== 'MANUEL' && (
                      <span className="ml-1.5 rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                        {sourceLabel(c.source)}
                      </span>
                    )}
                  </p>
                </Td>
                <Td>{c.commune ?? <span className="text-muted">—</span>}</Td>
                <Td>
                  <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUT_CLASSES[c.statut] ?? ''}`}>
                    {STATUT_LABELS[c.statut] ?? c.statut}
                  </span>
                </Td>
                <Td>
                  <select
                    value={c.liaisonId ?? ''}
                    disabled={busyId === c.id}
                    onChange={(e) => assign(c.id, e.target.value)}
                    className="w-full max-w-[180px] rounded-md border border-border bg-card px-2 py-1.5 text-xs text-ink"
                  >
                    <option value="">Non assigné</option>
                    {liaisons.map((l) => (
                      <option key={l.id} value={l.id}>{l.name ?? l.phone ?? l.id}</option>
                    ))}
                  </select>
                </Td>
                <Td>
                  {c.relanceLe ? (
                    <span className="font-mono text-xs">{new Date(c.relanceLe).toLocaleDateString('fr-FR')}</span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </Td>
                <Td align="right">
                  {c.vendorId ? (
                    <span className="text-xs text-emerald-700">✓ Vendeur</span>
                  ) : (
                    <button
                      onClick={() => convert(c)}
                      disabled={busyId === c.id}
                      className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                    >
                      Convertir
                    </button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
        {contacts.length === 0 && (
          <p className="p-4 text-sm text-muted">Aucun prospect pour ces filtres.</p>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">{total} prospect(s) au total</p>
    </div>
  )
}
