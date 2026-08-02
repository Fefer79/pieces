'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  supportFetch,
  fmtFcfa,
  type ReturnStatus,
  type SupportReturnList,
} from '@/lib/support-api'
import {
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
  formatDate,
} from '@/lib/support-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const RETURN_STATUSES = Object.keys(RETURN_STATUS_LABELS) as ReturnStatus[]

export default function SupportRetoursPage() {
  const [data, setData] = useState<SupportReturnList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [statut, setStatut] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (qDebounced) params.set('search', qDebounced)
    if (statut) params.set('statut', statut)
    params.set('page', String(page))
    supportFetch<SupportReturnList>(`/returns?${params}`).then((res) => {
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
    load()
  }, [load])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (motif, description, n° de commande)…"
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
        {RETURN_STATUSES.map((s) => (
          <FilterChip
            key={s}
            active={statut === s}
            label={RETURN_STATUS_LABELS[s]}
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
                  <Th>Demandeur</Th>
                  <Th>Motif</Th>
                  <Th>Statut</Th>
                  <Th align="right">Remboursé</Th>
                  <Th align="right"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.returns.map((r) => (
                  <Tr key={r.id}>
                    <Td className="whitespace-nowrap text-sm">{formatDate(r.requestedAt)}</Td>
                    <Td>
                      <span className="font-mono text-xs text-ink">#{r.orderId.slice(0, 8)}</span>
                      <div className="text-xs text-muted">{fmtFcfa(r.order.totalAmount)}</div>
                    </Td>
                    <Td>
                      <span className="text-ink">{r.requestedBy.name ?? '—'}</span>
                      {r.requestedBy.phone && (
                        <div className="text-xs text-muted">{r.requestedBy.phone}</div>
                      )}
                    </Td>
                    <Td>
                      <span className="text-sm">{RETURN_REASON_LABELS[r.reason]}</span>
                      {r.description && (
                        <div
                          className="max-w-[240px] truncate text-xs text-muted"
                          title={r.description}
                        >
                          {r.description}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Chip variant={RETURN_STATUS_VARIANTS[r.status]}>
                        {RETURN_STATUS_LABELS[r.status]}
                      </Chip>
                    </Td>
                    <Td num>{r.refundAmount != null ? fmtFcfa(r.refundAmount) : '—'}</Td>
                    <Td align="right">
                      <Link
                        href={`/admin/support/retours/${r.id}`}
                        className="rounded-sm border border-border-strong px-2 py-1 text-[11px] font-medium hover:bg-surface"
                      >
                        Fiche
                      </Link>
                    </Td>
                  </Tr>
                ))}
                {data.returns.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={7} align="center" className="py-6 text-muted">
                      Aucun retour pour ce filtre.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} retours · page {data.page}/{Math.max(1, Math.ceil(data.total / data.limit))}
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
        active ? 'border-ink bg-ink text-white' : 'border-border bg-card text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
