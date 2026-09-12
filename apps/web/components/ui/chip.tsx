import type { ReactNode } from 'react'

export type ChipVariant =
  | 'neuf'
  | 'occasion'
  | 'reusine'
  | 'aftermarket'
  | 'oem'
  | 'import'
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
  import: 'bg-import-bg text-import-fg',
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
  'import',
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

export function ConditionChip({
  condition,
  supplyMode,
  className,
}: {
  condition: Condition
  /**
   * Provenance de la pièce. « Occasion importée » désigne une occasion DÉJÀ
   * arrivée en Côte d'Ivoire : accolé à la chip « À importer », le libellé se
   * contredit. Sur une pièce encore à l'étranger, on dit donc « Occasion » et
   * on laisse la chip de disponibilité porter la provenance.
   */
  supplyMode?: string | null
  className?: string
}) {
  const variant: ChipVariant =
    condition === 'NEW' ? 'neuf' : condition === 'USED' ? 'occasion' : 'reusine'
  const label =
    condition === 'USED' && supplyMode === 'IMPORT' ? 'Occasion' : CONDITION_LABELS[condition]
  return (
    <Chip variant={variant} className={className}>
      {label}
    </Chip>
  )
}

/**
 * Disponibilité de la pièce — axe INDÉPENDANT de la condition. Une pièce neuve
 * chez un partenaire allemand porte les DEUX chips : « Neuf » + « À importer ».
 * C'est ce couple qui matérialise la rubrique « Neuf à importer » ; la chip de
 * condition n'est jamais remplacée (DESIGN.md, règle absolue).
 */
export function SupplyModeChip({
  supplyMode,
  className,
}: {
  supplyMode: string | null | undefined
  className?: string
}) {
  if (supplyMode !== 'IMPORT') return null
  return (
    <Chip variant="import" className={className}>
      À importer
    </Chip>
  )
}

const ORDER_STATUS: Record<string, { label: string; variant: ChipVariant }> = {
  DRAFT: { label: 'Brouillon', variant: 'oem' },
  PENDING_PAYMENT: { label: 'À payer', variant: 'status-warn' },
  DEPOSIT_PAID: { label: 'Acompte payé', variant: 'status-ok' },
  IN_IMPORT: { label: 'En acheminement', variant: 'import' },
  AWAITING_BALANCE: { label: 'Solde à régler', variant: 'status-warn' },
  PAID: { label: 'Payé', variant: 'status-ok' },
  VENDOR_CONFIRMED: { label: 'Confirmé', variant: 'status-ok' },
  DISPATCHED: { label: 'Expédié', variant: 'status-warn' },
  IN_TRANSIT: { label: 'En transit', variant: 'status-warn' },
  DELIVERED: { label: 'Livré', variant: 'occasion' },
  CONFIRMED: { label: 'Confirmé', variant: 'status-ok' },
  COMPLETED: { label: 'Terminé', variant: 'status-ok' },
  CANCELLED: { label: 'Annulé', variant: 'status-err' },
}

export function StatusChip({ status, className }: { status: string; className?: string }) {
  const s = ORDER_STATUS[status] ?? { label: status, variant: 'plain' as ChipVariant }
  return (
    <Chip variant={s.variant} className={className}>
      {s.label}
    </Chip>
  )
}

const PART_SOURCE_LABELS = {
  OEM: 'OEM',
  AFTERMARKET: 'Aftermarket',
  COMPATIBLE: 'Compatible',
} as const

export type PartSource = keyof typeof PART_SOURCE_LABELS

export function PartSourceChip({ source, className }: { source: PartSource; className?: string }) {
  const variant: ChipVariant =
    source === 'OEM' ? 'oem' : source === 'AFTERMARKET' ? 'aftermarket' : 'plain'
  return (
    <Chip variant={variant} className={className}>
      {PART_SOURCE_LABELS[source]}
    </Chip>
  )
}
