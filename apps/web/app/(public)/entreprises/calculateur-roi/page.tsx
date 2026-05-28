'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const PRICE_PER_VEHICLE = {
  PRO_FLOTTE: 5_000,
  PRO_FLOTTE_PLUS: 10_000,
} as const

type Tier = keyof typeof PRICE_PER_VEHICLE

// Référence pour la suggestion "Estimer pour VTC"
const VTC_BUDGET_PER_VEHICLE = 1_000_000 // FCFA / véhicule / an

function fmtFcfa(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M FCFA`
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

const TIER_BENEFITS: Record<Tier, string[]> = {
  PRO_FLOTTE: [
    'Détection des véhicules « gouffres »',
    'Stock tampon auto sur SKU critiques',
    'Factures normalisées DGI + export FEC',
    'Support prioritaire < 4 h ouvrées',
  ],
  PRO_FLOTTE_PLUS: [
    'Tout Flotte Pro inclus',
    'Livraison 3 h chrono Abidjan + SLA',
    'Livraison J+1 garantie hors Abidjan',
    'Pickup prioritaire, WhatsApp dédiée 6 h–22 h',
    'Concierge dépannage : un appel, c\'est réglé',
  ],
}

interface TierResult {
  annualCost: number
  annualCostBilledAnnual: number
  partsSaving: number
  downtimeSaving: number
  grossSaving: number
  netAnnual: number
}

function computeTier(
  tier: Tier,
  vehicles: number,
  budget: number,
  savingRate: number,
  downtimeDays: number,
  revenuePerOffRoadDay: number,
): TierResult {
  const pricePerVeh = PRICE_PER_VEHICLE[tier]
  const annualCost = pricePerVeh * vehicles * 12
  const annualCostBilledAnnual = pricePerVeh * vehicles * 10 // 2 mois offerts

  const partsSaving = budget * savingRate
  // Le downtime ne s'applique qu'à Pro+ (3 h chrono / J+1 / concierge)
  const downtimeSaving = tier === 'PRO_FLOTTE_PLUS' ? vehicles * downtimeDays * revenuePerOffRoadDay : 0
  const grossSaving = partsSaving + downtimeSaving
  const netAnnual = grossSaving - annualCost

  return { annualCost, annualCostBilledAnnual, partsSaving, downtimeSaving, grossSaving, netAnnual }
}

export default function CalculateurRoiPage() {
  const [vehicles, setVehicles] = useState(20)
  const [budget, setBudget] = useState(20_000_000)
  const [savingRate, setSavingRate] = useState(0.20)
  const [downtimeDays, setDowntimeDays] = useState(4)
  const [revenuePerOffRoadDay, setRevenuePerOffRoadDay] = useState(25_000)

  const pro = useMemo(
    () => computeTier('PRO_FLOTTE', vehicles, budget, savingRate, downtimeDays, revenuePerOffRoadDay),
    [vehicles, budget, savingRate, downtimeDays, revenuePerOffRoadDay],
  )
  const plus = useMemo(
    () => computeTier('PRO_FLOTTE_PLUS', vehicles, budget, savingRate, downtimeDays, revenuePerOffRoadDay),
    [vehicles, budget, savingRate, downtimeDays, revenuePerOffRoadDay],
  )

  const winner: Tier = plus.netAnnual > pro.netAnnual ? 'PRO_FLOTTE_PLUS' : 'PRO_FLOTTE'
  const diff = Math.abs(plus.netAnnual - pro.netAnnual)

  function estimateBudgetForVtc() {
    setBudget(Math.max(1, vehicles) * VTC_BUDGET_PER_VEHICLE)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-16">
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Calculateur ROI Flotte Pro
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Flotte Pro ou Flotte Pro + : lequel vous rapporte le plus ?
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Renseignez votre flotte et vos hypothèses. Le calculateur compare les deux abonnements
          et désigne celui qui vous rapporte le plus net après abonnement.
        </p>
      </header>

      {/* Inputs */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Vos paramètres</div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <Field label="Nombre de véhicules">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={vehicles}
              onChange={(e) => setVehicles(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-md border border-border-strong bg-card px-3 py-2 font-mono tabular-nums text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              placeholder="Ex. 20"
            />
            <Hint>Saisissez le nombre exact de véhicules dans votre flotte.</Hint>
          </Field>

          <Field label="Budget pièces annuel (FCFA)">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={100_000}
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-md border border-border-strong bg-card px-3 py-2 font-mono tabular-nums text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                placeholder="Ex. 20000000"
              />
              <button
                type="button"
                onClick={estimateBudgetForVtc}
                className="shrink-0 whitespace-nowrap rounded-md border border-border-strong bg-surface px-3 py-2 text-xs font-medium text-ink hover:bg-card"
                title={`${VTC_BUDGET_PER_VEHICLE.toLocaleString('fr-FR')} F × véhicules`}
              >
                Estimer pour VTC
              </button>
            </div>
            <Hint>
              {budget > 0 ? `Soit ${fmtFcfa(budget)}. ` : ''}
              Pas sûr ? Pour un VTC en Côte d&apos;Ivoire, comptez en moyenne{' '}
              <strong>1 M F / véhicule / an</strong>. Cliquez sur « Estimer pour VTC ».
            </Hint>
          </Field>

          <Field label={`Économie projetée sur les pièces : ${Math.round(savingRate * 100)} %`}>
            <input
              type="range" min={0.10} max={0.40} step={0.01} value={savingRate}
              onChange={(e) => setSavingRate(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['10 %', '20 %', '30 %', '40 %']} />
            <Hint>
              Hypothèse typique : 20 à 30 % grâce au comparateur, scoring qualité, détection des
              véhicules « gouffres » et stock tampon. S&apos;applique aux deux tiers.
            </Hint>
          </Field>

          <Field label={`Jours d'immobilisation par manque de pièces : ${downtimeDays} jour${downtimeDays > 1 ? 's' : ''} / véhicule / an`}>
            <input
              type="range" min={0} max={10} step={1} value={downtimeDays}
              onChange={(e) => setDowntimeDays(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['0', '3', '6', '10']} />
            <Hint>
              Moyenne observée chez les flottes ivoiriennes : <strong>3 à 5 jours / véhicule / an</strong>.
              VTC fortement sollicités ou flottes BTP : jusqu&apos;à 8 jours. Flotte Pro + supprime ces
              jours grâce à la 3 h chrono Abidjan / J+1 garantie / concierge.
            </Hint>
          </Field>

          <Field label={`Manque à gagner / véhicule immobilisé / jour : ${fmtFcfa(revenuePerOffRoadDay)}`}>
            <input
              type="range" min={5_000} max={200_000} step={5_000} value={revenuePerOffRoadDay}
              onChange={(e) => setRevenuePerOffRoadDay(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['5 k', '50 k', '100 k', '200 k']} />
            <Hint>
              Revenu / marge perdu(e) chaque jour qu&apos;un véhicule est cloué. VTC : 20–30 k.
              Camion BTP : 80–150 k. Bus interurbain : 100–200 k.
            </Hint>
          </Field>

          <div className="self-end rounded-md border border-border bg-surface px-4 py-3 text-xs text-muted">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink">
              Garantie ROI à 3 mois
            </div>
            <p className="mt-1 leading-relaxed">
              Si Flotte Pro ne rembourse pas l&apos;abonnement à 3 mois, vous repassez en gratuit et
              nous remboursons la dernière mensualité. Zéro risque pour tester.
            </p>
          </div>
        </div>
      </section>

      {/* Winner banner */}
      <section className="mt-8 rounded-xl border-2 border-accent bg-accent/5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              Recommandation
            </div>
            <h2 className="mt-1 font-display text-2xl text-ink">
              {winner === 'PRO_FLOTTE_PLUS'
                ? `Flotte Pro + vous rapporte ${fmtFcfa(diff)} de plus / an.`
                : diff < 1
                  ? 'Flotte Pro et Flotte Pro + se valent sur ces hypothèses.'
                  : `Flotte Pro reste le plus rentable : ${fmtFcfa(diff)} de plus / an.`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {winner === 'PRO_FLOTTE_PLUS'
                ? 'La couche urgence (3 h chrono, J+1, concierge) couvre largement l\'écart de prix.'
                : 'À ce niveau d\'usage, la couche urgence Pro + ne se justifie pas encore. Démarrez en Flotte Pro.'}
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Démarrer l&apos;essai 30 jours
          </Link>
        </div>
      </section>

      {/* Side-by-side cards */}
      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <TierCard
          tier="PRO_FLOTTE"
          label="Flotte Pro"
          tagline="Pilotez votre flotte."
          result={pro}
          highlighted={winner === 'PRO_FLOTTE'}
        />
        <TierCard
          tier="PRO_FLOTTE_PLUS"
          label="Flotte Pro +"
          tagline="Ne perdez plus une journée."
          result={plus}
          highlighted={winner === 'PRO_FLOTTE_PLUS'}
        />
      </section>

      {/* Qualitative benefits beyond the numbers */}
      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <BenefitCard title="Au-delà du chiffrage — Flotte Pro" benefits={TIER_BENEFITS.PRO_FLOTTE} />
        <BenefitCard
          title="Au-delà du chiffrage — Flotte Pro +"
          benefits={TIER_BENEFITS.PRO_FLOTTE_PLUS}
          accent
        />
      </section>

      <p className="mt-10 text-xs text-muted">
        Hypothèses : abonnement Flotte Pro 5 000 F/véh/mois, Flotte Pro + 10 000 F/véh/mois.
        Économie pièces appliquée au budget pièces annuel (s&apos;applique aux deux tiers).
        Économie downtime = véhicules × jours d&apos;immobilisation × manque à gagner / jour,
        comptée uniquement pour Flotte Pro + (3 h chrono Abidjan, J+1 hors Abidjan, concierge).
        Paiement annuel = 10 mois facturés (2 mois offerts).
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}

function Scale({ labels }: { labels: string[] }) {
  return (
    <div className="mt-1 flex justify-between text-xs text-muted">
      {labels.map((l) => <span key={l}>{l}</span>)}
    </div>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="mt-1 text-xs text-muted">{children}</div>
}

function TierCard({
  tier, label, tagline, result, highlighted,
}: {
  tier: Tier; label: string; tagline: string; result: TierResult; highlighted: boolean
}) {
  const price = PRICE_PER_VEHICLE[tier]
  return (
    <div className={highlighted ? 'rounded-xl border-2 border-accent bg-card p-6 shadow-sm' : 'rounded-xl border border-border bg-card p-6'}>
      {highlighted && (
        <div className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent">
          Recommandé pour vous
        </div>
      )}
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 font-display text-2xl text-ink">{tagline}</div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-3xl text-ink">{price.toLocaleString('fr-FR')} F</span>
        <span className="text-sm text-muted">/ véh / mois</span>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="font-display text-3xl text-ink">{fmtFcfa(result.netAnnual)}</div>
        <div className="text-sm text-muted">Gain net annuel estimé après abonnement</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Abonnement / an" value={fmtFcfa(result.annualCost)} />
        <Stat label="Économies / an" value={fmtFcfa(result.grossSaving)} />
      </div>

      {result.downtimeSaving > 0 && (
        <div className="mt-4 rounded-md border border-success-fg/20 bg-success-bg px-3 py-2 text-xs text-success-fg">
          <strong>+ {fmtFcfa(result.downtimeSaving)}/an</strong> grâce à la couche urgence (3 h chrono, J+1 garantie).
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Paiement annuel : <strong className="font-mono tabular-nums">{fmtFcfa(result.annualCostBilledAnnual)}</strong>{' '}
        au lieu de {fmtFcfa(result.annualCost)} (2 mois offerts).
      </p>

      <Link
        href="/login"
        className={
          highlighted
            ? 'mt-5 block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover'
            : 'mt-5 block rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface'
        }
      >
        Choisir {label}
      </Link>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-0.5 font-mono tabular-nums text-sm font-medium text-ink">{value}</div>
    </div>
  )
}

function BenefitCard({ title, benefits, accent }: { title: string; benefits: string[]; accent?: boolean }) {
  return (
    <div className={accent ? 'rounded-xl border-2 border-accent/30 bg-card p-6' : 'rounded-xl border border-border bg-card p-6'}>
      <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{title}</div>
      <ul className="mt-4 space-y-2.5 text-sm text-ink">
        {benefits.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 text-accent">✓</span>
            <span className="leading-snug">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
