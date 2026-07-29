'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  DOWNTIME_COST_PER_DAY,
  ANNUAL_PARTS_SPEND,
  type VehicleEconomyCategory,
} from 'shared/constants'
import { VEHICLE_CATEGORY_COPY } from '@/lib/logistique-content'

const fmt = (n: number) => n.toLocaleString('fr-FR')

const CATEGORIES: VehicleEconomyCategory[] = ['ECONOMY_ICE', 'PREMIUM_ICE', 'PREMIUM_EV']

// Mappe la catégorie sur la classe de pièce qui l'emporte dans l'arbitrage
// côtier (l'aérien 3-7 j reste rentable sur l'Économique tant que la pièce
// est peu chère — au-delà, le maritime 45 j ne tient plus).
function recommendedCategoryFor(category: VehicleEconomyCategory) {
  if (category === 'PREMIUM_EV') return 'PREMIUM_EV' as const
  return 'PREMIUM_ICE' as const
}

export function Calculateur() {
  const [category, setCategory] = useState<VehicleEconomyCategory>('PREMIUM_ICE')
  const [dailyOverride, setDailyOverride] = useState<number>(DOWNTIME_COST_PER_DAY.PREMIUM_ICE)
  const [useOverride, setUseOverride] = useState(false)
  const [days, setDays] = useState(5)
  const [partPrice, setPartPrice] = useState(45_000)

  const daily = useOverride ? dailyOverride : DOWNTIME_COST_PER_DAY[category]
  const downtime = daily * days
  const annual = ANNUAL_PARTS_SPEND[recommendedCategoryFor(category)]
  const downtimeShare = annual > 0 ? Math.round((downtime / annual) * 100) : 0

  const devisHref = useMemo(() => {
    const params = new URLSearchParams({ cat: category, jours: String(days) })
    if (useOverride) params.set('daily', String(daily))
    if (partPrice) params.set('prix', String(partPrice))
    return `/logistique/devis?${params.toString()}`
  }, [category, days, daily, partPrice, useOverride])

  return (
    <>
      <div className="mt-8 grid gap-6 rounded-md border border-border bg-card p-6 lg:p-7">
        <Field label="Catégorie de véhicule">
          <div className="grid gap-2 sm:grid-cols-3">
            {CATEGORIES.map((c) => {
              const copy = VEHICLE_CATEGORY_COPY[c]
              const selected = category === c
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`min-h-11 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-accent bg-accent/5 text-ink'
                      : 'border-border-strong bg-card text-ink hover:bg-surface'
                  }`}
                >
                  <div className="text-[13.5px] font-semibold">{copy.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{copy.examples}</div>
                </button>
              )
            })}
          </div>
        </Field>

        <Field
          label="Recette nette perdue par jour d'arrêt"
          hint={
            !useOverride
              ? `${fmt(DOWNTIME_COST_PER_DAY[category])} F/j par défaut, modifiable`
              : 'Valeur personnalisée'
          }
        >
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={5000}
              max={80_000}
              step={1000}
              value={daily}
              onChange={(e) => {
                setDailyOverride(Number(e.target.value))
                setUseOverride(true)
              }}
              className="flex-1 accent-accent"
            />
            <span className="tabular w-24 text-right font-mono text-[14px] text-ink">
              {fmt(daily)} F
            </span>
            {useOverride && (
              <button
                type="button"
                onClick={() => {
                  setUseOverride(false)
                  setDailyOverride(DOWNTIME_COST_PER_DAY[category])
                }}
                className="rounded-sm border border-border-strong bg-card px-2 py-1 text-[12px] text-muted hover:bg-surface"
              >
                Réinitialiser
              </button>
            )}
          </div>
        </Field>

        <Field label="Durée d'immobilisation prévue (jours)">
          <input
            type="range"
            min={1}
            max={60}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="mt-1 flex justify-between font-mono text-[12px] text-muted-2">
            <span>1 j</span>
            <span className="tabular text-ink">{days} j</span>
            <span>60 j</span>
          </div>
        </Field>

        <Field
          label="Prix de la pièce (optionnel)"
          hint="Si vous laissez vide, on retient un plancher hors prix de la pièce."
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            value={partPrice || ''}
            onChange={(e) => setPartPrice(Number(e.target.value) || 0)}
            className="tabular w-40 rounded-md border border-border-strong bg-card px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
            placeholder="ex. 45 000"
          />
        </Field>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Recette perdue" value={`${fmt(downtime)} F`} accent />
        <Stat label="Part du budget pièces annuel" value={`${downtimeShare} %`} />
        <Stat label="Coût marginal par jour" value={`${fmt(daily)} F`} />
      </div>

      <div className="mt-6 rounded-md border border-border bg-card p-5">
        <p className="text-[13.5px] leading-relaxed text-muted">
          À ce rythme, un seul arrêt de {days} jours coûte l&apos;équivalent de{' '}
          <strong className="text-ink">{downtimeShare} %</strong> du budget pièces annuel de
          référence pour la catégorie {VEHICLE_CATEGORY_COPY[category].label.toLowerCase()} (
          {fmt(annual)} F). C&apos;est ce troisième terme qui décide, pas le prix de la pièce.
        </p>
        <Link
          href={devisHref}
          className="mt-4 inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          Chiffrer ma pièce →
        </Link>
      </div>
    </>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13.5px] font-semibold text-ink">{label}</label>
      {hint && <p className="mt-0.5 text-[12px] text-muted">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-md border p-5 ${
        accent ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'
      }`}
    >
      <div className={`tabular font-mono text-[22px] ${accent ? 'text-accent' : 'text-ink'}`}>
        {value}
      </div>
      <div className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
    </div>
  )
}
