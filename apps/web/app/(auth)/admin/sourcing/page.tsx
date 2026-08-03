'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  sourcingFetch,
  SEARCH_STATUS_LABELS,
  type Paginated,
  type SourcingSearchRow,
  type SourcingSearchStatus,
} from '@/lib/sourcing-api'
import { StatCard } from '@/components/ui/card'
import { SEARCH_STATUS_CHIP } from '@/lib/sourcing-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface Stats {
  byStatus: Partial<Record<SourcingSearchStatus, number>>
  offersByStatus: Record<string, number>
  total: number
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const vehicleOf = (s: SourcingSearchRow) =>
  [s.vehicleBrand, s.vehicleModel, s.vehicleYear].filter(Boolean).join(' ') || '—'

export default function AdminSourcingPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [list, setList] = useState<Paginated<SourcingSearchRow> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [page, setPage] = useState(1)

  const loadStats = useCallback(() => {
    sourcingFetch<Stats>('/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (qDebounced) params.set('q', qDebounced)
    params.set('page', String(page))
    sourcingFetch<Paginated<SourcingSearchRow>>(`/searches?${params}`).then((res) => {
      if (res.ok) {
        setList(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [status, qDebounced, page])

  // Recherche débouncée : évite un appel par frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setQDebounced(q.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = list ? Math.max(1, Math.ceil(list.total / list.pageSize)) : 1

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Recherches" value={stats?.total ?? '…'} />
        <StatCard label="En cours" value={(stats?.byStatus.RUNNING ?? 0) + (stats?.byStatus.PENDING ?? 0)} />
        <StatCard label="Offres retenues" value={stats?.offersByStatus.SHORTLISTED ?? 0} />
        <StatCard label="Offres commandées" value={stats?.offersByStatus.ORDERED ?? 0} />
      </div>

      <p className="mb-3 text-[13px] text-muted">
        Une recherche part d’une cotation logistique : ouvrez la demande dans{' '}
        <Link href="/admin/logistique" className="underline underline-offset-2">
          Cotations logistique
        </Link>{' '}
        et lancez « Rechercher des offres ».
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">Tous les statuts</option>
          {Object.entries(SEARCH_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pièce, référence OEM, véhicule…"
          className="min-w-[240px] flex-1 rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        />
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          {error}
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Pièce</Th>
              <Th>Véhicule</Th>
              <Th>Cotation</Th>
              <Th>Statut</Th>
              <Th align="right">Offres</Th>
              <Th>Lancée le</Th>
            </Tr>
          </Thead>
          <Tbody>
            {list?.items.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link href={`/admin/sourcing/${s.id}`} className="font-medium underline underline-offset-2">
                    {s.partName}
                  </Link>
                  {s.oemReference && (
                    <div className="font-mono text-[11.5px] text-muted">{s.oemReference}</div>
                  )}
                </Td>
                <Td>{vehicleOf(s)}</Td>
                <Td>
                  {s.quoteRequest ? (
                    <Link
                      href={`/admin/logistique/${s.quoteRequest.id}`}
                      className="font-mono text-[12px] underline underline-offset-2"
                    >
                      {s.quoteRequest.reference}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Chip variant={SEARCH_STATUS_CHIP[s.status]}>{SEARCH_STATUS_LABELS[s.status]}</Chip>
                  {s.status === 'FAILED' && s.error && (
                    <div className="mt-1 text-[11.5px] text-muted">{s.error}</div>
                  )}
                </Td>
                <Td num align="right">
                  {s._count?.offers ?? 0}
                </Td>
                <Td>{fmtDate(s.createdAt)}</Td>
              </Tr>
            ))}
            {list && list.items.length === 0 && (
              <Tr hover={false}>
                <Td colSpan={6}>
                  <span className="text-muted">Aucune recherche.</span>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </div>

      {list && list.total > list.pageSize && (
        <div className="mt-3 flex items-center gap-3 text-[13px]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-sm border border-border-strong px-3 py-1.5 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="font-mono text-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-sm border border-border-strong px-3 py-1.5 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
