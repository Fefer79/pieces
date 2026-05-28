'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

const PRICE_PER_VEHICLE = {
  PRO_FLOTTE: 5_000,
  PRO_FLOTTE_PLUS: 10_000,
} as const

type Tier = keyof typeof PRICE_PER_VEHICLE

function fmtFcfa(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M FCFA`
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`
}

// Bénéfices qualitatifs propres à chaque tier — montrés sur les cartes
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
  monthlyCost: number
  annualCost: number
  annualCostBilledAnnual: number
  partsSaving: number
  downtimeSaving: number
  grossSaving: number
  netAnnual: number
  netMonthly: number
  roiRatio: number
  paybackDays: number
}

function computeTier(
  tier: Tier,
  vehicles: number,
  budget: number,
  savingRate: number,
  downtimeDaysSaved: number,
  revenuePerOffRoadDay: number,
): TierResult {
  const pricePerVeh = PRICE_PER_VEHICLE[tier]
  const monthlyCost = pricePerVeh * vehicles
  const annualCost = monthlyCost * 12
  const annualCostBilledAnnual = monthlyCost * 10 // 2 mois offerts en paiement annuel

  const partsSaving = budget * savingRate
  // Le downtime ne s'applique qu'à Pro+ (3 h chrono / J+1 / concierge)
  const downtimeSaving = tier === 'PRO_FLOTTE_PLUS' ? vehicles * downtimeDaysSaved * revenuePerOffRoadDay : 0
  const grossSaving = partsSaving + downtimeSaving
  const netAnnual = grossSaving - annualCost
  const netMonthly = grossSaving / 12 - monthlyCost
  const roiRatio = annualCost > 0 ? grossSaving / annualCost : Infinity
  const paybackDays = grossSaving > 0 ? (annualCost / grossSaving) * 365 : Infinity

  return { monthlyCost, annualCost, annualCostBilledAnnual, partsSaving, downtimeSaving, grossSaving, netAnnual, netMonthly, roiRatio, paybackDays }
}

