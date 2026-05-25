'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv, fmtFcfa } from '@/lib/admin-api'
import { Chip } from '@/components/ui/chip'

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
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="Rechercher (nom, catégorie, OEM…)"
          className="flex-1 min-w-[200px] rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2">Photo</th>
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Vendeur</th>
                  <th className="px-3 py-2 text-right">Prix</th>
                  <th className="px-3 py-2 text-right">Commission</th>
                  <th className="px-3 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((it) => {
                  const src = it.photos[0]?.urlThumb ?? it.photos[0]?.urlOriginal
                  return (
                    <tr key={it.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        {src ? <img src={src} alt="" className="h-10 w-10 rounded-sm object-cover" /> : <div className="h-10 w-10 rounded-sm bg-surface" />}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-ink">{it.name ?? '—'}</div>
                        <div className="text-xs text-muted">{it.category ?? ''}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/vendors/${it.vendor.id}`} className="text-ink-2 hover:underline">{it.vendor.shopName}</Link>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">{fmtFcfa(it.price)}</td>
                      <td className="px-3 py-2 text-right font-mono">{fmtFcfa(it.commissionAmount)}</td>
                      <td className="px-3 py-2">
                        {it.status === 'PUBLISHED' && <Chip variant="status-ok">Publié</Chip>}
                        {it.status === 'DRAFT' && <Chip variant="status-warn">Brouillon</Chip>}
                        {it.status === 'ARCHIVED' && <Chip variant="plain">Archivé</Chip>}
                      </td>
                    </tr>
                  )
                })}
                {data.items.length === 0 && (
                  <tr><td colSpan={6} className="p-6 text-center text-sm text-muted">Aucune pièce.</td></tr>
                )}
              </tbody>
            </table>
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
