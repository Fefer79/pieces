'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  financeFetch,
  fmtFcfa,
  type FinanceMonthly,
  type FinanceOverview,
} from '@/lib/finance-api'
import {
  currentPeriode,
  formatPeriode,
  formatVariation,
  recentPeriodes,
  variationTone,
} from '@/lib/finance-utils'
import { StatCard } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const PERIODES = recentPeriodes(12)

function deltaDirection(n: number | null): 'up' | 'down' | 'flat' {
  if (n == null || n === 0) return 'flat'
  return n > 0 ? 'up' : 'down'
}

export default function FinanceOverviewPage() {
  const [periode, setPeriode] = useState(currentPeriode())
  const [overview, setOverview] = useState<FinanceOverview | null>(null)
  const [monthly, setMonthly] = useState<FinanceMonthly | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadOverview = useCallback(() => {
    financeFetch<FinanceOverview>(`/overview?periode=${periode}`).then((res) => {
      if (res.ok) {
        setOverview(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }, [periode])

  const loadMonthly = useCallback(() => {
    financeFetch<FinanceMonthly>('/monthly?months=12').then((res) => {
      if (res.ok) setMonthly(res.data)
    })
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  useEffect(() => {
    loadMonthly()
  }, [loadMonthly])

  const buckets = monthly?.buckets ?? []

  // Variation du GMV d'un bucket vs le mois précédent (même règle que l'API :
  // null quand la base est nulle).
  function bucketVariation(i: number): number | null {
    const cur = buckets[i]
    const prev = i > 0 ? buckets[i - 1] : undefined
    if (!cur || !prev || prev.gmv <= 0) return null
    return Math.round(((cur.gmv - prev.gmv) / prev.gmv) * 1000) / 10
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          {PERIODES.map((p) => (
            <option key={p} value={p}>
              {formatPeriode(p)}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={`GMV · ${formatPeriode(periode)}`}
          value={overview ? fmtFcfa(overview.gmv) : '…'}
          delta={
            overview ? `${formatVariation(overview.variation.gmv)} vs mois précédent` : undefined
          }
          deltaDirection={overview ? deltaDirection(overview.variation.gmv) : undefined}
        />
        <StatCard
          label="Commissions plateforme"
          value={overview ? fmtFcfa(overview.commissions) : '…'}
          delta={
            overview
              ? `${formatVariation(overview.variation.commissions)} vs mois précédent`
              : undefined
          }
          deltaDirection={overview ? deltaDirection(overview.variation.commissions) : undefined}
        />
        <StatCard label="Commandes terminées" value={overview?.commandes ?? '…'} />
        <StatCard
          label="Panier moyen"
          value={overview ? fmtFcfa(overview.panierMoyen) : '…'}
        />
        <StatCard
          label="Frais de livraison"
          value={overview ? fmtFcfa(overview.fraisLivraison) : '…'}
        />
        <StatCard
          label="Main-d'œuvre"
          value={overview ? fmtFcfa(overview.mainOeuvre) : '…'}
        />
        <StatCard
          label="Escrow bloqué"
          value={overview ? fmtFcfa(overview.escrowBloque) : '…'}
          delta={overview ? 'instantané, toutes périodes' : undefined}
        />
        <StatCard
          label="Escrow libéré"
          value={overview ? fmtFcfa(overview.escrowLibere) : '…'}
          delta={overview ? `libéré en ${formatPeriode(periode)}` : undefined}
        />
      </div>

      <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        12 derniers mois
      </h2>
      {!monthly ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Période</Th>
                <Th align="right">GMV</Th>
                <Th align="right">Commissions</Th>
                <Th align="right">Commandes</Th>
                <Th align="right">Var. GMV</Th>
              </Tr>
            </Thead>
            <Tbody>
              {buckets.map((b, i) => {
                const variation = bucketVariation(i)
                return (
                  <Tr key={b.periode}>
                    <Td className="text-sm">{formatPeriode(b.periode)}</Td>
                    <Td num>{fmtFcfa(b.gmv)}</Td>
                    <Td num>{fmtFcfa(b.commissions)}</Td>
                    <Td num>{b.orders}</Td>
                    <Td num className={variationTone(variation)}>
                      {formatVariation(variation)}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        </div>
      )}
    </div>
  )
}
