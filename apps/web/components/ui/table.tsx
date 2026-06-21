import type { ReactNode, TdHTMLAttributes } from 'react'

type Align = 'left' | 'right' | 'center'

const alignClass = (a: Align) =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left'

/**
 * Primitives de table dense — standard back-office du redesign 2026-06 :
 * en-têtes DM Mono uppercase sur fond `surface`, lignes à hover, prix alignés
 * à droite en mono tabular (`<Td num>`). Remplace les `<table>` inline pour une
 * mise en forme uniforme. Le markup reste sémantique (table/thead/tbody/tr).
 */
export function Table({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse text-[13.5px] ${className}`}>{children}</table>
    </div>
  )
}

export function Thead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

export function Tr({
  children,
  className = '',
  hover = true,
}: {
  children: ReactNode
  className?: string
  /** Désactive le survol pour les lignes d'en-tête. */
  hover?: boolean
}) {
  return (
    <tr className={`border-b border-border last:border-0 ${hover ? 'hover:bg-surface' : ''} ${className}`}>
      {children}
    </tr>
  )
}

export function Th({
  children,
  align = 'left',
  className = '',
}: {
  children?: ReactNode
  align?: Align
  className?: string
}) {
  return (
    <th
      className={`border-b border-border bg-surface px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted ${alignClass(align)} ${className}`}
    >
      {children}
    </th>
  )
}

export function Td({
  children,
  num = false,
  align,
  className = '',
  ...rest
}: {
  children?: ReactNode
  /** Cellule numérique : alignée à droite, DM Mono tabular, insécable. */
  num?: boolean
  align?: Align
  className?: string
} & TdHTMLAttributes<HTMLTableCellElement>) {
  const a: Align = align ?? (num ? 'right' : 'left')
  const numCls = num ? 'font-mono tabular whitespace-nowrap' : ''
  return (
    <td className={`px-5 py-3 align-middle ${alignClass(a)} ${numCls} ${className}`} {...rest}>
      {children}
    </td>
  )
}
