'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { StatCard, Card } from '@/components/ui/card'
import { ChartCard } from '@/components/ui/chart-card'
import { ErpShell } from '@/components/erp/erp-shell'
import { useErp } from '@/components/erp/erp-context'
import { erpFetch, fmtFcfa, fmtFcfaCompact, type Cockpit } from '@/lib/erp-api'
import { BUSINESS_UNIT_LABELS, type BusinessUnitKey } from 'shared/constants'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
)

const FILTERS: Array<{ value: BusinessUnitKey | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Toutes lignes' },
  { value: 'MARKETPLACE', label: BUSINESS_UNIT_LABELS.MARKETPLACE },
  { value: 'FLOTTE', label: BUSINESS_UNIT_LABELS.FLOTTE },
  { value: 'LOGISTIQUE', label: BUSINESS_UNIT_LABELS.LOGISTIQUE },
]

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'short' })
}

export default function ErpCockpitPage() {
  const me = useErp()
  const [filter, setFilter] = useState<BusinessUnitKey | 'ALL'>('ALL')
  const [data, setData] = useState<Cockpit | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Voir le commentaire de app/erp/layout.tsx : le travail est inline en IIFE
  // async pour satisfaire `react-hooks/set-state-in-effect`, et le rechargement
  // passe par `reloadToken`.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const qs = new URLSearchParams({ months: '6' })
      if (filter !== 'ALL') qs.set('businessUnit', filter)
      const res = await erpFetch<Cockpit>(`/cockpit?${qs.toString()}`)
      if (cancelled) return

      if (!res.ok) {
        setError(res.message)
        setLoading(false)
        return
      }
      setError(null)
      setData(res.data)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [filter, reloadToken])

  function reload() {
    setLoading(true)
    setReloadToken((t) => t + 1)
  }

  const evolution = data?.ventes.evolutionPct ?? null

  return (
    <ErpShell
      me={me}
      eyebrow="Pilotage"
      title="Cockpit"
      actions={
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                filter === f.value
                  ? 'bg-ink text-white'
                  : 'border border-border-strong bg-card text-ink hover:bg-surface'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      {error && (
        <Card className="mb-6 border-error-fg/30">
          <p className="text-[13.5px] text-error-fg">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="mt-3 rounded-sm border border-border-strong bg-card px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-surface"
          >
            Réessayer
          </button>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="CA du mois"
          value={loading ? '…' : fmtFcfaCompact(data?.ventes.caMois ?? 0)}
          {...(evolution !== null && {
            delta: `${evolution > 0 ? '+' : ''}${evolution} % vs mois précédent`,
            deltaDirection: evolution > 0 ? ('up' as const) : evolution < 0 ? ('down' as const) : ('flat' as const),
          })}
        />
        <StatCard
          label="Factures émises"
          value={loading ? '…' : (data?.ventes.facturesMois ?? 0)}
          delta={loading ? undefined : `Panier moyen ${fmtFcfaCompact(data?.ventes.panierMoyen ?? 0)}`}
          deltaDirection="flat"
        />
        <StatCard
          label="Commandes actives"
          value={loading ? '…' : (data?.commandes.actives ?? 0)}
          delta={loading ? undefined : `${data?.commandes.enAttentePaiement ?? 0} en attente de paiement`}
          deltaDirection="flat"
        />
        <StatCard
          label="Mes tâches"
          value={loading ? '…' : (data?.mesTaches.open ?? 0)}
          {...(!loading &&
            (data?.mesTaches.overdue ?? 0) > 0 && {
              delta: `${data?.mesTaches.overdue} en retard`,
              deltaDirection: 'down' as const,
            })}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <ChartCard
          title="Chiffre d’affaires facturé — 6 mois"
          className="lg:col-span-2"
          hint="Montants TTC issus des factures émises. La logistique ne produit pas encore de facture : son activité se lit dans le tunnel de cotation ci-contre."
        >
          <div className="h-[240px]">
            {data && (
              <Bar
                data={{
                  labels: data.serieCa.map((p) => monthLabel(p.mois)),
                  datasets: [
                    {
                      label: 'CA TTC',
                      data: data.serieCa.map((p) => p.ca),
                      backgroundColor: '#002366',
                      borderRadius: 4,
                      maxBarThickness: 44,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => fmtFcfa(ctx.parsed.y),
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      ticks: {
                        callback: (v) => fmtFcfaCompact(Number(v)),
                        font: { size: 10 },
                      },
                      grid: { color: '#E8E8E8' },
                    },
                  },
                }}
              />
            )}
          </div>
        </ChartCard>

        <div className="grid gap-4">
          <Card>
            <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Répartition du mois
            </div>
            {loading ? (
              <p className="text-[13px] text-muted">…</p>
            ) : (
              <ul className="space-y-2.5">
                {(data?.repartitionMois ?? []).map((r) => {
                  const totalMois = (data?.repartitionMois ?? []).reduce((n, x) => n + x.ca, 0)
                  const pct = totalMois > 0 ? Math.round((r.ca / totalMois) * 100) : 0
                  return (
                    <li key={r.businessUnit}>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13.5px] text-ink">
                          {BUSINESS_UNIT_LABELS[r.businessUnit]}
                        </span>
                        <span className="font-mono text-[13px] tabular text-ink">
                          {fmtFcfaCompact(r.ca)}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-ink-2"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Tunnel logistique
            </div>
            <dl className="space-y-2 text-[13.5px]">
              <Row label="Cotations ouvertes" value={data?.logistique.leadsOuverts} />
              <Row label="Gagnées ce mois" value={data?.logistique.leadsGagnesMois} />
            </dl>
            <Link
              href="/admin/logistique"
              className="mt-3 inline-block text-[13px] font-medium text-ink-2 underline decoration-border-strong underline-offset-2 hover:decoration-ink-2"
            >
              Ouvrir la file des cotations
            </Link>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Flottes
          </div>
          <dl className="space-y-2 text-[13.5px]">
            <Row label="Abonnements actifs" value={data?.flotte.abonnementsActifs} />
            <Row label="En période d’essai" value={data?.flotte.abonnementsEssai} />
            <Row label="Véhicules gérés" value={data?.flotte.vehiculesGeres} />
            <Row label="Entreprises" value={data?.flotte.entreprises} />
          </dl>
        </Card>

        <Card>
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Réseau vendeurs
          </div>
          <dl className="space-y-2 text-[13.5px]">
            <Row label="Vendeurs actifs" value={data?.crm.vendeursActifs} />
            <Row label="Prospects à travailler" value={data?.crm.prospectsVendeurs} />
          </dl>
          <Link
            href="/admin/prospection"
            className="mt-3 inline-block text-[13px] font-medium text-ink-2 underline decoration-border-strong underline-offset-2 hover:decoration-ink-2"
          >
            Ouvrir la prospection
          </Link>
        </Card>

        <Card>
          <div className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Ventilation fiscale du mois
          </div>
          <dl className="space-y-2 text-[13.5px]">
            <Row label="Base HT" value={data ? fmtFcfa(data.ventes.caMoisHt) : undefined} mono />
            <Row label="TVA collectée" value={data ? fmtFcfa(data.ventes.tvaMois) : undefined} mono />
            <Row label="Total TTC" value={data ? fmtFcfa(data.ventes.caMois) : undefined} mono />
          </dl>
          <p className="mt-3 text-[12px] leading-snug text-muted">
            Comptabilisation en écritures et balance âgée : phase 2.
          </p>
        </Card>
      </div>
    </ErpShell>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: number | string | undefined
  mono?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className={`text-ink ${mono ? 'font-mono tabular' : 'font-medium'}`}>
        {value === undefined ? '…' : typeof value === 'number' ? value.toLocaleString('fr-FR') : value}
      </dd>
    </div>
  )
}
