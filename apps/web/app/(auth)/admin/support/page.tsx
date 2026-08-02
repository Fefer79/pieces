'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supportFetch,
  fmtFcfa,
  type DisputeStatus,
  type SupportDisputeList,
  type SupportOverview,
} from '@/lib/support-api'
import { DISPUTE_STATUS_LABELS, DISPUTE_STATUS_VARIANTS, formatDate } from '@/lib/support-utils'
import { StatCard } from '@/components/ui/card'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const DISPUTE_STATUSES = Object.keys(DISPUTE_STATUS_LABELS) as DisputeStatus[]

export default function SupportLitigesPage() {
  const [overview, setOverview] = useState<SupportOverview | null>(null)
  const [data, setData] = useState<SupportDisputeList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)

  const loadOverview = useCallback(() => {
    supportFetch<SupportOverview>('/overview').then((res) => {
      if (res.ok) setOverview(res.data)
    })
  }, [])

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (qDebounced) params.set('search', qDebounced)
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    supportFetch<SupportDisputeList>(`/disputes?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [qDebounced, statut, page])

  // Recherche débouncée : évite un appel par frappe.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setQDebounced(q.trim())
    }, 300)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard label="Litiges ouverts" value={overview?.litigesOuverts ?? '…'} />
        <StatCard label="En cours d'examen" value={overview?.litigesEnCours ?? '…'} />
        <StatCard label="Résolus · 30 j" value={overview?.litigesResolus30j ?? '…'} />
        <StatCard label="Retours demandés" value={overview?.retoursDemandes ?? '…'} />
        <StatCard label="Retours en cours" value={overview?.retoursEnCours ?? '…'} />
        <StatCard
          label="Remboursé · 30 j"
          value={overview ? fmtFcfa(overview.montantRembourse30j) : '…'}
          delta={overview ? `${overview.rembourses30j} retour(s)` : undefined}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (raison, n° de commande)…"
          className="min-w-[200px] flex-1 rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip
          active={statut === ''}
          label="Tous"
          onClick={() => {
            setPage(1)
            setStatut('')
          }}
        />
        {DISPUTE_STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={statut === s}
            label={DISPUTE_STATUS_LABELS[s]}
            onClick={() => {
              setPage(1)
              setStatut(s)
            }}
          />
        ))}
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
                  <Th>Date</Th>
                  <Th>Commande</Th>
                  <Th>Plaignant</Th>
                  <Th>Raison</Th>
                  <Th>Statut</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.disputes.map((d) => (
                  <Tr key={d.id}>
                    <Td className="whitespace-nowrap text-sm">{formatDate(d.createdAt)}</Td>
                    <Td>
                      <span className="font-mono text-xs text-ink">#{d.orderId.slice(0, 8)}</span>
                      <div className="text-xs text-muted">{fmtFcfa(d.order.totalAmount)}</div>
                    </Td>
                    <Td>
                      <span className="text-ink">{d.opener.name ?? '—'}</span>
                      {d.opener.phone && <div className="text-xs text-muted">{d.opener.phone}</div>}
                    </Td>
                    <Td>
                      <span className="block max-w-[280px] truncate text-sm" title={d.reason}>
                        {d.reason}
                      </span>
                    </Td>
                    <Td>
                      <Chip variant={DISPUTE_STATUS_VARIANTS[d.status]}>
                        {DISPUTE_STATUS_LABELS[d.status]}
                      </Chip>
                    </Td>
                    <Td align="right">
                      <Link
                        href={`/admin/support/litiges/${d.id}`}
                        className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                      >
                        Fiche
                      </Link>
                    </Td>
                  </Tr>
                ))}
                {data.disputes.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={6} align="center" className="py-6 text-muted">
                      Aucun litige pour ce filtre.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} litiges · page {data.page}/{Math.max(1, Math.ceil(data.total / data.limit))}
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
                disabled={page >= Math.ceil(data.total / data.limit)}
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

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active
          ? 'border-ink bg-ink text-white'
          : 'border-border bg-card text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
