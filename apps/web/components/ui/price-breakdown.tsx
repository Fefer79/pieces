import type { ReactNode } from 'react'
import { Price } from './price'

export type PriceLine = {
  label: string
  amount: number
}

/**
 * Composant signature « Reçu » (transparence du prix) — cf. DESIGN.md
 * « Redesign 2026-06 ». En-tête navy optionnel (eyebrow mono + titre Gloock),
 * lignes à points de conduite (dotted leaders), total en DM Mono, sceau
 * séquestre vert. Partagé : fiche produit, `/choose`, panier, récaps.
 *
 * Sans `title`, rend la carte seule (rétro-compatible).
 */
export function PriceBreakdown({
  lines,
  total,
  note,
  title,
  eyebrow = 'Transparence du prix',
  className = '',
}: {
  lines: PriceLine[]
  total: number
  note?: ReactNode
  title?: ReactNode
  eyebrow?: string
  className?: string
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      {title && (
        <div className="bg-ink px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#9FB0CF]">{eyebrow}</p>
          <h3 className="mt-1.5 font-display text-xl text-white">{title}</h3>
        </div>
      )}
      <div className="p-5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-end gap-2.5 py-2 text-sm">
            <span className="text-muted">{line.label}</span>
            <span className="mb-[5px] h-px flex-1 border-b border-dotted border-border-strong" aria-hidden />
            <Price amount={line.amount} currency={false} />
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between border-t-2 border-ink pt-3.5">
          <span className="text-[15px] font-semibold">Total</span>
          <Price amount={total} className="text-[22px] font-semibold" />
        </div>
        {note && (
          <div className="mt-3.5 flex items-start gap-2 rounded-sm bg-success-bg px-3 py-2.5 text-[12.5px] leading-relaxed text-success-fg">
            <span aria-hidden>🛡️</span>
            <div>{note}</div>
          </div>
        )}
      </div>
    </div>
  )
}
