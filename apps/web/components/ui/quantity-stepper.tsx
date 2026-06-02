'use client'

export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  size = 'md',
  className = '',
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  size?: 'sm' | 'md'
  className?: string
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const dim = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  const valW = size === 'sm' ? 'w-9' : 'w-12'

  return (
    <div
      className={`inline-flex items-center rounded-md border border-border-strong bg-card ${className}`}
    >
      <button
        type="button"
        aria-label="Diminuer la quantité"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        className={`${dim} flex items-center justify-center text-lg text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40`}
      >
        −
      </button>
      <span
        className={`${valW} text-center font-mono tabular text-sm text-ink`}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Augmenter la quantité"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        className={`${dim} flex items-center justify-center text-lg text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40`}
      >
        +
      </button>
    </div>
  )
}
