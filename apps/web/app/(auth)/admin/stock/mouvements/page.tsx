'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  stockFetch,
  fmtFcfa,
  type StockLocation,
  type StockMovementList,
  type StockMovementType,
} from '@/lib/stock-api'
import {
  MOVEMENT_TYPE_LABELS,
  movementQuantityPrefix,
  movementTypeVariant,
} from '@/lib/stock-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { CatalogItemPicker, type PickedCatalogItem } from '@/components/catalog-item-picker'

const PAGE_SIZE = 50

export default function StockMouvementsPage() {
  const [data, setData] = useState<StockMovementList | null>(null)
  const [locations, setLocations] = useState<StockLocation[]>([])
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState('')
  const [locationId, setLocationId] = useState('')
  const [item, setItem] = useState<PickedCatalogItem | null>(null)
  // Filtres dates : appliqués côté client sur la page chargée — l'API ne
  // supporte pas (encore) de bornes de dates sur /movements.
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    if (locationId) params.set('locationId', locationId)
    if (item) params.set('catalogItemId', item.id)
    params.set('page', String(page))
    params.set('limit', String(PAGE_SIZE))
    stockFetch<StockMovementList>(`/movements?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [type, locationId, item, page])

  useEffect(() => {
    stockFetch<StockLocation[]>('/locations').then((res) => {
      if (res.ok) setLocations(res.data)
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
  const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null
  const movements = (data?.movements ?? []).filter((m) => {
    const t = new Date(m.createdAt).getTime()
    if (fromMs != null && t < fromMs) return false
    if (toMs != null && t > toMs) return false
    return true
  })

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <select
          value={type}
          onChange={(e) => {
            setPage(1)
            setType(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les types</option>
          {(Object.keys(MOVEMENT_TYPE_LABELS) as StockMovementType[]).map((t) => (
            <option key={t} value={t}>
              {MOVEMENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={locationId}
          onChange={(e) => {
            setPage(1)
            setLocationId(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les emplacements</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nom}
            </option>
          ))}
        </select>
        <div className="min-w-[220px]">
          <CatalogItemPicker
            value={item}
            onChange={(v) => {
              setPage(1)
              setItem(v)
            }}
            label="Fiche catalogue"
          />
        </div>
        <label className="text-xs text-muted">
          Du
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="ml-1 rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
          />
        </label>
        <label className="text-xs text-muted">
          Au
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="ml-1 rounded-sm border border-border-strong bg-card px-2 py-2 text-sm"
          />
        </label>
      </div>
      {(dateFrom || dateTo) && (
        <p className="mb-3 text-xs text-muted">
          Le filtre par dates s’applique à la page affichée (filtre serveur non disponible).
        </p>
      )}

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
                  <Th>Type</Th>
                  <Th>Pièce</Th>
                  <Th>Emplacement</Th>
                  <Th align="right">Quantité</Th>
                  <Th align="right">Coût unit.</Th>
                  <Th>Référence</Th>
                  <Th>Par</Th>
                </Tr>
              </Thead>
              <Tbody>
                {movements.map((m) => (
                  <Tr key={m.id}>
                    <Td className="whitespace-nowrap font-mono text-xs text-muted">
                      {new Date(m.createdAt).toLocaleString('fr-FR')}
                      {m.note && (
                        <div className="max-w-[180px] truncate text-muted-2">{m.note}</div>
                      )}
                    </Td>
                    <Td>
                      <Chip variant={movementTypeVariant(m.type)}>
                        {MOVEMENT_TYPE_LABELS[m.type]}
                      </Chip>
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/catalog/${m.catalogItem.id}`}
                        className="font-medium text-ink hover:text-accent hover:underline"
                      >
                        {m.catalogItem.name ?? '—'}
                      </Link>
                      {m.catalogItem.oemReference && (
                        <div className="font-mono text-xs text-muted">
                          Réf. {m.catalogItem.oemReference}
                        </div>
                      )}
                    </Td>
                    <Td className="text-sm">{m.location.nom}</Td>
                    <Td num>
                      {movementQuantityPrefix(m.type)}
                      {m.quantite}
                    </Td>
                    <Td num>{m.coutUnitaireFcfa != null ? fmtFcfa(m.coutUnitaireFcfa) : '—'}</Td>
                    <Td className="text-xs text-muted">
                      {m.refType === 'PurchaseOrder' && m.refId ? (
                        <Link
                          href={`/admin/stock/achats/${m.refId}`}
                          className="text-ink-2 hover:underline"
                        >
                          Bon de commande
                        </Link>
                      ) : m.refType === 'Order' ? (
                        'Commande'
                      ) : (
                        (m.refType ?? '—')
                      )}
                    </Td>
                    <Td className="text-xs text-muted">{m.actor?.name ?? '—'}</Td>
                  </Tr>
                ))}
                {movements.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={8} align="center" className="py-6 text-muted">
                      Aucun mouvement.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} mouvements · page {data.page}/
              {Math.max(1, Math.ceil(data.total / data.limit))}
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
