'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminFetch, downloadCsv } from '@/lib/admin-api'

interface Client {
  id: string
  name: string | null
  phone: string | null
  email: string | null
  roles: string[]
  createdAt: string
  _count: { initiatedOrders: number }
}
interface ListResponse {
  users: Client[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export default function AdminClientsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (role) params.set('role', role)
    params.set('page', String(page))
    adminFetch<ListResponse>(`/admin/clients/list?${params}`).then(setData).catch((e) => setError(e.message))
  }, [q, role, page])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-ink">Clients</h1>
        <button onClick={() => downloadCsv('clients')} className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card">Export CSV</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => { setPage(1); setQ(e.target.value) }}
          placeholder="Rechercher (nom, téléphone, email)"
          className="flex-1 min-w-[200px] rounded-sm border border-border-strong bg-card px-3 py-2 text-sm"
        />
        <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value) }} className="rounded-sm border border-border-strong bg-card px-3 py-2 text-sm">
          <option value="">Tous les rôles</option>
          <option value="MECHANIC">Mécanicien</option>
          <option value="OWNER">Propriétaire</option>
          <option value="SELLER">Vendeur</option>
          <option value="RIDER">Livreur</option>
          <option value="ENTERPRISE">Entreprise</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>
      {error && <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {!data ? <div className="text-sm text-muted">Chargement…</div> : (
        <>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                  <th className="px-3 py-2">Nom</th>
                  <th className="px-3 py-2">Téléphone</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rôles</th>
                  <th className="px-3 py-2 text-right">Commandes</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-3 py-2">
                      <Link href={`/admin/clients/${u.id}`} className="text-ink-2 hover:underline">{u.name ?? '(sans nom)'}</Link>
                    </td>
                    <td className="px-3 py-2 text-xs">{u.phone ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{u.email ?? '—'}</td>
                    <td className="px-3 py-2 text-xs">{u.roles.join(', ')}</td>
                    <td className="px-3 py-2 text-right font-mono">{u._count.initiatedOrders}</td>
                  </tr>
                ))}
                {data.users.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted">Aucun client.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <div>{data.pagination.total} clients · page {data.pagination.page}/{data.pagination.totalPages}</div>
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
