/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'
import {
  sourcingFetch,
  type Paginated,
  type SourcingSearchRow,
  type SourcingSearchStatus,
  type SourcingOrigin,
} from '@/lib/sourcing-api'

const STATUS_LABEL: Record<SourcingSearchStatus, string> = {
  PENDING: 'En attente',
  RUNNING: 'Recherche en cours',
  DONE: 'Prêt',
  FAILED: 'Échec',
}

const STATUS_CHIP: Record<SourcingSearchStatus, 'oem' | 'status-ok' | 'status-warn' | 'status-err'> =
  {
    PENDING: 'status-warn',
    RUNNING: 'status-warn',
    DONE: 'status-ok',
    FAILED: 'status-err',
  }

const ORIGIN_LABEL: Record<SourcingOrigin, string> = {
  MANUAL: 'Saisie ops',
  AGENT: 'Recherche auto',
}

interface Stats {
  byStatus: Record<string, number>
  byOrigin: Record<string, number>
  offersByStatus: Record<string, number>
  total: number
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'short' })

export default function AdminSourcingPage() {
  const [data, setData] = useState<Paginated<SourcingSearchRow> | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<SourcingSearchStatus | ''>('')
  const [origin, setOrigin] = useState<SourcingOrigin | ''>('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (origin) params.set('origin', origin)
    params.set('page', String(page))
    const res = await sourcingFetch<Paginated<SourcingSearchRow>>(`/searches?${params}`)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setData(res.data)
  }, [q, status, origin, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    sourcingFetch<Stats>('/searches/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl text-ink">Sourcing</h1>
        <p className="mt-1 text-sm text-muted">
          Un dossier par besoin client. Vous y collez les liens des pages vendeur trouvées, puis la
          matrice compare les offres au coût rendu Abidjan, immobilisation comprise.
        </p>
      </div>

      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Dossiers" value={stats.total} />
          <Kpi label="Offres retenues" value={stats.offersByStatus.SHORTLISTED ?? 0} />
          <Kpi label="Offres commandées" value={stats.offersByStatus.ORDERED ?? 0} />
          <Kpi label="Saisis à la main" value={stats.byOrigin.MANUAL ?? 0} />
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Rechercher (pièce, OEM, référence de cotation)"
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as SourcingSearchStatus | '')
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABEL) as SourcingSearchStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          value={origin}
          onChange={(e) => {
            setPage(1)
            setOrigin(e.target.value as SourcingOrigin | '')
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">Toutes provenances</option>
          {(Object.keys(ORIGIN_LABEL) as SourcingOrigin[]).map((o) => (
            <option key={o} value={o}>
              {ORIGIN_LABEL[o]}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Pièce</Th>
                  <Th>Cotation</Th>
                  <Th>Véhicule</Th>
                  <Th align="right">Offres</Th>
                  <Th>Provenance</Th>
                  <Th>Statut</Th>
                  <Th>Créé le</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/admin/sourcing/${s.id}`} className="font-medium text-ink hover:underline">
                        {s.partName}
                      </Link>
                      {s.oemReference && (
                        <div className="font-mono text-[10px] text-muted">OEM {s.oemReference}</div>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">
                      {s.quoteRequest ? (
                        <Link
                          href={`/admin/logistique/${s.quoteRequest.id}`}
                          className="text-ink-2 hover:underline"
                        >
                          {s.quoteRequest.reference}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-xs text-muted">
                      {[s.vehicleBrand, s.vehicleModel, s.vehicleYear].filter(Boolean).join(' ') || '—'}
                    </Td>
                    <Td num>{s._count.offers}</Td>
                    <Td className="text-xs">{ORIGIN_LABEL[s.origin]}</Td>
                    <Td>
                      <Chip variant={STATUS_CHIP[s.status]}>{STATUS_LABEL[s.status]}</Chip>
                    </Td>
                    <Td className="text-xs text-muted">{fmtDate(s.createdAt)}</Td>
                  </Tr>
                ))}
                {data.items.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={7} align="center" className="py-6 text-muted">
                      Aucun dossier de sourcing. Ouvrez-en un depuis une cotation logistique.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} dossiers · page {data.page}/{totalPages}
            </div>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                ←
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value.toLocaleString('fr-FR')}</div>
    </div>
  )
}
