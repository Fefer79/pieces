'use client'

import { useMemo, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler)

type TooltipCtx = { dataset: { label?: string }; parsed: { y: number } }

// ─────────────────────────────────────────────────────────────────────────────
// Constants — prix officiels Flotte Pro / Flotte Pro +
// ─────────────────────────────────────────────────────────────────────────────
const PRICE_PRO = 5_000
const PRICE_PRO_PLUS = 10_000

type Scenario = 'PESSIMIST' | 'BASE' | 'OPTIMIST'

const SCENARIO_MULT: Record<Scenario, { growth: number; adoption: number; gmv: number }> = {
  PESSIMIST: { growth: 0.5, adoption: 0.7, gmv: 0.7 },
  BASE:      { growth: 1.0, adoption: 1.0, gmv: 1.0 },
  OPTIMIST:  { growth: 1.4, adoption: 1.3, gmv: 1.4 },
}

interface Assumptions {
  horizonMonths: number
  startCash: number

  // Marché entreprises
  enterprises0: number
  avgVehiclesPerEnterprise: number
  monthlyEnterpriseGrowthPct: number
  monthlyChurnPct: number

  // Mix d'adoption (en % de la base totale d'entreprises)
  mixFreePct: number
  mixProPct: number
  mixProPlusPct: number

  // Paiement annuel (2 mois offerts)
  annualBillingSharePct: number

  // Marketplace
  gmv0: number
  monthlyGmvGrowthPct: number
  commissionPct: number

  // Logistique premium (Flotte Pro+)
  premiumRevenuePerPlusVehicle: number

  // Coûts
  fixedCostsMonth0: number
  monthlyFixedGrowthPct: number
  variableCostPctOfGmv: number
  cacPerEnterprise: number
  commsCostPerVehicle: number
}

