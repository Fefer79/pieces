'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  shipmentFetch,
  SHIPMENT_STATUS_LABELS,
  CARRIER_LABELS,
  type Paginated,
  type ShipmentRow,
  type ShipmentStatus,
} from '@/lib/sourcing-api'
import { StatCard } from '@/components/ui/card'
import { SHIPMENT_STATUS_CHIP } from '@/lib/sourcing-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface Stats {
  byStatus: Partial<Record<ShipmentStatus, number>>
  total: number
  enCours: number
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—'

export default function AdminExpeditionsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [list, setList] = useState<Paginated<ShipmentRow> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [qDebounced, setQDebounced] = useState('')
  const [page, setPage] = useState(1)

  const loadStats = useCallback(() => {
    shipmentFetch<Stats>('/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (qDebounced) params.set('q', qDebounced)
    params.set('page', String(page))
    shipmentFetch<Paginated<ShipmentRow>>(`/?${params}`).then((res) => {
      if (res.ok) {
        setList(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [status, qDebounced, page])

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
        <StatCard label="Expéditions" value={stats?.total ?? '…'} />
        <StatCard label="En cours" value={stats?.enCours ?? '…'} />
        <StatCard label="En dédouanement" value={stats?.byStatus.CUSTOMS ?? 0} />
        <StatCard label="Livrées" value={stats?.byStatus.DELIVERED ?? 0} />
      </div>

      <p className="mb-3 text-[13px] text-muted">
        Une expédition se crée depuis un bon de commande, dans{' '}
        <Link href="/admin/stock/achats" className="underline underline-offset-2">
          Stock &amp; achats
        </Link>
        .
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
          {Object.entries(SHIPMENT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Référence, n° de suivi, n° de BC…"
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
              <Th>Référence</Th>
              <Th>Pièce</Th>
              <Th>Transporteur</Th>
              <Th>Statut</Th>
              <Th>Arrivée estimée</Th>
              <Th>Bon de commande</Th>
            </Tr>
          </Thead>
          <Tbody>
            {list?.items.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <Link
                    href={`/admin/expeditions/${s.id}`}
                    className="font-mono text-[12.5px] underline underline-offset-2"
                  >
                    {s.reference}
                  </Link>
                </Td>
                <Td>{s.quoteRequest?.partName ?? '—'}</Td>
                <Td>
                  {CARRIER_LABELS[s.carrier]}
                  {s.trackingNumber && (
                    <div className="font-mono text-[11.5px] text-muted">{s.trackingNumber}</div>
                  )}
                </Td>
                <Td>
                  <Chip variant={SHIPMENT_STATUS_CHIP[s.status]}>
                    {SHIPMENT_STATUS_LABELS[s.status]}
                  </Chip>
                </Td>
                <Td>{fmtDate(s.etaAt)}</Td>
                <Td>
                  {s.purchaseOrder ? (
                    <Link
                      href={`/admin/stock/achats/${s.purchaseOrder.id}`}
                      className="font-mono text-[12px] underline underline-offset-2"
                    >
                      {s.purchaseOrder.numero}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
              </Tr>
            ))}
            {list && list.items.length === 0 && (
              <Tr hover={false}>
                <Td colSpan={6}>
                  <span className="text-muted">Aucune expédition.</span>
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
