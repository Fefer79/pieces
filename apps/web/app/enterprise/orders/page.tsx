'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { statusLabels, getStatusColor } from '@/lib/order-status'
import { Price } from '@/components/ui/price'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { ConditionChip } from '@/components/ui/chip'
import {
  enterpriseFetch,
  enterpriseDownload,
  apiDownload,
  saveBlob,
  getActiveEnterpriseId,
  type EnterpriseOrder,
  type EnterpriseOrderPage,
  type FleetVehicle,
} from '@/lib/enterprise-api'

const ALL_STATUSES = Object.keys(statusLabels)

export default function EnterpriseOrdersPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [data, setData] = useState<EnterpriseOrderPage | null>(null)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')

  // Lecture du localStorage au montage — remplacé par le contexte entreprise
  // partagé à l'étape suivante du chantier ERP.
  useEffect(() => {
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setEnterpriseId(getActiveEnterpriseId())
    setReady(true)
  }, [])

  // Les filtres statut et véhicule passent par le serveur : les filtrer côté
  // client ne porterait que sur la page courante et donnerait des résultats
  // faux dès la page 2.
  const fetchOrders = useCallback(async () => {
    if (!enterpriseId) return
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFilter) params.set('status', statusFilter)
    if (vehicleFilter) params.set('vehicleId', vehicleFilter)
    const res = await enterpriseFetch<EnterpriseOrderPage>(
      `/${enterpriseId}/orders?${params.toString()}`,
    )
    setLoading(false)
    if (!res.ok) { setError(res.message); return }
    setData(res.data)
  }, [enterpriseId, page, statusFilter, vehicleFilter])

  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  useEffect(() => { fetchOrders() }, [fetchOrders])

  useEffect(() => {
    if (!enterpriseId) return
    enterpriseFetch<FleetVehicle[]>(`/${enterpriseId}/vehicles`).then((res) => {
      if (res.ok) setVehicles(res.data)
    })
  }, [enterpriseId])

  // Un changement de filtre doit ramener à la première page : sinon on reste
  // sur une page 3 qui n'existe plus dans le nouveau jeu de résultats.
  function applyFilter(next: { status?: string; vehicle?: string }) {
    if (next.status !== undefined) setStatusFilter(next.status)
    if (next.vehicle !== undefined) setVehicleFilter(next.vehicle)
    setPage(1)
  }

  async function downloadDevis(orderId: string) {
    const blob = await apiDownload(`/orders/${orderId}/devis.pdf`)
    if (blob) saveBlob(blob, `devis-${orderId.slice(0, 8)}.pdf`)
  }

  async function exportCsv() {
    if (!enterpriseId) return
    const blob = await enterpriseDownload(`/${enterpriseId}/orders/export.csv`)
    if (blob) saveBlob(blob, `commandes-${new Date().toISOString().slice(0, 10)}.csv`)
  }

  if (ready && !enterpriseId) {
    return (
      <div className="p-6 lg:p-8">
        <h1 className="font-display text-3xl text-ink">Commandes</h1>
        <p className="mt-2 text-sm text-muted">
          Sélectionnez ou créez d&apos;abord une entreprise.
        </p>
        <Link
          href="/enterprise/dashboard"
          className="mt-4 inline-block rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
        >
          Aller au tableau de bord
        </Link>
      </div>
    )
  }

  const orders = data?.orders ?? []
  const isOwnScope = data?.scope === 'own'

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Commandes</h1>
          <p className="mt-1 text-sm text-muted">
            {data
              ? `${data.total} commande${data.total > 1 ? 's' : ''}${isOwnScope ? ' que vous avez engagée' + (data.total > 1 ? 's' : '') : ' pour la flotte'}`
              : 'Chargement…'}
          </p>
        </div>
        {!isOwnScope && (
          <button
            onClick={exportCsv}
            disabled={!orders.length}
            className="flex items-center gap-2 rounded-md border border-border-strong bg-card px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exporter CSV
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => applyFilter({ status: e.target.value })}
          className="rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        >
          <option value="">Tous les statuts</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>

        <select
          value={vehicleFilter}
          onChange={(e) => applyFilter({ vehicle: e.target.value })}
          className="rounded-sm border border-border-strong bg-card px-4 py-2.5 text-sm text-ink outline-none transition-shadow focus:border-ink-2 focus:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]"
        >
          <option value="">Tous les véhicules</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.brand} {v.model}{v.plate ? ` · ${v.plate}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Date</Th>
              <Th>Véhicule</Th>
              {!isOwnScope && <Th>Demandeur</Th>}
              <Th>Pièces</Th>
              <Th align="right">Montant</Th>
              <Th>Statut</Th>
              <Th align="right">Documents</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading && (
              <Tr>
                <Td colSpan={isOwnScope ? 6 : 7} align="center" className="py-12 text-muted">
                  Chargement…
                </Td>
              </Tr>
            )}

            {!loading && orders.length === 0 && (
              <Tr>
                <Td colSpan={isOwnScope ? 6 : 7} align="center" className="py-12 text-muted">
                  Aucune commande{statusFilter || vehicleFilter ? ' correspondant aux filtres' : ''}.
                </Td>
              </Tr>
            )}

            {!loading && orders.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                showRequester={!isOwnScope}
                onDevis={() => downloadDevis(order.id)}
              />
            ))}
          </Tbody>
        </Table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="font-mono text-xs tabular text-muted">
            Page {page} sur {data.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              Précédent
            </button>
            <button
              onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
              className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm text-ink transition-colors hover:bg-surface disabled:opacity-50"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function OrderRow({
  order,
  showRequester,
  onDevis,
}: {
  order: EnterpriseOrder
  showRequester: boolean
  onDevis: () => void
}) {
  const color = getStatusColor(order.status)
  return (
    <Tr>
      <Td className="font-mono tabular text-muted">
        {new Date(order.createdAt).toLocaleDateString('fr-CI')}
        <p className="mt-0.5 font-mono text-[10px] text-muted">#{order.id.slice(0, 8)}</p>
      </Td>
      <Td className="text-ink">
        {order.vehicle ? (
          <Link
            href={`/enterprise/vehicles/${order.vehicle.id}`}
            className="hover:underline"
          >
            {order.vehicle.brand} {order.vehicle.model}
            {order.vehicle.plate && (
              <span className="mt-0.5 block font-mono text-[10px] text-muted">
                {order.vehicle.plate}
              </span>
            )}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        )}
      </Td>
      {showRequester && (
        <Td className="text-muted">{order.initiator.name ?? order.initiator.phone ?? '—'}</Td>
      )}
      <Td>
        <ul className="space-y-1">
          {order.items.map((item) => (
            <li key={item.id}>
              <span className="text-ink">
                {item.name}
                {item.quantity > 1 && <span className="text-muted"> ×{item.quantity}</span>}
              </span>
              {item.condition && (
                <span className="ml-2 inline-flex align-middle">
                  <ConditionChip condition={item.condition} />
                </span>
              )}
            </li>
          ))}
        </ul>
      </Td>
      <Td align="right">
        <Price amount={order.totalAmount} className="text-sm" />
      </Td>
      <Td>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${color.bg} ${color.text}`}>
          {statusLabels[order.status] ?? order.status}
        </span>
      </Td>
      <Td align="right">
        <button onClick={onDevis} className="text-sm font-medium text-ink-2 hover:underline">
          Devis
        </button>
        {order.invoice && (
          <span className="ml-2 font-mono text-[10px] text-muted">
            {order.invoice.invoiceNumber}
          </span>
        )}
      </Td>
    </Tr>
  )
}
