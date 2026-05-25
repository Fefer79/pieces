'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch } from '@/lib/admin-api'

interface Enterprise {
  id: string
  name: string
  commune: string | null
  rccm: string | null
  address: string | null
  createdAt: string
  _count: { vehicles: number; members: number }
}
interface ListResponse {
  enterprises: Enterprise[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function AdminEnterprisesPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/enterprises/list?${params}`).then(setData).catch((e) => setError(e.message))
  }, [q, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Entreprises</h1>
      <input
        value={q}
        onChange={(e) => { setPage(1); setQ(e.target.value) }}
        placeholder="Rechercher (nom, commune, RCCM)"
        className="mb-3 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
      />
      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {!data ? <div className="text-sm text-muted">Chargement…</div> : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Commune</th>
                  <th className="px-3 py-2">RCCM</th>
                  <th className="px-3 py-2 text-right">Véhicules</th>
                  <th className="px-3 py-2 text-right">Membres</th>
                </tr>
              </thead>
              <tbody>
                {data.enterprises.map((e) => (
                  <tr key={e.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/admin/enterprises/${e.id}`} className="text-ink-2 hover:underline">{e.name}</Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{e.commune ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{e.rccm ?? '—'}</td>
                    <td className="px-3 py-2 text-right font-mono">{e._count.vehicles}</td>
                    <td className="px-3 py-2 text-right font-mono">{e._count.members}</td>
                  </tr>
                ))}
                {data.enterprises.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted">Aucune entreprise.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} entreprises · page {data.pagination.page}/{data.pagination.totalPages}</div>
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
