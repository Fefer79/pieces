'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const PRICE_PER_VEHICLE = {
  FREE: 0,
  PRO_FLOTTE: 5_000,
  PRO_FLOTTE_PLUS: 10_000,
} as const

type Tier = keyof typeof PRICE_PER_VEHICLE

function fmtFcfa(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M FCFA`
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

export default function CalculateurRoiPage() {
  const [vehicles, setVehicles] = useState(20)
  const [budget, setBudget] = useState(60_000_000) // 60 M F/an default
  const [savingRate, setSavingRate] = useState(0.20)
  const [tier, setTier] = useState<Tier>('PRO_FLOTTE')

  const result = useMemo(() => {
    const pricePerVeh = PRICE_PER_VEHICLE[tier]
    const monthlyCost = pricePerVeh * vehicles
    const annualCost = monthlyCost * 12
    const annualCostBilled = monthlyCost * 10 // si paiement annuel (2 mois offerts)
    const annualSaving = budget * savingRate
    const netMonthly = annualSaving / 12 - monthlyCost
    const netAnnual = annualSaving - annualCost
    const roiRatio = annualCost > 0 ? annualSaving / annualCost : Infinity
    const paybackDays = annualSaving > 0 ? (annualCost / annualSaving) * 365 : Infinity
    return { pricePerVeh, monthlyCost, annualCost, annualCostBilled, annualSaving, netMonthly, netAnnual, roiRatio, paybackDays }
  }, [vehicles, budget, savingRate, tier])

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 lg:px-8 lg:py-16">
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Calculateur ROI Flotte Pro
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Combien Pièces vous fait économiser ?
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Saisissez votre flotte et votre budget pièces annuel. Le calculateur applique le prix
          flat par véhicule de Flotte Pro ou Flotte Pro + et estime l&apos;économie projetée.
        </p>
      </header>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5 rounded-xl border border-border bg-card p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Vos paramètres</div>

          <Field label={`Nombre de véhicules : ${vehicles}`}>
            <input
              type="range"
              min={1}
              max={200}
              step={1}
              value={vehicles}
              onChange={(e) => setVehicles(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>1</span><span>50</span><span>100</span><span>200</span>
            </div>
          </Field>

          <Field label={`Budget pièces annuel : ${fmtFcfa(budget)}`}>
            <input
              type="range"
              min={1_000_000}
              max={500_000_000}
              step={1_000_000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>1 M</span><span>50 M</span><span>200 M</span><span>500 M</span>
            </div>
          </Field>

          <Field label={`Économie projetée : ${Math.round(savingRate * 100)} %`}>
            <input
              type="range"
              min={0.10}
              max={0.40}
              step={0.01}
              value={savingRate}
              onChange={(e) => setSavingRate(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>10 %</span><span>20 %</span><span>30 %</span><span>40 %</span>
            </div>
            <div className="mt-1 text-xs text-muted">
              Hypothèse typique : 20 à 30 % grâce au comparateur, scoring qualité, détection des
              véhicules « gouffres » et stock tampon auto.
            </div>
          </Field>

          <Field label="Tier">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTier('PRO_FLOTTE')}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  tier === 'PRO_FLOTTE'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-card text-ink hover:bg-surface'
                }`}
              >
                Flotte Pro · 5 000 F/véh
              </button>
              <button
                onClick={() => setTier('PRO_FLOTTE_PLUS')}
                className={`rounded-md border px-3 py-2 text-sm font-medium ${
                  tier === 'PRO_FLOTTE_PLUS'
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-card text-ink hover:bg-surface'
                }`}
              >
                Flotte Pro + · 10 000 F/véh
              </button>
            </div>
          </Field>
        </div>

        {/* Results */}
        <div className="space-y-4 rounded-xl border-2 border-accent bg-card p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Votre ROI</div>

          <div>
            <div className="font-display text-4xl text-ink">{fmtFcfa(result.netAnnual)}</div>
            <div className="text-sm text-muted">Économie nette par an, après abonnement</div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Stat label="Abonnement / mois" value={fmtFcfa(result.monthlyCost)} />
            <Stat label="Abonnement / an" value={fmtFcfa(result.annualCost)} />
            <Stat label="Économie pièces / an" value={fmtFcfa(result.annualSaving)} />
            <Stat
              label="Payback"
              value={
                Number.isFinite(result.paybackDays)
                  ? `${Math.round(result.paybackDays)} jours`
                  : '—'
              }
            />
          </div>

          {result.netAnnual > 0 ? (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
              Pour un ROI de <strong>×{Number.isFinite(result.roiRatio) ? result.roiRatio.toFixed(1) : '∞'}</strong>{' '}
              sur l&apos;abonnement, vous récupérez l&apos;équivalent de votre abonnement en{' '}
              {Math.round(result.paybackDays)} jours.
            </div>
          ) : (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              À ce budget et ce taux d&apos;économie, l&apos;abonnement n&apos;est pas rentable. Augmentez
              le taux d&apos;économie (le nôtre cible 20 % minimum) ou parlons-en directement.
            </div>
          )}

          <p className="text-xs text-muted">
            Payable annuellement avec 2 mois offerts : <strong>{fmtFcfa(result.annualCostBilled)}</strong> au lieu de{' '}
            {fmtFcfa(result.annualCost)}.
          </p>
        </div>
      </section>

      {/* Garantie ROI */}
      <section className="mt-12 rounded-xl border border-border bg-surface p-6">
        <h2 className="font-display text-2xl text-ink">Garantie ROI à 3 mois</h2>
        <p className="mt-2 text-sm text-muted">
          Si à 3 mois Flotte Pro ne vous a pas fait économiser au moins l&apos;équivalent de
          l&apos;abonnement, vous repassez en gratuit et nous remboursons la dernière mensualité.
          Vous prenez zéro risque pour tester.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Démarrer l&apos;essai 30 jours
          </Link>
          <Link
            href="/entreprises"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-card"
          >
            Voir les 3 tiers en détail
          </Link>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        Hypothèses : prix flat par véhicule selon le tier choisi (Flotte Pro 5 000 F/véh/mois, Flotte
        Pro + 10 000 F/véh/mois). Économie projetée appliquée sur le budget pièces annuel. Le
        payback annuel = 365 × abonnement annuel / économie annuelle. Paiement annuel = 10 mois
        facturés (2 mois offerts).
      </p>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-0.5 font-medium text-ink">{value}</div>
    </div>
  )
}
