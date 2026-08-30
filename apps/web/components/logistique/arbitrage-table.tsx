import type { ArbitrageOption, ArbitrageResult } from 'shared/constants'
import { MODE_COPY } from '@/lib/logistique-content'

// Tableau d'arbitrage public. Volontairement distinct de
// components/logistics-matrix.tsx (back-office flotte), qui expose le détail
// interne et va chercher la matrice par le réseau : ici le calcul est déjà fait
// et le rendu est utilisable en composant serveur.
//
// Règle DESIGN.md : aucun coût n'est agrégé sans être montré. On regroupe fret +
// douane + livraison sous « Acheminement » mais chaque poste reste lisible en
// info-bulle ; on n'affiche JAMAIS les tarifs internes au kilo.
//
// `showDowntime` : le coût d'immobilisation n'a de sens que pour une flotte, qui
// perd une recette chaque jour où le véhicule est à l'arrêt. Sur les surfaces
// publiques (cotation, suivi), il est masqué — et comme il ne doit alors être ni
// agrégé ni sous-entendu, le total et le classement sont recalculés sans lui.

const fmt = (n: number) => n.toLocaleString('fr-FR')

export const formatDelay = (days: number) =>
  days < 1 ? `${Math.round(days * 24)} h` : `${days} j`

function freightTotal(o: ArbitrageOption) {
  return o.freightCost + o.customsCost
}

function freightDetail(o: ArbitrageOption) {
  const parts = [`fret ${fmt(o.freightCost)} F`]
  if (o.customsCost > 0) parts.push(`douane ${fmt(o.customsCost)} F`)
  return parts.join(' · ')
}

export function ArbitrageTable({
  result,
  showPartPrice = true,
  totalLabel = 'Coût total',
  showDowntime = true,
}: {
  result: ArbitrageResult
  /** Masqué quand le prix pièce est inconnu — le total devient alors un plancher. */
  showPartPrice?: boolean
  totalLabel?: string
  /** Faux sur les surfaces publiques : l'immobilisation sort du total et du classement. */
  showDowntime?: boolean
}) {
  // Sans immobilisation, le classement par coût total du calcul partagé ne
  // correspond plus à ce qui est affiché : on retrie sur le total visible pour
  // ne jamais montrer une colonne « Coût total » dans le désordre.
  const total = (o: ArbitrageOption) => (showDowntime ? o.totalCost : o.totalCost - o.downtimeCost)
  const rows = showDowntime
    ? result.options
    : [...result.options].sort((a, b) => total(a) - total(b))
  const bestVisible = rows.find((o) => o.available)
  const gapToBest = (o: ArbitrageOption) =>
    showDowntime ? o.extraCostVsBest : bestVisible ? total(o) - total(bestVisible) : 0

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-card">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-surface text-left">
            <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Option
            </th>
            <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Délai
            </th>
            {showPartPrice && (
              <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Pièce
              </th>
            )}
            <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Acheminement
            </th>
            <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Frais Pièces
            </th>
            {showDowntime && (
              <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Immobilisation
              </th>
            )}
            <th className="px-4 py-3 text-right font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {totalLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.mode}
              className={
                'border-b border-border last:border-0 ' +
                ((showDowntime ? o.recommended : o === bestVisible) ? 'bg-success-bg/40' : '')
              }
            >
              <td className="px-4 py-3 align-top">
                <span
                  className={
                    (showDowntime ? o.recommended : o === bestVisible)
                      ? 'font-semibold text-ink'
                      : 'text-ink'
                  }
                >
                  {MODE_COPY[o.mode]?.publicLabel ?? o.label}
                </span>
                {(showDowntime ? o.recommended : o === bestVisible) && (
                  <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-success-fg">
                    {/* Sans immobilisation, l'arbitrage se réduit au prix : on
                        annonce « le moins cher », pas une recommandation. */}
                    {showDowntime ? 'Recommandé' : 'Le moins cher'}
                  </span>
                )}
                {!o.available && (
                  <span className="ml-2 rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted">
                    Indisponible
                  </span>
                )}
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-2">{o.detail}</p>
                {o.warnings.map((w) => (
                  <p key={w} className="mt-1 text-[11.5px] leading-snug text-warn-fg">
                    ⚠ {w}
                  </p>
                ))}
              </td>
              <td className="whitespace-nowrap px-4 py-3 align-top text-ink">
                {formatDelay(o.transitDays)}
              </td>
              {showPartPrice && (
                <td className="tabular whitespace-nowrap px-4 py-3 text-right align-top font-mono text-ink">
                  {fmt(o.partPrice)}
                </td>
              )}
              <td className="px-4 py-3 text-right align-top">
                <span className="tabular whitespace-nowrap font-mono text-ink">
                  {fmt(freightTotal(o))}
                </span>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-2">{freightDetail(o)}</p>
              </td>
              <td className="px-4 py-3 text-right align-top">
                {o.serviceFee > 0 ? (
                  <>
                    <span className="tabular whitespace-nowrap font-mono text-ink">
                      {fmt(o.serviceFee)}
                    </span>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-2">10 % du prix</p>
                  </>
                ) : (
                  <span className="text-muted-2">—</span>
                )}
              </td>
              {showDowntime && (
                <td className="tabular whitespace-nowrap px-4 py-3 text-right align-top font-mono text-ink">
                  {fmt(o.downtimeCost)}
                </td>
              )}
              <td className="px-4 py-3 text-right align-top">
                <span
                  className={
                    'tabular whitespace-nowrap font-mono ' +
                    ((showDowntime ? o.recommended : o === bestVisible)
                      ? 'font-semibold text-ink'
                      : 'text-ink')
                  }
                >
                  {fmt(total(o))}
                </span>
                {gapToBest(o) > 0 && (
                  <p className="tabular mt-0.5 font-mono text-[11px] text-error-fg">
                    + {fmt(gapToBest(o))}
                  </p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
