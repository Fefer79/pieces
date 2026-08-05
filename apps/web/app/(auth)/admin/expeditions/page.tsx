'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { shipmentFetch, fmtFcfa, type ShipmentRow, type ShipmentStatus } from '@/lib/sourcing-api'
import { SHIPMENT_STATUS_LABEL, CARRIERS } from 'shared/constants'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Chip } from '@/components/ui/chip'
import { STATUS_CHIP } from './_shared'

interface ListResponse {
  items: ShipmentRow[]
  total: number
  page: number
  pageSize: number
}

interface StatsResponse {
  byStatus: Record<string, number>
  total: number
  enCours: number
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'short' }) : '—'

const labelCls = 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const inputCls = 'rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

const COLUMNS: Array<Column<ShipmentRow>> = [
  {
    key: 'reference',
    header: 'Référence',
    render: (row) => (
      <>
        <Link
          href={`/admin/expeditions/${row.id}`}
          className="font-mono font-semibold text-ink hover:underline"
        >
          {row.reference}
        </Link>
        {row.quoteRequest && (
          <p className="font-mono text-[11px] text-muted-2">{row.quoteRequest.reference}</p>
        )}
      </>
    ),
  },
  {
    key: 'carrier',
    header: 'Transporteur',
    className: 'text-muted',
    render: (row) => (
      <>
        {CARRIERS[row.carrier]?.label ?? row.carrier}
        {row.trackingNumber && (
          <p className="font-mono text-[11px] text-muted-2">{row.trackingNumber}</p>
        )}
      </>
    ),
  },
  {
    key: 'purchaseOrder',
    header: 'Bon de commande',
    className: 'font-mono text-[12px] text-muted',
    hideOnMobile: true,
    render: (row) =>
      row.purchaseOrder ? (
        <Link href={`/admin/stock/achats/${row.purchaseOrder.id}`} className="hover:underline">
          {row.purchaseOrder.numero}
        </Link>
      ) : (
        '—'
      ),
  },
  {
    key: 'status',
    header: 'Étape',
    render: (row) => (
      <Chip variant={STATUS_CHIP[row.status]}>{SHIPMENT_STATUS_LABEL[row.status]}</Chip>
    ),
  },
  {
    key: 'eta',
    header: 'Arrivée estimée',
    className: 'text-muted',
    render: (row) => fmtDate(row.etaAt),
  },
  {
    key: 'cost',
    header: 'Coût logistique',
    num: true,
    render: (row) => (row.totalCostFcfa != null ? fmtFcfa(row.totalCostFcfa) : '—'),
  },
]

export default function AdminExpeditionsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [status, setStatus] = useState<ShipmentStatus | ''>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    params.set('page', String(page))
    shipmentFetch<ListResponse>(`/?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [status, q, page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    shipmentFetch<StatsResponse>('/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl text-ink">Expéditions</h1>
        <p className="mt-1 text-sm text-muted">
          Suivi des envois, de la collecte chez le fournisseur à la livraison à Abidjan. Les étapes
          sont saisies par l&apos;ops ; le client les voit sur sa page de suivi.
        </p>
      </div>

      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>Total</div>
            <div className="mt-1 text-2xl font-semibold text-ink">{stats.total}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>En cours</div>
            <div className="mt-1 text-2xl font-semibold text-ink">{stats.enCours}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>En douane</div>
            <div className="mt-1 text-2xl font-semibold text-ink">
              {stats.byStatus.CUSTOMS ?? 0}
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>Livrées</div>
            <div className="mt-1 text-2xl font-semibold text-ink">
              {stats.byStatus.DELIVERED ?? 0}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={`block ${labelCls}`}>Étape</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as ShipmentStatus | '')
              setPage(1)
            }}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">Toutes</option>
            {Object.entries(SHIPMENT_STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className={`block ${labelCls}`}>Recherche</label>
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Référence, n° de suivi, n° de BC…"
            className={`mt-1 w-full ${inputCls}`}
          />
        </div>
      </div>

      <DataTable
        columns={COLUMNS}
        rows={data?.items ?? []}
        rowKey={(row) => row.id}
        loading={data === null && !error}
        error={error}
        emptyLabel="Aucune expédition"
        emptyHint="Créez-en une depuis un bon de commande."
        page={page}
        pageSize={data?.pageSize ?? 20}
        total={data?.total ?? 0}
        onPageChange={setPage}
      />
    </div>
  )
}
