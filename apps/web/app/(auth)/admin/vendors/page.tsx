'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv } from '@/lib/admin-api'

interface Vendor {
  id: string
  shopName: string
  status: string
  phone: string
  user: { id: string; phone: string | null; email: string | null; name: string | null } | null
  _count: { catalogItems: number }
}
interface ListResponse {
  vendors: Vendor[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function AdminVendorsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/vendors/list?${params}`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [q, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Vendeurs</h1>
        <button onClick={() => downloadCsv('vendors')} className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card">Export CSV</button>
      </div>
      <input
        value={q}
        onChange={(e) => { setPage(1); setQ(e.target.value) }}
        placeholder="Rechercher (nom de la boutique, téléphone, email)"
        className="mb-3 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
      />
      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {!data ? <div className="text-sm text-muted">Chargement…</div> : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2">Boutique</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2 text-right">Articles</th>
                </tr>
              </thead>
              <tbody>
                {data.vendors.map((v) => (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/admin/vendors/${v.id}`} className="font-medium text-ink-2 hover:underline">{v.shopName}</Link>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{v.user?.phone ?? v.phone}</div>
                      <div className="text-muted">{v.user?.email ?? ''}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">{v.status}</td>
                    <td className="px-3 py-2 text-right font-mono">{v._count.catalogItems}</td>
                  </tr>
                ))}
                {data.vendors.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-sm text-muted">Aucun vendeur.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} vendeurs · page {data.pagination.page}/{data.pagination.totalPages}</div>
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
