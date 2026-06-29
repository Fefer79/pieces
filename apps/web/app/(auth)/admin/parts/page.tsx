'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv, fmtFcfa } from '@/lib/admin-api'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { PredictiveSearch, type PredictiveItem } from '@/components/predictive-search'

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

// Seul l'admin Pièces conserve la suggestion par vendeur.
const PART_BADGES = {
  part: { label: 'Pièce', className: 'text-ink-2 bg-surface' },
  brand: { label: 'Marque', className: 'text-accent bg-accent/10' },
  vendor: { label: 'Vendeur', className: 'text-ink bg-card' },
}

export default function AdminPartsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

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

  const fetchSuggestions = useCallback(async (term: string): Promise<PredictiveItem[]> => {
    const res = await adminFetch<{ suggestions: PredictiveItem[] }>(
      `/admin/catalog/suggest?q=${encodeURIComponent(term)}`,
    )
    return res.suggestions
  }, [])

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
        <PredictiveSearch
          value={q}
          onChange={(v) => { setPage(1); setQ(v) }}
          fetchSuggestions={fetchSuggestions}
          badges={PART_BADGES}
          placeholder="Rechercher (nom, catégorie, OEM, marque, vendeur…)"
          className="min-w-[200px] flex-1"
        />
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
