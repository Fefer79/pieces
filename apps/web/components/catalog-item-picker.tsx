'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ConditionChip, PartSourceChip, type Condition, type PartSource } from '@/components/ui/chip'
import { Price } from '@/components/ui/price'

export type PickedCatalogItem = {
  id: string
  name: string | null
  category: string | null
  condition: Condition
  partSource: PartSource | null
  oemReference: string | null
  vehicleCompatibility: string | null
  price: number
  imageThumbUrl: string | null
  vendor: { id: string; shopName: string } | null
}

/**
 * Sélecteur de pièce catalogue pour l'espace flotte : le gestionnaire cherche
 * par nom ou référence OEM, jamais par UUID. La condition reste un chip
 * first-class (DESIGN.md) — c'est le critère de choix n°1 du gestionnaire.
 */
export function CatalogItemPicker({
  value,
  onChange,
  initialQuery = '',
  label = 'Pièce catalogue',
  required = false,
}: {
  value: PickedCatalogItem | null
  onChange: (item: PickedCatalogItem | null) => void
  initialQuery?: string
  label?: string
  required?: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const [items, setItems] = useState<PickedCatalogItem[]>([])
  const [searching, setSearching] = useState(false)
  const [touched, setTouched] = useState(false)
  const reqIdRef = useRef(0)

  const search = useCallback(async (term: string) => {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      setItems([])
      return
    }
    const reqId = ++reqIdRef.current
    setSearching(true)
    try {
      const res = await fetch(`/api/v1/browse/search?q=${encodeURIComponent(trimmed)}&limit=8`)
      const body = await res.json()
      // Réponse obsolète (l'utilisateur a continué à taper) : on l'ignore.
      if (reqId !== reqIdRef.current) return
      setItems(body.data?.items ?? [])
    } catch {
      if (reqId === reqIdRef.current) setItems([])
    } finally {
      if (reqId === reqIdRef.current) setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (value) return
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, value, search])

  if (value) {
    return (
      <div>
        <FieldLabel label={label} required={required} />
        <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{value.name ?? 'Sans nom'}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <ConditionChip condition={value.condition} />
              {value.partSource && <PartSourceChip source={value.partSource} />}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {value.vendor?.shopName ?? 'Fournisseur inconnu'}
              {value.oemReference ? ` · Réf. ${value.oemReference}` : ''}
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-col items-end gap-1">
            <Price amount={value.price} className="text-sm font-semibold text-ink" />
            <button
              type="button"
              onClick={() => {
                onChange(null)
                setQuery('')
                setItems([])
              }}
              className="text-xs text-muted underline hover:text-ink"
            >
              Changer
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <FieldLabel label={label} required={required} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setTouched(true)
        }}
        placeholder="Nom de la pièce ou référence OEM…"
        className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
      />
      {searching && <p className="mt-1.5 text-xs text-muted">Recherche…</p>}
      {!searching && touched && query.trim().length >= 2 && items.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">
          Aucune pièce trouvée. Essayez un autre terme ou la référence OEM.
        </p>
      )}
      {items.length > 0 && (
        <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onChange(item)}
                className="flex w-full items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-surface"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{item.name ?? 'Sans nom'}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <ConditionChip condition={item.condition} />
                    {item.partSource && <PartSourceChip source={item.partSource} />}
                  </div>
                  <p className="mt-1.5 truncate text-xs text-muted">
                    {item.vendor?.shopName ?? 'Fournisseur inconnu'}
                    {item.oemReference ? ` · Réf. ${item.oemReference}` : ''}
                  </p>
                </div>
                <Price amount={item.price} className="flex-shrink-0 text-sm text-ink" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FieldLabel({ label, required }: { label: string; required: boolean }) {
  return (
    <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
      {label}
      {required ? ' *' : ''}
    </span>
  )
}