const DEFAULTS: Assumptions = {
  horizonMonths: 24,
  startCash: 50_000_000,

  enterprises0: 5,
  avgVehiclesPerEnterprise: 15,
  monthlyEnterpriseGrowthPct: 12,
  monthlyChurnPct: 2,

  mixFreePct: 50,
  mixProPct: 35,
  mixProPlusPct: 15,

  annualBillingSharePct: 30,

  gmv0: 10_000_000,
  monthlyGmvGrowthPct: 8,
  commissionPct: 6,

  premiumRevenuePerPlusVehicle: 3_000,

  fixedCostsMonth0: 8_000_000,
  monthlyFixedGrowthPct: 3,
  variableCostPctOfGmv: 1.5,
  cacPerEnterprise: 75_000,
  commsCostPerVehicle: 250,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function fmtFcfa(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M F`
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toLocaleString('fr-FR', { maximumFractionDigits: 0 })} k F`
  return `${Math.round(n).toLocaleString('fr-FR')} F`
}
function fmtFcfaFull(n: number): string {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

interface MonthRow {
  month: number
  label: string
  enterprises: number
  vehicles: number
  vehiclesPro: number
  vehiclesPlus: number
  gmv: number
  commissions: number
  subscriptions: number
  premium: number
  revenue: number
  variableCosts: number
  cacCosts: number
  commsCosts: number
  fixedCosts: number
  totalCosts: number
  profit: number
  cumProfit: number
  cumCash: number
}

function project(a: Assumptions, scenario: Scenario): MonthRow[] {
  const mult = SCENARIO_MULT[scenario]
  const growth = (a.monthlyEnterpriseGrowthPct / 100) * mult.growth
  const churn = a.monthlyChurnPct / 100
  const netGrowth = growth - churn
  const gmvGrowth = (a.monthlyGmvGrowthPct / 100) * mult.gmv

  // Mix scénario : on majore Pro+ et Pro au détriment de Free dans l'optimiste.
  const adoptionShift = (mult.adoption - 1) * 0.4 // ±0–12 pts transférés
  let mixFree = Math.max(0, a.mixFreePct / 100 - adoptionShift)
  let mixPro = a.mixProPct / 100 + adoptionShift * 0.5
  let mixPlus = a.mixProPlusPct / 100 + adoptionShift * 0.5
  const total = mixFree + mixPro + mixPlus
  mixFree /= total; mixPro /= total; mixPlus /= total

  // Paiement annuel = 10 mois facturés sur 12 → coefficient sur l'abonnement.
  const annualShare = a.annualBillingSharePct / 100
  const subscriptionDiscount = 1 - annualShare * (2 / 12)

  const rows: MonthRow[] = []
  let enterprises = a.enterprises0
  let gmv = a.gmv0
  let cumProfit = 0
  let cumCash = a.startCash
  let prevEnterprises = enterprises

  for (let t = 0; t <= a.horizonMonths; t++) {
    if (t > 0) {
      prevEnterprises = enterprises
      enterprises = enterprises * (1 + netGrowth)
      gmv = gmv * (1 + gmvGrowth)
    }
    const vehicles = enterprises * a.avgVehiclesPerEnterprise
    const vehiclesPro = vehicles * mixPro
    const vehiclesPlus = vehicles * mixPlus

    const subsGross = vehiclesPro * PRICE_PRO + vehiclesPlus * PRICE_PRO_PLUS
    const subscriptions = subsGross * subscriptionDiscount

    const commissions = gmv * (a.commissionPct / 100)
    const premium = vehiclesPlus * a.premiumRevenuePerPlusVehicle
    const revenue = commissions + subscriptions + premium

    const variableCosts = gmv * (a.variableCostPctOfGmv / 100)
    const newEnterprises = Math.max(0, enterprises - prevEnterprises) + (t === 0 ? a.enterprises0 : 0)
    const cacCosts = newEnterprises * a.cacPerEnterprise
    const commsCosts = vehicles * a.commsCostPerVehicle
    const fixedCosts = a.fixedCostsMonth0 * Math.pow(1 + a.monthlyFixedGrowthPct / 100, t)
    const totalCosts = variableCosts + cacCosts + commsCosts + fixedCosts

    const profit = revenue - totalCosts
    cumProfit += profit
    cumCash += profit

    rows.push({
      month: t,
      label: `M${t}`,
      enterprises, vehicles, vehiclesPro, vehiclesPlus,
      gmv, commissions, subscriptions, premium, revenue,
      variableCosts, cacCosts, commsCosts, fixedCosts, totalCosts,
      profit, cumProfit, cumCash,
    })
  }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminFinancesPage() {
  const [a, setA] = useState<Assumptions>(DEFAULTS)
  const [scenario, setScenario] = useState<Scenario>('BASE')

  const rows = useMemo(() => project(a, scenario), [a, scenario])
  const lastRow = rows[rows.length - 1]!
  const mrrEnd = lastRow.subscriptions + lastRow.premium
  const arrEnd = mrrEnd * 12
  const totalRev = rows.slice(1).reduce((s, r) => s + r.revenue, 0)
  const totalCosts = rows.slice(1).reduce((s, r) => s + r.totalCosts, 0)
  const netResult = totalRev - totalCosts
  const profitBreakeven = rows.findIndex((r) => r.month > 0 && r.profit > 0)
  const cashBreakeven = rows.findIndex((r) => r.cumCash >= a.startCash)
  const minCash = Math.min(...rows.map((r) => r.cumCash))

  const mixSum = a.mixFreePct + a.mixProPct + a.mixProPlusPct
  const mixWarning = Math.abs(mixSum - 100) > 0.5

  function update<K extends keyof Assumptions>(key: K, value: Assumptions[K]) {
    setA((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="p-4 lg:p-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Modélisation financière</div>
          <h1 className="mt-1 font-display text-2xl text-ink">Projections Pièces — revenus, coûts, break-even</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Outil de modélisation interne basé sur des hypothèses paramétrables. Trois sources de revenus :
            commissions marketplace, abonnements Flotte Pro / Flotte Pro +, et logistique premium.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScenarioToggle value={scenario} onChange={setScenario} />
          <button
            onClick={() => setA(DEFAULTS)}
            className="rounded-sm border border-border-strong bg-card px-3 py-2 text-xs font-medium text-ink hover:bg-surface"
          >
            Réinitialiser
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={`MRR à M${a.horizonMonths}`} value={fmtFcfa(mrrEnd)} hint="Abonnements + premium" />
        <Kpi label="ARR projeté" value={fmtFcfa(arrEnd)} hint="MRR × 12" />
        <Kpi label="Résultat cumulé" value={fmtFcfa(netResult)} hint={`Sur ${a.horizonMonths} mois`} tone={netResult >= 0 ? 'pos' : 'neg'} />
        <Kpi
          label="Break-even profit"
          value={profitBreakeven > 0 ? `Mois ${profitBreakeven}` : '—'}
          hint="1ʳᵉ mensualité positive"
        />
        <Kpi label={`Entreprises à M${a.horizonMonths}`} value={Math.round(lastRow.enterprises).toLocaleString('fr-FR')} />
        <Kpi label={`Véhicules à M${a.horizonMonths}`} value={Math.round(lastRow.vehicles).toLocaleString('fr-FR')} />
        <Kpi label="Cash mini" value={fmtFcfa(minCash)} tone={minCash >= 0 ? 'pos' : 'neg'} hint="Plancher de trésorerie" />
        <Kpi
          label="Cash retour à zéro"
          value={cashBreakeven > 0 ? `Mois ${cashBreakeven}` : '—'}
          hint={`Cash initial : ${fmtFcfa(a.startCash)}`}
        />
      </div>

      {mixWarning && (
        <div className="mb-4 rounded-sm border border-warn-fg/20 bg-warn-bg px-3 py-2 text-sm text-warn-fg">
          Mix d&apos;adoption ne somme pas à 100 % (actuellement {mixSum.toFixed(0)} %). Les projections compensent automatiquement.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* INPUTS */}
        <aside className="space-y-5">
          <Group title="Marché entreprises">
            <NumField label="Entreprises au mois 0" value={a.enterprises0} onChange={(v) => update('enterprises0', v)} step={1} min={0} />
            <NumField label="Véhicules moyens / entreprise" value={a.avgVehiclesPerEnterprise} onChange={(v) => update('avgVehiclesPerEnterprise', v)} step={1} min={1} />
            <PctSlider label="Croissance mensuelle entreprises" value={a.monthlyEnterpriseGrowthPct} onChange={(v) => update('monthlyEnterpriseGrowthPct', v)} min={0} max={30} />
            <PctSlider label="Churn mensuel" value={a.monthlyChurnPct} onChange={(v) => update('monthlyChurnPct', v)} min={0} max={15} step={0.5} />
          </Group>

          <Group title="Mix d'adoption (% des entreprises)">
            <PctSlider label="Gratuit" value={a.mixFreePct} onChange={(v) => update('mixFreePct', v)} min={0} max={100} />
            <PctSlider label="Flotte Pro · 5 000 F/véh" value={a.mixProPct} onChange={(v) => update('mixProPct', v)} min={0} max={100} />
            <PctSlider label="Flotte Pro + · 10 000 F/véh" value={a.mixProPlusPct} onChange={(v) => update('mixProPlusPct', v)} min={0} max={100} />
            <PctSlider label="% payant à l'année (2 mois offerts)" value={a.annualBillingSharePct} onChange={(v) => update('annualBillingSharePct', v)} min={0} max={100} />
          </Group>

          <Group title="Marketplace">
            <NumField label="GMV au mois 0 (FCFA)" value={a.gmv0} onChange={(v) => update('gmv0', v)} step={1_000_000} min={0} format="fcfa" />
            <PctSlider label="Croissance GMV mensuelle" value={a.monthlyGmvGrowthPct} onChange={(v) => update('monthlyGmvGrowthPct', v)} min={0} max={30} />
            <PctSlider label="Taux de commission" value={a.commissionPct} onChange={(v) => update('commissionPct', v)} min={0} max={20} step={0.5} />
            <NumField label="Revenu premium / véhicule Pro+ (FCFA/mois)" value={a.premiumRevenuePerPlusVehicle} onChange={(v) => update('premiumRevenuePerPlusVehicle', v)} step={500} min={0} format="fcfa" />
          </Group>

          <Group title="Coûts">
            <NumField label="Coûts fixes mois 0 (FCFA)" value={a.fixedCostsMonth0} onChange={(v) => update('fixedCostsMonth0', v)} step={500_000} min={0} format="fcfa" />
            <PctSlider label="Croissance mensuelle coûts fixes" value={a.monthlyFixedGrowthPct} onChange={(v) => update('monthlyFixedGrowthPct', v)} min={0} max={15} step={0.5} />
            <PctSlider label="Coût variable (% du GMV)" value={a.variableCostPctOfGmv} onChange={(v) => update('variableCostPctOfGmv', v)} min={0} max={10} step={0.1} />
            <NumField label="CAC / nouvelle entreprise (FCFA)" value={a.cacPerEnterprise} onChange={(v) => update('cacPerEnterprise', v)} step={5_000} min={0} format="fcfa" />
            <NumField label="Coût comms / véhicule / mois (FCFA)" value={a.commsCostPerVehicle} onChange={(v) => update('commsCostPerVehicle', v)} step={50} min={0} format="fcfa" />
          </Group>

          <Group title="Horizon & trésorerie">
            <SelectField
              label="Horizon de projection"
              value={a.horizonMonths}
              onChange={(v) => update('horizonMonths', v)}
              options={[{ value: 12, label: '12 mois' }, { value: 24, label: '24 mois' }, { value: 36, label: '36 mois' }, { value: 60, label: '60 mois' }]}
            />
            <NumField label="Cash initial (FCFA)" value={a.startCash} onChange={(v) => update('startCash', v)} step={5_000_000} min={0} format="fcfa" />
          </Group>
        </aside>

        {/* OUTPUTS */}
        <div className="space-y-5">
          {/* Revenu mensuel par source */}
          <ChartCard title="Revenus mensuels par source">
            <Bar
              data={{
                labels: rows.map((r) => r.label),
                datasets: [
                  { label: 'Commissions marketplace', data: rows.map((r) => r.commissions), backgroundColor: '#002366', stack: 'rev' },
                  { label: 'Abonnements Flotte', data: rows.map((r) => r.subscriptions), backgroundColor: '#FF6B00', stack: 'rev' },
                  { label: 'Logistique premium', data: rows.map((r) => r.premium), backgroundColor: '#1E6F4C', stack: 'rev' },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' as const }, tooltip: { callbacks: { label: (c: TooltipCtx) => `${c.dataset.label}: ${fmtFcfaFull(c.parsed.y)}` } } },
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { callback: (v: string | number) => fmtFcfa(Number(v)) } } },
              }}
            />
          </ChartCard>

          {/* P&L mensuel */}
          <ChartCard title="P&amp;L mensuel — revenu vs coûts">
            <Line
              data={{
                labels: rows.map((r) => r.label),
                datasets: [
                  { label: 'Revenu total', data: rows.map((r) => r.revenue), borderColor: '#002366', backgroundColor: 'rgba(0,35,102,0.08)', fill: true, tension: 0.25 },
                  { label: 'Coûts totaux', data: rows.map((r) => r.totalCosts), borderColor: '#B42318', backgroundColor: 'rgba(180,35,24,0.06)', fill: true, tension: 0.25 },
                  { label: 'Profit', data: rows.map((r) => r.profit), borderColor: '#1E6F4C', backgroundColor: 'rgba(30,111,76,0)', fill: false, tension: 0.25, borderDash: [4, 4] },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' as const }, tooltip: { callbacks: { label: (c: TooltipCtx) => `${c.dataset.label}: ${fmtFcfaFull(c.parsed.y)}` } } },
                scales: { y: { ticks: { callback: (v: string | number) => fmtFcfa(Number(v)) } } },
              }}
            />
          </ChartCard>

          {/* Trésorerie */}
          <ChartCard title="Position de trésorerie cumulée">
            <Line
              data={{
                labels: rows.map((r) => r.label),
                datasets: [
                  { label: 'Trésorerie', data: rows.map((r) => r.cumCash), borderColor: '#FF6B00', backgroundColor: 'rgba(255,107,0,0.12)', fill: true, tension: 0.25 },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: TooltipCtx) => fmtFcfaFull(c.parsed.y) } } },
                scales: { y: { ticks: { callback: (v: string | number) => fmtFcfa(Number(v)) } } },
              }}
            />
          </ChartCard>

          {/* Table P&L détaillée */}
          <div className="rounded-md border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">P&amp;L mensuel détaillé</div>
              <button
                onClick={() => exportCsv(rows)}
                className="rounded-sm border border-border-strong bg-card px-3 py-1 text-xs font-medium text-ink hover:bg-surface"
              >
                Export CSV
              </button>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface">
                  <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                    <th className="px-3 py-2">Mois</th>
                    <th className="px-3 py-2 text-right">Entr.</th>
                    <th className="px-3 py-2 text-right">Véh.</th>
                    <th className="px-3 py-2 text-right">GMV</th>
                    <th className="px-3 py-2 text-right">Comm.</th>
                    <th className="px-3 py-2 text-right">Abos</th>
                    <th className="px-3 py-2 text-right">Premium</th>
                    <th className="px-3 py-2 text-right">Revenu</th>
                    <th className="px-3 py-2 text-right">Coûts</th>
                    <th className="px-3 py-2 text-right">Profit</th>
                    <th className="px-3 py-2 text-right">Cash</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums">
                  {rows.map((r) => (
                    <tr key={r.month} className="border-t border-border">
                      <td className="px-3 py-1.5 text-ink">{r.label}</td>
                      <td className="px-3 py-1.5 text-right">{Math.round(r.enterprises).toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-1.5 text-right">{Math.round(r.vehicles).toLocaleString('fr-FR')}</td>
                      <td className="px-3 py-1.5 text-right">{fmtFcfa(r.gmv)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtFcfa(r.commissions)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtFcfa(r.subscriptions)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtFcfa(r.premium)}</td>
                      <td className="px-3 py-1.5 text-right text-ink">{fmtFcfa(r.revenue)}</td>
                      <td className="px-3 py-1.5 text-right">{fmtFcfa(r.totalCosts)}</td>
                      <td className={`px-3 py-1.5 text-right ${r.profit >= 0 ? 'text-success-fg' : 'text-error-fg'}`}>{fmtFcfa(r.profit)}</td>
                      <td className={`px-3 py-1.5 text-right ${r.cumCash >= 0 ? 'text-ink' : 'text-error-fg'}`}>{fmtFcfa(r.cumCash)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted">
            Hypothèses : prix Flotte Pro 5 000 F/véh/mois, Flotte Pro + 10 000 F/véh/mois. Paiement annuel
            applique un rabais de 2 mois sur 12 (~16,7 %) au prorata de la part annuelle. Le scénario
            multiplie la croissance entreprises ({SCENARIO_MULT[scenario].growth}×), la croissance GMV
            ({SCENARIO_MULT[scenario].gmv}×) et décale le mix d&apos;adoption vers les tiers payants
            (×{SCENARIO_MULT[scenario].adoption}).
          </p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// UI building blocks
// ─────────────────────────────────────────────────────────────────────────────
function Kpi({ label, value, hint, tone }: { label: string; value: string | number; hint?: string; tone?: 'pos' | 'neg' }) {
  const toneCls = tone === 'pos' ? 'text-success-fg' : tone === 'neg' ? 'text-error-fg' : 'text-ink'
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={`mt-1 font-mono tabular-nums text-xl font-semibold ${toneCls}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

function ScenarioToggle({ value, onChange }: { value: Scenario; onChange: (s: Scenario) => void }) {
  const opts: { key: Scenario; label: string }[] = [
    { key: 'PESSIMIST', label: 'Pessimiste' },
    { key: 'BASE',      label: 'Base' },
    { key: 'OPTIMIST',  label: 'Optimiste' },
  ]
  return (
    <div className="flex overflow-hidden rounded-sm border border-border-strong">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-2 text-xs font-medium ${value === o.key ? 'bg-ink-2 text-white' : 'bg-card text-ink hover:bg-surface'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{title}</div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function NumField({
  label, value, onChange, step = 1, min, max, format,
}: {
  label: string; value: number; onChange: (v: number) => void
  step?: number; min?: number; max?: number; format?: 'fcfa'
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 font-mono tabular-nums text-sm text-ink"
      />
      {format === 'fcfa' && <span className="mt-0.5 block text-[10px] text-muted">{fmtFcfa(value)}</span>}
    </label>
  )
}

function PctSlider({
  label, value, onChange, min = 0, max = 100, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium text-ink">{label}</span>
        <span className="font-mono text-xs tabular-nums text-ink-2">{value.toFixed(step < 1 ? 1 : 0)} %</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
      />
    </label>
  )
}

function SelectField<T extends string | number>({
  label, value, onChange, options,
}: {
  label: string; value: T; onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => {
          const v = (typeof value === 'number' ? Number(e.target.value) : e.target.value) as T
          onChange(v)
        }}
        className="w-full rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-sm text-ink"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{title}</div>
      {children}
    </div>
  )
}

function exportCsv(rows: MonthRow[]) {
  const header = ['Mois', 'Entreprises', 'Vehicules', 'Vehicules_Pro', 'Vehicules_Pro_Plus', 'GMV', 'Commissions', 'Abonnements', 'Premium', 'Revenu_total', 'Couts_variables', 'CAC', 'Comms', 'Couts_fixes', 'Couts_totaux', 'Profit', 'Profit_cumule', 'Tresorerie']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r.month, Math.round(r.enterprises), Math.round(r.vehicles), Math.round(r.vehiclesPro), Math.round(r.vehiclesPlus),
      Math.round(r.gmv), Math.round(r.commissions), Math.round(r.subscriptions), Math.round(r.premium), Math.round(r.revenue),
      Math.round(r.variableCosts), Math.round(r.cacCosts), Math.round(r.commsCosts), Math.round(r.fixedCosts), Math.round(r.totalCosts),
      Math.round(r.profit), Math.round(r.cumProfit), Math.round(r.cumCash),
    ].join(','))
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `modelisation-pieces-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
