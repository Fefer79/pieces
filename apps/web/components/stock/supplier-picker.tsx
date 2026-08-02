'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { stockFetch, type Supplier, type SupplierList } from '@/lib/stock-api'

export type PickedSupplier = Pick<
  Supplier,
  'id' | 'nom' | 'pays' | 'ville' | 'devise' | 'delaiTypiqueJours'
>

/**
 * Sélecteur de fournisseur pour les bons de commande : recherche par nom /
 * pays / ville (GET /suppliers?q=), jamais par UUID. Pattern CatalogItemPicker.
 */
export function SupplierPicker({
  value,
  onChange,
  label = 'Fournisseur',
  required = false,
}: {
  value: PickedSupplier | null
  onChange: (supplier: PickedSupplier | null) => void
  label?: string
  required?: boolean
}) {
  const [query, setQuery] = useState('')
  const [suppliers, setSuppliers] = useState<PickedSupplier[]>([])
  const [searching, setSearching] = useState(false)
  const [touched, setTouched] = useState(false)
  const reqIdRef = useRef(0)

  const search = useCallback((term: string) => {
    const trimmed = term.trim()
    if (trimmed.length < 2) {
      setSuppliers([])
      return
    }
    const reqId = ++reqIdRef.current
    setSearching(true)
    stockFetch<SupplierList>(`/suppliers?q=${encodeURIComponent(trimmed)}&limit=8`).then((res) => {
      // Réponse obsolète (l'utilisateur a continué à taper) : on l'ignore.
      if (reqId !== reqIdRef.current) return
      setSuppliers(res.ok ? res.data.suppliers : [])
      setSearching(false)
    })
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
            <p className="truncate text-sm font-semibold text-ink">{value.nom}</p>
            <p className="mt-1 text-xs text-muted">
              {[value.ville, value.pays].filter(Boolean).join(', ') ||
                'Localisation non renseignée'}
              {` · ${value.devise}`}
              {value.delaiTypiqueJours != null ? ` · ~${value.delaiTypiqueJours} j` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null)
              setQuery('')
              setSuppliers([])
            }}
            className="flex-shrink-0 text-xs text-muted underline hover:text-ink"
          >
            Changer
          </button>
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
        placeholder="Nom, pays ou ville du fournisseur…"
        className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
      />
      {searching && <p className="mt-1.5 text-xs text-muted">Recherche…</p>}
      {!searching && touched && query.trim().length >= 2 && suppliers.length === 0 && (
        <p className="mt-1.5 text-xs text-muted">
          Aucun fournisseur trouvé. Créez-le dans l’onglet Fournisseurs.
        </p>
      )}
      {suppliers.length > 0 && (
        <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto rounded-md border border-border bg-card">
          {suppliers.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onChange(s)}
                className="flex w-full items-start justify-between gap-3 p-3 text-left transition-colors hover:bg-surface"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{s.nom}</p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {[s.ville, s.pays].filter(Boolean).join(', ')}
                  </p>
                </div>
                <span className="flex-shrink-0 font-mono text-xs text-muted">{s.devise}</span>
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
