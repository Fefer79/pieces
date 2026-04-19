import type { ReactNode } from 'react'
import { Price } from './price'

export type PriceLine = {
  label: string
  amount: number
}

export function PriceBreakdown({
  lines,
  total,
  note,
  className = '',
}: {
  lines: PriceLine[]
  total: number
  note?: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-md border border-border bg-card p-5 ${className}`}>
      {lines.map((line) => (
        <div key={line.label} className="flex items-baseline justify-between py-2 text-sm">
          <span className="text-muted">{line.label}</span>
          <Price amount={line.amount} currency={false} />
        </div>
      ))}
      <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3.5">
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
  )
}
