/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip } from '@/components/ui/chip'
import {
  shipmentFetch,
  CARRIER_LABELS,
  SHIPMENT_STATUS_LABELS,
  type Paginated,
  type ShipmentRow,
  type ShipmentStatusCode,
  type ShipmentCarrierCode,
} from '@/lib/sourcing-api'

const STATUS_CHIP: Record<ShipmentStatusCode, 'plain' | 'oem' | 'status-ok' | 'status-warn' | 'status-err'> =
  {
    SOURCING: 'plain',
    COLLECTED: 'oem',
    IN_TRANSIT: 'status-warn',
    CUSTOMS: 'status-warn',
    LOCAL_DELIVERY: 'status-warn',
    DELIVERED: 'status-ok',
    CANCELLED: 'status-err',
  }

interface Stats {
  byStatus: Record<string, number>
  total: number
  enCours: number
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—')

export default function AdminExpeditionsPage() {
  const [data, setData] = useState<Paginated<ShipmentRow> | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<ShipmentStatusCode | ''>('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    params.set('page', String(page))
    const res = await shipmentFetch<Paginated<ShipmentRow>>(`?${params}`)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setData(res.data)
  }, [q, status, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    shipmentFetch<Stats>('/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl text-ink">Expéditions</h1>
        <p className="mt-1 text-sm text-muted">
          Suivi du transport international jusqu&apos;à l&apos;entrepôt. Saisie ops et lien
          transporteur — les livraisons coursier dans Abidjan restent dans le module Livraisons.
        </p>
      </div>

      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Total" value={stats.total} />
          <Kpi label="En cours" value={stats.enCours} />
          <Kpi label="En transit" value={stats.byStatus.IN_TRANSIT ?? 0} />
          <Kpi label="En douane" value={stats.byStatus.CUSTOMS ?? 0} />
        </div>
      )}

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <input
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Rechercher (référence, n° de suivi, BC, cotation)"
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        />
        <select
          value={status}
          onChange={(e) => {
            setPage(1)
            setStatus(e.target.value as ShipmentStatusCode | '')
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
        >
          <option value="">Toutes les étapes</option>
          {(Object.keys(SHIPMENT_STATUS_LABELS) as ShipmentStatusCode[]).map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_STATUS_LABELS[s]}
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
                  <Th>Référence</Th>
                  <Th>Pièce</Th>
                  <Th>Transporteur</Th>
                  <Th>Suivi</Th>
                  <Th>Étape</Th>
                  <Th>ETA</Th>
                  <Th>BC</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link
                        href={`/admin/expeditions/${s.id}`}
                        className="font-mono text-[13px] font-medium text-ink hover:underline"
                      >
                        {s.reference}
                      </Link>
                      {s.quoteRequest && (
                        <div className="font-mono text-[10px] text-muted">
                          {s.quoteRequest.reference}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs">{s.quoteRequest?.partName ?? '—'}</Td>
                    <Td className="text-xs">
                      {CARRIER_LABELS[s.carrier as ShipmentCarrierCode] ?? s.carrier}
                    </Td>
                    <Td className="font-mono text-xs">
                      {s.trackingUrl && s.trackingNumber ? (
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-2 hover:underline"
                        >
                          {s.trackingNumber} ↗
                        </a>
                      ) : (
                        (s.trackingNumber ?? '—')
                      )}
                    </Td>
                    <Td>
                      <Chip variant={STATUS_CHIP[s.status]}>
                        {SHIPMENT_STATUS_LABELS[s.status]}
                      </Chip>
                    </Td>
                    <Td className="text-xs text-muted">{fmtDate(s.etaAt)}</Td>
                    <Td className="font-mono text-xs">
                      {s.purchaseOrder ? (
                        <Link
                          href={`/admin/stock/achats/${s.purchaseOrder.id}`}
                          className="text-ink-2 hover:underline"
                        >
                          {s.purchaseOrder.numero}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </Tr>
                ))}
                {data.items.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={7} align="center" className="py-6 text-muted">
                      Aucune expédition. Créez-en une depuis un bon de commande.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} expéditions · page {data.page}/{totalPages}
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
