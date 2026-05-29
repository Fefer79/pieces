'use client'

import { useEffect, useId, useRef, useState } from 'react'

export interface AutocompleteVehicle {
  brand?: string
  model?: string
  year?: string
}

interface PartSearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  /** Déclenché sur Entrée ou sélection d'une suggestion. */
  onSubmit?: (value: string) => void
  /** Restreint les suggestions au véhicule sélectionné. */
  vehicle?: AutocompleteVehicle | null
  placeholder?: string
  autoFocus?: boolean
  className?: string
}

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
    <path
      fillRule="evenodd"
      d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
      clipRule="evenodd"
    />
  </svg>
)

export function PartSearchAutocomplete({
  value,
  onChange,
  onSubmit,
  vehicle,
  placeholder = 'Nom de la pièce, référence OEM…',
  autoFocus,
  className,
}: PartSearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const listboxId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  // Évite de rouvrir la liste juste après une sélection.
  const skipNextFetch = useRef(false)

  // Fetch debouncé des suggestions de noms de pièces. Tous les setState vivent
  // dans le callback (asynchrone) — aucun setState synchrone dans le corps de l'effet.
  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false
      return
    }
    const q = value.trim()
    const timer = setTimeout(async () => {
      if (q.length < 2) {
        setSuggestions([])
        setOpen(false)
        return
      }
      const params = new URLSearchParams({ q })
      if (vehicle?.brand) params.set('brand', vehicle.brand)
      if (vehicle?.model) params.set('model', vehicle.model)
      if (vehicle?.year) params.set('year', vehicle.year)
      try {
        const res = await fetch(`/api/v1/browse/suggest?${params.toString()}`)
        const body = await res.json()
        const items: string[] = body.data?.suggestions ?? []
        setSuggestions(items)
        setOpen(items.length > 0)
        setHighlight(-1)
      } catch {
        setSuggestions([])
        setOpen(false)
      }
    }, q.length < 2 ? 0 : 250)
    return () => clearTimeout(timer)
  }, [value, vehicle?.brand, vehicle?.model, vehicle?.year])

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

  const select = (s: string) => {
    skipNextFetch.current = true
    onChange(s)
    setOpen(false)
    setHighlight(-1)
    onSubmit?.(s)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Enter') onSubmit?.(value)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => (h + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlight >= 0 && suggestions[highlight]) select(suggestions[highlight])
      else onSubmit?.(value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <div className="flex items-center gap-2 rounded-sm border border-border-strong bg-card pr-2 transition-shadow focus-within:border-ink-2 focus-within:shadow-[0_0_0_3px_rgba(0,35,102,0.08)]">
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-sm text-ink outline-none"
          style={{ minHeight: 48 }}
        />
        <button
          type="button"
          aria-label="Rechercher"
          onClick={() => onSubmit?.(value)}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white"
        >
          <SearchIcon />
        </button>
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-md"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === highlight}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                select(s)
              }}
              className={`cursor-pointer px-4 py-2.5 text-sm ${
                i === highlight ? 'bg-surface text-ink' : 'text-ink'
              }`}
              style={{ minHeight: 44 }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
