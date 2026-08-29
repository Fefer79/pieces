'use client'

import Link from 'next/link'
import type { ArbitrageResult } from 'shared/constants'
import { ArbitrageTable } from './arbitrage-table'
import { LEAD_FORM_COPY, type LeadCertaintyLevel } from '@/lib/logistique-content'

const fmt = (n: number) => n.toLocaleString('fr-FR')

/**
 * Estimation en direct pendant la saisie.
 *
 * ⚠ Sans prix pièce, `partPrice = 0` : la douane ne porte alors que sur le fret,
 * donc le montant affiché est un PLANCHER. On change le titre en conséquence et
 * on n'écrit jamais « coût total » dans ce régime.
 */
export function EstimatePanel({
  result,
  hasPartPrice,
  certaintyLevel,
  downtimeAssumed,
  showDowntime = true,
}: {
  result: ArbitrageResult
  hasPartPrice: boolean
  certaintyLevel: LeadCertaintyLevel
  /** Vrai quand le coût d'immobilisation est une hypothèse, pas la catégorie réelle. */
  downtimeAssumed: boolean
  /** Faux hors contexte flotte : l'immobilisation sort de l'estimation. */
  showDowntime?: boolean
}) {
  const title = hasPartPrice
    ? LEAD_FORM_COPY.estimateTitleWithPrice
    : LEAD_FORM_COPY.estimateTitleWithoutPrice

  return (
    <section aria-live="polite">
      {certaintyLevel !== 'HIGH' && (
        <p className="mb-4 rounded-md border border-warn-fg/30 bg-warn-bg px-4 py-3 text-[13px] leading-relaxed text-warn-fg">
          {LEAD_FORM_COPY.indicativeBanner}
        </p>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[22px] text-ink">{title}</h2>
        <span className="tabular font-mono text-[12px] text-muted">
          {result.familyLabel} · {result.weightKg} kg · {result.volumeDm3} dm³
        </span>
      </div>

      {!hasPartPrice && (
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          {LEAD_FORM_COPY.estimateNoteWithoutPrice}
        </p>
      )}

      <div className="mt-4">
        <ArbitrageTable
          result={result}
          showPartPrice={hasPartPrice}
          totalLabel={hasPartPrice ? 'Coût total' : 'Sous-total'}
          showDowntime={showDowntime}
        />
      </div>

      {showDowntime ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          Immobilisation retenue :{' '}
          <span className="tabular font-mono text-ink">{fmt(result.downtimeCostPerDay)} F</span> par
          jour d&apos;arrêt.{' '}
          {downtimeAssumed && (
            <span className="text-muted-2">{LEAD_FORM_COPY.downtimeAssumption}</span>
          )}
        </p>
      ) : (
        // L'argument du coût d'immobilisation vit sur la page Flottes VTC, où il
        // s'adresse à ceux dont un véhicule à l'arrêt coûte réellement.
        <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
          {LEAD_FORM_COPY.fleetDowntimeTeaser}{' '}
          <Link href="/logistique/flottes-vtc" className="font-medium text-ink-2 hover:underline">
            {LEAD_FORM_COPY.fleetDowntimeCta} →
          </Link>
        </p>
      )}
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-2">
        {LEAD_FORM_COPY.estimateFootnote}
      </p>
    </section>
  )
}
