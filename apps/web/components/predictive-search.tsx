'use client'

import { useEffect, useId, useRef, useState } from 'react'

export interface PredictiveItem {
  label: string
  /** Type optionnel — sert à afficher un badge coloré (Pièce / Marque / …). */
  type?: string
}

export interface PredictiveBadge {
  label: string
  className: string
}

interface PredictiveSearchProps {
  value: string
  onChange: (value: string) => void
  /**
   * Récupère les suggestions pour un terme. Peut être asynchrone (API) ou
   * synchrone (filtre local). `signal` permet d'annuler les requêtes réseau.
   */
  fetchSuggestions: (term: string, signal: AbortSignal) => Promise<PredictiveItem[]>
  /** Badges par type de suggestion. Si absent pour un type, aucun badge. */
  badges?: Record<string, PredictiveBadge>
  placeholder?: string
  className?: string
  inputClassName?: string
  minChars?: number
  debounceMs?: number
  autoComplete?: string
}

const DEFAULT_INPUT_CLASS =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm'

export function PredictiveSearch({
  value,
  onChange,
  fetchSuggestions,
  badges,
  placeholder = 'Rechercher…',
  className,
  inputClassName,
  minChars = 2,
  debounceMs = 200,
  autoComplete = 'off',
}: PredictiveSearchProps) {
  const [items, setItems] = useState<PredictiveItem[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  // Évite de relancer une requête juste après avoir choisi une suggestion.
  const skipNextFetch = useRef(false)

  // Fetch débouncé. Tous les setState vivent dans le callback asynchrone.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    const term = value.trim()
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      if (term.length < minChars) {
        setItems([])
        setOpen(false)
        return
      }
      try {
        const results = await fetchSuggestions(term, ctrl.signal)
        if (ctrl.signal.aborted) return
        setItems(results)
        setOpen(results.length > 0)
        setHighlight(-1)
      } catch {
        if (!ctrl.signal.aborted) {
          setItems([])
          setOpen(false)
        }
      }
    }, debounceMs)
    return () => { clearTimeout(timer); ctrl.abort() }
  }, [value, fetchSuggestions, minChars, debounceMs])

  // Fermer au clic extérieur.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const select = (item: PredictiveItem) => {
    skipNextFetch.current = true
    onChange(item.label)
    setItems([])
    setOpen(false)
    setHighlight(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % items.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? items.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      const sel = items[highlight]
      if (sel) { e.preventDefault(); select(sel) }
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClassName ?? DEFAULT_INPUT_CLASS}
      />
      {open && items.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-border-strong bg-card py-1 shadow-lg"
        >
          {items.map((item, i) => {
            const badge = item.type ? badges?.[item.type] : undefined
            return (
              <li key={`${item.type ?? ''}-${item.label}`} id={`${listboxId}-opt-${i}`} role="option" aria-selected={i === highlight}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); select(item) }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                    i === highlight ? 'bg-surface' : ''
                  }`}
                >
                  {badge && (
                    <span className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                  <span className="truncate text-ink">{item.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
