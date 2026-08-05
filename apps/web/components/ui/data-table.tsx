'use client'

import type { ReactNode } from 'react'
import { Table, Thead, Tbody, Tr, Th, Td } from './table'

// Tableau dense générique du back-office.
//
// Bâti sur les primitives de `table.tsx` (dont il hérite l'en-tête DM Mono, le
// hover de ligne et l'alignement mono tabular des colonnes numériques) et non
// à côté d'elles.
//
// Il porte les trois choses que chaque page réécrivait à la main : les états
// chargement / erreur / vide, le tri d'en-tête, la pagination.

export interface Column<T> {
  key: string
  header: ReactNode
  /** Contenu de la cellule. */
  render: (row: T) => ReactNode
  /** Colonne numérique : alignée à droite, mono tabular. */
  num?: boolean
  align?: 'left' | 'right' | 'center'
  /** Rend l'en-tête cliquable et remonte la clé de tri. */
  sortable?: boolean
  /** Masque la colonne sous `lg`. */
  hideOnMobile?: boolean
  className?: string
}

export interface SortState {
  key: string
  direction: 'asc' | 'desc'
}

interface DataTableProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  rowKey: (row: T) => string
  loading?: boolean
  /** Message d'erreur — prend le pas sur l'état vide. */
  error?: string | null
  emptyLabel?: string
  emptyHint?: string
  onRowClick?: (row: T) => void
  sort?: SortState | null
  onSortChange?: (sort: SortState) => void
  /** Pagination : omettre `total` désactive le pied de tableau. */
  page?: number
  pageSize?: number
  total?: number
  onPageChange?: (page: number) => void
  /** Nombre de lignes du squelette de chargement. */
  skeletonRows?: number
}

function SortArrow({ direction }: { direction: 'asc' | 'desc' | null }) {
  if (!direction) return <span className="ml-1 text-muted-2">↕</span>
  return <span className="ml-1 text-ink-2">{direction === 'asc' ? '↑' : '↓'}</span>
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error = null,
  emptyLabel = 'Aucun résultat',
  emptyHint,
  onRowClick,
  sort = null,
  onSortChange,
  page,
  pageSize,
  total,
  onPageChange,
  skeletonRows = 6,
}: DataTableProps<T>) {
  const visible = columns
  const showFooter = total !== undefined && page !== undefined && pageSize !== undefined
  const lastPage = showFooter ? Math.max(1, Math.ceil(total / Math.max(1, pageSize))) : 1

  function toggleSort(key: string) {
    if (!onSortChange) return
    if (sort?.key === key) {
      onSortChange({ key, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      onSortChange({ key, direction: 'asc' })
    }
  }

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <Thead>
          <Tr hover={false}>
            {visible.map((c) => (
              <Th
                key={c.key}
                align={c.align ?? (c.num ? 'right' : 'left')}
                className={c.hideOnMobile ? 'hidden lg:table-cell' : ''}
              >
                {c.sortable && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted transition-colors hover:text-ink"
                  >
                    {c.header}
                    <SortArrow direction={sort?.key === c.key ? sort.direction : null} />
                  </button>
                ) : (
                  c.header
                )}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {/* Squelettes plutôt qu'un spinner : la hauteur du tableau ne saute
              pas au chargement, et l'utilisateur voit la forme du résultat. */}
          {loading &&
            Array.from({ length: skeletonRows }).map((_, i) => (
              <Tr key={`sk-${i}`} hover={false}>
                {visible.map((c) => (
                  <Td key={c.key} className={c.hideOnMobile ? 'hidden lg:table-cell' : ''}>
                    <span className="block h-3 w-full max-w-[140px] animate-pulse rounded-sm bg-border" />
                  </Td>
                ))}
              </Tr>
            ))}

          {!loading && error && (
            <Tr hover={false}>
              <Td colSpan={visible.length} className="py-10 text-center">
                <span className="text-[13.5px] text-error-fg">{error}</span>
              </Td>
            </Tr>
          )}

          {!loading && !error && rows.length === 0 && (
            <Tr hover={false}>
              <Td colSpan={visible.length} className="py-12 text-center">
                <span className="block text-[14px] font-medium text-ink">{emptyLabel}</span>
                {emptyHint && (
                  <span className="mt-1 block text-[13px] text-muted">{emptyHint}</span>
                )}
              </Td>
            </Tr>
          )}

          {!loading &&
            !error &&
            rows.map((row) => (
              <Tr
                key={rowKey(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
                {...(onRowClick && {
                  onClick: () => onRowClick(row),
                  tabIndex: 0,
                  role: 'button',
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onRowClick(row)
                    }
                  },
                })}
              >
                {visible.map((c) => (
                  <Td
                    key={c.key}
                    num={c.num}
                    align={c.align}
                    className={`${c.hideOnMobile ? 'hidden lg:table-cell' : ''} ${c.className ?? ''}`}
                  >
                    {c.render(row)}
                  </Td>
                ))}
              </Tr>
            ))}
        </Tbody>
      </Table>

      {showFooter && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            {total === 0
              ? 'Aucune ligne'
              : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} sur ${total.toLocaleString('fr-FR')}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => onPageChange?.(page - 1)}
              className="rounded-sm border border-border-strong bg-card px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Précédent
            </button>
            <span className="font-mono text-[11px] tabular text-muted">
              {page} / {lastPage}
            </span>
            <button
              type="button"
              disabled={page >= lastPage || loading}
              onClick={() => onPageChange?.(page + 1)}
              className="rounded-sm border border-border-strong bg-card px-3 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
