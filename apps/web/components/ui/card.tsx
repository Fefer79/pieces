import type { ReactNode } from 'react'

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode
  className?: string
  padded?: boolean
}) {
  return (
    <div
      className={`rounded-md border border-border bg-card ${padded ? 'p-5' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  delta,
  deltaDirection,
}: {
  label: string
  value: string | number
  delta?: string
  deltaDirection?: 'up' | 'down' | 'flat'
}) {
  const deltaClass =
    deltaDirection === 'up'
      ? 'text-success-fg'
      : deltaDirection === 'down'
        ? 'text-error-fg'
        : 'text-muted'
  return (
    <div className="rounded-md border border-border bg-card p-[18px]">
      <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </div>
      <div className="font-display text-[28px] leading-none tabular">{value}</div>
      {delta && <div className={`mt-1.5 text-[11px] font-medium ${deltaClass}`}>{delta}</div>}
    </div>
  )
}
