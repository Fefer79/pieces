import type { ReactNode } from 'react'

export type ChipVariant =
  | 'neuf'
  | 'occasion'
  | 'reusine'
  | 'aftermarket'
  | 'oem'
  | 'plain'
  | 'status-ok'
  | 'status-warn'
  | 'status-err'

const variantClasses: Record<ChipVariant, string> = {
  neuf: 'bg-neuf-bg text-neuf-fg',
  occasion: 'bg-occasion-bg text-occasion-fg',
  reusine: 'bg-reusine-bg text-reusine-fg',
  aftermarket: 'bg-aftermarket-bg text-aftermarket-fg',
  oem: 'bg-oem-bg text-oem-fg',
  plain: 'bg-surface text-muted border border-border',
  'status-ok': 'bg-success-bg text-success-fg',
  'status-warn': 'bg-warn-bg text-warn-fg',
  'status-err': 'bg-error-bg text-error-fg',
}

const variantWithDot: ChipVariant[] = [
  'neuf',
  'occasion',
  'reusine',
  'aftermarket',
  'oem',
  'status-ok',
  'status-warn',
  'status-err',
]

export function Chip({
  variant = 'plain',
  children,
  className = '',
}: {
  variant?: ChipVariant
  children: ReactNode
  className?: string
}) {
  const showDot = variantWithDot.includes(variant)
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] leading-tight ${variantClasses[variant]} ${className}`}
    >
      {showDot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

const CONDITION_LABELS = {
  NEW: 'Neuf',
  USED: 'Occasion importée',
  REFURBISHED: 'Ré-usiné',
} as const

export type Condition = keyof typeof CONDITION_LABELS

export function ConditionChip({ condition, className }: { condition: Condition; className?: string }) {
  const variant: ChipVariant =
    condition === 'NEW' ? 'neuf' : condition === 'USED' ? 'occasion' : 'reusine'
  return (
    <Chip variant={variant} className={className}>
      {CONDITION_LABELS[condition]}
    </Chip>
  )
}
