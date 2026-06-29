'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv, fmtFcfa } from '@/lib/admin-api'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

interface Item {
  id: string
  name: string | null
  category: string | null
  price: number | null
  commissionAmount: number | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  condition: 'NEW' | 'USED' | 'REFURBISHED' | null
  createdAt: string
  vendor: { id: string; shopName: string }
  photos: { urlThumb: string | null; urlOriginal: string }[]
}

interface ListResponse {
  items: Item[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

type Suggestion =
  | { type: 'part'; label: string }
  | { type: 'brand'; label: string }
  | { type: 'vendor'; label: string }

const SUGGEST_LABEL: Record<Suggestion['type'], string> = {
  part: 'Pièce',
  brand: 'Marque',
  vendor: 'Vendeur',
}

const SUGGEST_COLOR: Record<Suggestion['type'], string> = {
  part: 'text-ink-2 bg-surface',
  brand: 'text-accent bg-accent/10',
  vendor: 'text-ink bg-card',
}

export default function AdminPartsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Autocomplétion prédictive (pièces / marques / vendeurs)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  // Quand on choisit une suggestion, on ne veut pas relancer une requête suggest
  // sur le terme qu'on vient d'injecter.
  const justPicked = useRef(false)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/catalog/list?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [q, status, page])

  useEffect(() => { load() }, [load])

  // Suggestions débouncées : déclenchées à partir de 2 caractères.
  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return }
    const term = q.trim()
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      if (term.length < 2) { setSuggestions([]); setShowSuggest(false); return }
      adminFetch<{ suggestions: Suggestion[] }>(
        `/admin/catalog/suggest?q=${encodeURIComponent(term)}`,
        { signal: ctrl.signal },
      )
        .then((r) => { setSuggestions(r.suggestions); setActiveIdx(-1); setShowSuggest(true) })
        .catch(() => {})
    }, 200)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q])

  function pick(s: Suggestion) {
    justPicked.current = true
    setPage(1)
    setQ(s.label)
    setSuggestions([])
    setShowSuggest(false)
    setActiveIdx(-1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggest || suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      const sel = suggestions[activeIdx]
      if (sel) { e.preventDefault(); pick(sel) }
    } else if (e.key === 'Escape') {
      setShowSuggest(false)
    }
  }

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Pièces</h1>
        <button
          onClick={() => downloadCsv('catalog')}
          className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card"
        >
          Export CSV
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <input
            value={q}
            onChange={(e) => { setPage(1); setQ(e.target.value) }}
            onKeyDown={onKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggest(true) }}
            onBlur={() => { setTimeout(() => setShowSuggest(false), 120) }}
            placeholder="Rechercher (nom, catégorie, OEM, marque, vendeur…)"
            className="w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
            autoComplete="off"
          />
          {showSuggest && suggestions.length > 0 && (
            <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-md border border-border-strong bg-card py-1 shadow-lg">
              {suggestions.map((s, i) => (
                <li key={`${s.type}-${s.label}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); pick(s) }}
                    onMouseEnter={() => setActiveIdx(i)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                      activeIdx === i ? 'bg-surface' : ''
                    }`}
                  >
                    <span className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em] ${SUGGEST_COLOR[s.type]}`}>
                      {SUGGEST_LABEL[s.type]}
                    </span>
                    <span className="truncate text-ink">{s.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value) }}
          className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        >
          <option value="">Tous les statuts</option>
          <option value="DRAFT">Brouillon</option>
          <option value="PUBLISHED">Publié</option>
          <option value="ARCHIVED">Archivé</option>
        </select>
      </div>

      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}

      {!data ? (
        <div className="text-sm text-muted">Chargement…</div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Photo</Th>
                  <Th>Nom</Th>
                  <Th>Vendeur</Th>
                  <Th align="right">Prix</Th>
                  <Th align="right">Commission</Th>
                  <Th>Statut</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map((it) => {
                  const src = it.photos[0]?.urlThumb ?? it.photos[0]?.urlOriginal
                  return (
                    <Tr key={it.id}>
                      <Td>
                        {src ? <img src={src} alt="" className="h-10 w-10 rounded-sm object-cover" /> : <div className="h-10 w-10 rounded-sm bg-surface" />}
                      </Td>
                      <Td>
                        <Link href={`/admin/catalog/${it.id}`} className="font-medium text-ink hover:text-accent hover:underline">{it.name ?? '—'}</Link>
                        <div className="text-xs text-muted">{it.category ?? ''}</div>
                      </Td>
                      <Td>
                        <Link href={`/admin/vendors/${it.vendor.id}`} className="text-ink-2 hover:underline">{it.vendor.shopName}</Link>
                      </Td>
                      <Td num>{fmtFcfa(it.price)}</Td>
                      <Td num>{fmtFcfa(it.commissionAmount)}</Td>
                      <Td>
                        {it.status === 'PUBLISHED' && <Chip variant="status-ok">Publié</Chip>}
                        {it.status === 'DRAFT' && <Chip variant="status-warn">Brouillon</Chip>}
                        {it.status === 'ARCHIVED' && <Chip variant="plain">Archivé</Chip>}
                      </Td>
                    </Tr>
                  )
                })}
                {data.items.length === 0 && (
                  <Tr hover={false}><Td colSpan={6} align="center" className="py-6 text-muted">Aucune pièce.</Td></Tr>
                )}
              </Tbody>
            </Table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} pièces · page {data.pagination.page}/{data.pagination.totalPages}</div>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">←</button>
              <button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)} className="rounded-sm border border-border-strong px-2 py-1 disabled:opacity-40">→</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