export default function CalculateurRoiPage() {
  const [vehicles, setVehicles] = useState(20)
  const [budget, setBudget] = useState(60_000_000)
  const [savingRate, setSavingRate] = useState(0.20)
  const [downtimeDaysSaved, setDowntimeDaysSaved] = useState(2)
  const [revenuePerOffRoadDay, setRevenuePerOffRoadDay] = useState(25_000)

  const pro = useMemo(
    () => computeTier('PRO_FLOTTE', vehicles, budget, savingRate, downtimeDaysSaved, revenuePerOffRoadDay),
    [vehicles, budget, savingRate, downtimeDaysSaved, revenuePerOffRoadDay],
  )
  const plus = useMemo(
    () => computeTier('PRO_FLOTTE_PLUS', vehicles, budget, savingRate, downtimeDaysSaved, revenuePerOffRoadDay),
    [vehicles, budget, savingRate, downtimeDaysSaved, revenuePerOffRoadDay],
  )

  const winner: Tier = plus.netAnnual > pro.netAnnual ? 'PRO_FLOTTE_PLUS' : 'PRO_FLOTTE'
  const diff = Math.abs(plus.netAnnual - pro.netAnnual)

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-16">
      <header className="border-b border-border pb-8">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
          Calculateur ROI Flotte Pro
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Flotte Pro ou Flotte Pro + : lequel rapporte le plus à votre flotte ?
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Saisissez votre flotte, votre budget et le coût d&apos;un véhicule immobilisé.
          Le calculateur compare côte-à-côte les deux abonnements et désigne le plus rentable.
        </p>
      </header>

      {/* Inputs */}
      <section className="mt-10 rounded-xl border border-border bg-card p-6">
        <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Vos paramètres</div>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <Field label={`Nombre de véhicules : ${vehicles}`}>
            <input
              type="range" min={1} max={200} step={1} value={vehicles}
              onChange={(e) => setVehicles(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['1', '50', '100', '200']} />
          </Field>

          <Field label={`Budget pièces annuel : ${fmtFcfa(budget)}`}>
            <input
              type="range" min={1_000_000} max={500_000_000} step={1_000_000} value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['1 M', '50 M', '200 M', '500 M']} />
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

          <Field label={`Jours d'immobilisation évités par véhicule / an : ${downtimeDaysSaved}`}>
            <input
              type="range" min={0} max={10} step={1} value={downtimeDaysSaved}
              onChange={(e) => setDowntimeDaysSaved(Number(e.target.value))}
              className="w-full accent-[var(--color-accent)]"
            />
            <Scale labels={['0', '3', '6', '10']} />
            <Hint>
              Combien de jours par véhicule la livraison 3 h chrono / J+1 garantie / concierge vous
              fait gagner par an. <strong>Pro + uniquement.</strong>
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
                ? `Flotte Pro + dégage ${fmtFcfa(diff)} de plus / an pour votre flotte.`
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

      {/* Detailed comparison table */}
      <section className="mt-10">
        <h2 className="font-display text-2xl text-ink">Comparaison détaillée</h2>
        <p className="mt-1 text-sm text-muted">Tous les chiffres sont annuels sauf indication.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Poste
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink">
                  Flotte Pro
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink">
                  Flotte Pro +
                </th>
                <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Écart
                </th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              <Row label="Prix / véhicule / mois" pro="5 000 F" plus="10 000 F" diff="+ 5 000 F" />
              <Row label="Abonnement mensuel" pro={fmtFcfa(pro.monthlyCost)} plus={fmtFcfa(plus.monthlyCost)} diff={fmtFcfa(plus.monthlyCost - pro.monthlyCost)} />
              <Row label="Abonnement annuel (mensuel)" pro={fmtFcfa(pro.annualCost)} plus={fmtFcfa(plus.annualCost)} diff={fmtFcfa(plus.annualCost - pro.annualCost)} />
              <Row label="Abonnement annuel (paiement annuel, −2 mois)" pro={fmtFcfa(pro.annualCostBilledAnnual)} plus={fmtFcfa(plus.annualCostBilledAnnual)} diff={fmtFcfa(plus.annualCostBilledAnnual - pro.annualCostBilledAnnual)} />
              <SectionRow label="Économies projetées / an" />
              <Row label="• Économie pièces" pro={fmtFcfa(pro.partsSaving)} plus={fmtFcfa(plus.partsSaving)} diff="—" />
              <Row label="• Économie downtime (3 h chrono / J+1)" pro="—" plus={fmtFcfa(plus.downtimeSaving)} diff={fmtFcfa(plus.downtimeSaving)} highlight={plus.downtimeSaving > 0} />
              <Row label="Total économies brutes" pro={fmtFcfa(pro.grossSaving)} plus={fmtFcfa(plus.grossSaving)} diff={fmtFcfa(plus.grossSaving - pro.grossSaving)} />
              <SectionRow label="Résultat" />
              <Row label="Net annuel après abonnement" pro={fmtFcfa(pro.netAnnual)} plus={fmtFcfa(plus.netAnnual)} diff={fmtFcfa(plus.netAnnual - pro.netAnnual)} bold tone={plus.netAnnual - pro.netAnnual >= 0 ? 'pos' : 'neg'} />
              <Row label="Net mensuel" pro={fmtFcfa(pro.netMonthly)} plus={fmtFcfa(plus.netMonthly)} diff={fmtFcfa(plus.netMonthly - pro.netMonthly)} />
              <Row label="ROI sur l'abonnement" pro={Number.isFinite(pro.roiRatio) ? `×${pro.roiRatio.toFixed(1)}` : '∞'} plus={Number.isFinite(plus.roiRatio) ? `×${plus.roiRatio.toFixed(1)}` : '∞'} diff="—" />
              <Row label="Payback (jours)" pro={Number.isFinite(pro.paybackDays) ? `${Math.round(pro.paybackDays)} j` : '—'} plus={Number.isFinite(plus.paybackDays) ? `${Math.round(plus.paybackDays)} j` : '—'} diff="—" />
            </tbody>
          </table>
        </div>
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
        Économie downtime = véhicules × jours évités/an × manque à gagner/jour, comptée
        uniquement pour Flotte Pro + (3 h chrono Abidjan, J+1 hors Abidjan, concierge).
        Payback = 365 × abonnement annuel / économie annuelle brute.
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
        <div className="text-sm text-muted">Net annuel, après abonnement</div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Stat label="Abonnement / an" value={fmtFcfa(result.annualCost)} />
        <Stat label="Économies / an" value={fmtFcfa(result.grossSaving)} />
        <Stat label="ROI" value={Number.isFinite(result.roiRatio) ? `× ${result.roiRatio.toFixed(1)}` : '∞'} />
        <Stat label="Payback" value={Number.isFinite(result.paybackDays) ? `${Math.round(result.paybackDays)} jours` : '—'} />
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

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="bg-surface/50">
      <td colSpan={4} className="px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
        {label}
      </td>
    </tr>
  )
}

function Row({
  label, pro, plus, diff, bold, highlight, tone,
}: {
  label: string; pro: string; plus: string; diff: string
  bold?: boolean; highlight?: boolean; tone?: 'pos' | 'neg'
}) {
  const toneCls = tone === 'pos' ? 'text-success-fg' : tone === 'neg' ? 'text-error-fg' : 'text-ink'
  const rowCls = highlight ? 'border-t border-border bg-accent/5' : 'border-t border-border'
  return (
    <tr className={rowCls}>
      <td className={`px-4 py-2.5 ${bold ? 'font-semibold text-ink' : 'font-sans text-ink'}`}>{label}</td>
      <td className={`px-4 py-2.5 text-right ${bold ? 'font-semibold ' + toneCls : 'text-ink'}`}>{pro}</td>
      <td className={`px-4 py-2.5 text-right ${bold ? 'font-semibold ' + toneCls : 'text-ink'}`}>{plus}</td>
      <td className={`px-4 py-2.5 text-right ${bold ? 'font-semibold ' + toneCls : 'text-muted'}`}>{diff}</td>
    </tr>
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
