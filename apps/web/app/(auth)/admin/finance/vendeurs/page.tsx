'use client'

import { useCallback, useEffect, useState } from 'react'
import { financeFetch, fmtFcfa, type FinanceVendorList } from '@/lib/finance-api'
import { currentPeriode, formatPeriode, recentPeriodes } from '@/lib/finance-utils'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const PERIODES = recentPeriodes(12)

export default function FinanceVendeursPage() {
  const [data, setData] = useState<FinanceVendorList | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [periode, setPeriode] = useState(currentPeriode())
  const [page, setPage] = useState(1)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    params.set('periode', periode)
    params.set('page', String(page))
    financeFetch<FinanceVendorList>(`/vendors?${params}`).then((res) => {
      if (res.ok) {
        setData(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [periode, page])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={periode}
          onChange={(e) => {
            setPage(1)
            setPeriode(e.target.value)
          }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {formatPeriode(p)}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted">
          Commandes terminées de la période, triées par commissions décroissantes.
        </span>
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
                  <Th>Vendeur</Th>
                  <Th>Téléphone</Th>
                  <Th align="right">Commandes</Th>
                  <Th align="right">GMV</Th>
                  <Th align="right">Commissions</Th>
                  <Th align="right">Escrow en cours</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.vendors.map((v) => (
                  <Tr key={v.vendorId}>
                    <Td className="font-medium text-ink">{v.shopName}</Td>
                    <Td className="font-mono text-xs text-muted">{v.phone ?? '—'}</Td>
                    <Td num>{v.commandes}</Td>
                    <Td num>{fmtFcfa(v.gmv)}</Td>
                    <Td num className="font-semibold">
                      {fmtFcfa(v.commissions)}
                    </Td>
                    <Td num>{fmtFcfa(v.escrowEnCours)}</Td>
                  </Tr>
                ))}
                {data.vendors.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={6} align="center" className="py-6 text-muted">
                      Aucune commande terminée sur {formatPeriode(periode)}.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>
              {data.total} vendeurs · page {data.page}/
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
