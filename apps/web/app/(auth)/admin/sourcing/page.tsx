'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  sourcingFetch,
  SEARCH_STATUS_LABEL,
  type SourcingSearchRow,
  type SourcingSearchStatus,
} from '@/lib/sourcing-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Chip, type ChipVariant } from '@/components/ui/chip'

const STATUS_CHIP: Record<SourcingSearchStatus, ChipVariant> = {
  PENDING: 'plain',
  RUNNING: 'status-warn',
  DONE: 'status-ok',
  FAILED: 'status-err',
}

interface ListResponse {
  items: SourcingSearchRow[]
  total: number
  page: number
  pageSize: number
}

interface StatsResponse {
  byStatus: Record<string, number>
  offersByStatus: Record<string, number>
  searches: number
  offers: number
  offersWithPrice: number
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

const labelCls = 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const inputCls =
  'rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

export default function AdminSourcingPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [status, setStatus] = useState<SourcingSearchStatus | ''>('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    params.set('page', String(page))
    sourcingFetch<ListResponse>(`/searches?${params}`).then((res) => {
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
    sourcingFetch<StatsResponse>('/stats').then((res) => {
      if (res.ok) setStats(res.data)
    })
  }, [])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <h1 className="font-display text-2xl text-ink">Sourcing</h1>
        <p className="mt-1 text-sm text-muted">
          Recherche d&apos;offres réelles sur les sites de vente internationaux, puis arbitrage au
          coût rendu Abidjan. Les prix restent indicatifs tant qu&apos;un opérateur ne les a pas
          confirmés.
        </p>
      </div>

      {stats && (
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>Recherches</div>
            <div className="mt-1 text-2xl font-semibold text-ink">{stats.searches}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>En cours</div>
            <div className="mt-1 text-2xl font-semibold text-ink">
              {(stats.byStatus.PENDING ?? 0) + (stats.byStatus.RUNNING ?? 0)}
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>Offres trouvées</div>
            <div className="mt-1 text-2xl font-semibold text-ink">{stats.offers}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <div className={labelCls}>Offres avec prix</div>
            <div className="mt-1 text-2xl font-semibold text-ink">{stats.offersWithPrice}</div>
            <div className="mt-1 text-xs text-muted">
              {stats.offers - stats.offersWithPrice} à chiffrer auprès du vendeur
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={`block ${labelCls}`}>Statut</label>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as SourcingSearchStatus | '')
              setPage(1)
            }}
            className={`mt-1 ${inputCls}`}
          >
            <option value="">Tous</option>
            {Object.entries(SEARCH_STATUS_LABEL).map(([key, label]) => (
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
            placeholder="Pièce, référence OEM, modèle…"
            className={`mt-1 w-full ${inputCls}`}
          />
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-error-fg">{error}</p>}

      <div className="overflow-x-auto rounded-md border border-border">
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
            {data?.items.map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Link href={`/admin/sourcing/${row.id}`} className="font-semibold text-ink hover:underline">
                    {row.partName}
                  </Link>
                  {row.oemReference && (
                    <p className="font-mono text-[11px] text-muted-2">{row.oemReference}</p>
                  )}
                </Td>
                <Td className="text-muted">
                  {[row.vehicleBrand, row.vehicleModel, row.vehicleYear].filter(Boolean).join(' ') ||
                    '—'}
                </Td>
                <Td className="font-mono text-[12px] text-muted">
                  {row.quoteRequest ? (
                    <Link
                      href={`/admin/logistique/${row.quoteRequest.id}`}
                      className="hover:underline"
                    >
                      {row.quoteRequest.reference}
                    </Link>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td>
                  <Chip variant={STATUS_CHIP[row.status]}>{SEARCH_STATUS_LABEL[row.status]}</Chip>
                  {row.status === 'FAILED' && row.error && (
                    <p className="mt-1 text-[11px] text-error-fg">{row.error}</p>
                  )}
                </Td>
                <Td align="right" className="tabular text-ink">
                  {row._count.offers}
                </Td>
                <Td className="text-muted-2 text-[12px]">{fmtDate(row.createdAt)}</Td>
              </Tr>
            ))}
            {data && data.items.length === 0 && (
              <Tr hover={false}>
                <Td className="text-muted">
                  Aucune recherche. Lancez-en une depuis une demande de cotation.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </div>

      {data && data.total > data.pageSize && (
        <div className="mt-3 flex items-center gap-3 text-sm text-muted">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-sm border border-border px-3 py-1 disabled:opacity-40"
          >
            Précédent
          </button>
          <span>
            Page {data.page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="rounded-sm border border-border px-3 py-1 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}
