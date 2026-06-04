'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'

interface FleetAnalytics {
  totalSpend: number
  ordersCount: number
  vehiclesCount: number
  spendByMonth: { month: string; total: number }[]
  spendByCategory: { category: string; total: number }[]
  spendByUsageType: { usageType: string; total: number }[]
  spendByGroup: { groupName: string; total: number }[]
  avgCostPerKm: number | null
  costPerKmRanking: {
    vehicle: { id: string; brand: string; model: string; year: number; plate: string | null }
    totalSpend: number
    mileage: number
    costPerKm: number
  }[]
}

export default function FleetAnalyticsPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [data, setData] = useState<FleetAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  useEffect(() => {
    if (!enterpriseId) return
    let cancelled = false
    setLoading(true)
    enterpriseFetch<FleetAnalytics>(`/${enterpriseId}/analytics`).then((res) => {
      if (cancelled) return
      if (res.ok) setData(res.data)
      else setError(res.message)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [enterpriseId])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Entreprise
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Analytiques flotte</h1>
        <p className="mt-1 text-sm text-muted">
          Dépenses pièces consolidées : par catégorie, usage, groupe, et coût au kilomètre.
        </p>
        <Link href="/enterprise/dashboard" className="mt-2 inline-block text-xs text-muted hover:underline">
          ← Tableau de bord
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted">
          Chargement…
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi label="Dépense totale" value={`${data.totalSpend.toLocaleString('fr-FR')} F`} />
            <Kpi label="Commandes payées" value={String(data.ordersCount)} />
            <Kpi label="Véhicules" value={String(data.vehiclesCount)} />
            <Kpi
              label="Coût / km moyen"
              value={data.avgCostPerKm != null ? `${data.avgCostPerKm.toLocaleString('fr-FR')} F` : '—'}
            />
          </div>

          {data.totalSpend === 0 ? (
            <div className="rounded-md border border-border bg-card p-8 text-center text-sm text-muted">
              Aucune dépense enregistrée. Les analytiques apparaîtront dès les premières commandes payées
              rattachées à un véhicule.
            </div>
          ) : (
            <>
              {data.spendByMonth.some((m) => m.total > 0) && (
                <Card title="Dépense par mois (12 mois)">
                  <MonthlyBars data={data.spendByMonth} />
                </Card>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {data.spendByCategory.length > 0 && (
                  <Card title="Par catégorie de pièce">
                    <Bars
                      data={data.spendByCategory.map((d) => ({ label: d.category, total: d.total }))}
                      total={data.totalSpend}
                    />
                  </Card>
                )}
                {data.spendByUsageType.length > 0 && (
                  <Card title="Par type d'usage">
                    <Bars
                      data={data.spendByUsageType.map((d) => ({ label: d.usageType, total: d.total }))}
                      total={data.totalSpend}
                    />
                  </Card>
                )}
              </div>

              {data.spendByGroup.length > 0 && (
                <Card title="Par groupe / parc">
                  <Bars
                    data={data.spendByGroup.map((d) => ({ label: d.groupName, total: d.total }))}
                    total={data.totalSpend}
                  />
                </Card>
              )}

              {data.costPerKmRanking.length > 0 && (
                <Card title="Coût au kilomètre — véhicules les plus coûteux">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface/50">
                        <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                          <th className="px-2 py-2 font-medium">Véhicule</th>
                          <th className="px-2 py-2 font-medium text-right">Dépense</th>
                          <th className="px-2 py-2 font-medium text-right">Km</th>
                          <th className="px-2 py-2 font-medium text-right">Coût / km</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.costPerKmRanking.map((r) => (
                          <tr key={r.vehicle.id} className="border-t border-border">
                            <td className="px-2 py-2 text-ink">
                              <Link href={`/enterprise/vehicles/${r.vehicle.id}`} className="hover:underline">
                                {r.vehicle.brand} {r.vehicle.model} {r.vehicle.year}
                              </Link>
                              {r.vehicle.plate && (
                                <span className="ml-2 font-mono text-[10px] text-muted">{r.vehicle.plate}</span>
                              )}
                            </td>
                            <td className="px-2 py-2 text-right tabular text-muted">
                              {r.totalSpend.toLocaleString('fr-FR')} F
                            </td>
                            <td className="px-2 py-2 text-right tabular text-muted">
                              {r.mileage.toLocaleString('fr-FR')}
                            </td>
                            <td className="px-2 py-2 text-right font-semibold tabular text-ink">
                              {r.costPerKm.toLocaleString('fr-FR')} F
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold text-ink">{value}</div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 rounded-md border border-border bg-card p-4">
      <h2 className="mb-3 font-display text-lg text-ink">{title}</h2>
      {children}
    </div>
  )
}

function Bars({ data, total }: { data: { label: string; total: number }[]; total: number }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const w = Math.max(2, Math.round((d.total / max) * 100))
        const pct = total > 0 ? Math.round((d.total / total) * 100) : 0
        return (
          <div key={d.label} className="flex items-center gap-3">
            <span className="w-32 shrink-0 truncate text-xs text-ink" title={d.label}>
              {d.label}
            </span>
            <div className="h-4 flex-1 rounded-sm bg-surface/50">
              <div className="h-full rounded-sm bg-ink-2/70" style={{ width: `${w}%` }} />
            </div>
            <span className="w-28 shrink-0 text-right font-semibold tabular text-ink">
              {d.total.toLocaleString('fr-FR')} F
              <span className="ml-1 font-normal text-muted">({pct}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MonthlyBars({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => {
        const h = max > 0 ? Math.max(2, Math.round((d.total / max) * 100)) : 2
        const label = d.month.slice(5) + '/' + d.month.slice(2, 4)
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              title={`${d.month} : ${d.total.toLocaleString('fr-FR')} F`}
              className="w-full rounded-sm bg-ink-2/70"
              style={{ height: `${h}%` }}
            />
            <span className="font-mono text-[9px] text-muted">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
