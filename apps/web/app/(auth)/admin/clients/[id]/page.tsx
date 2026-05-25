'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'

interface Detail {
  user: { id: string; name: string | null; phone: string | null; email: string | null; roles: string[]; activeContext: string | null; createdAt: string }
  orders: { id: string; status: string; totalAmount: number | null; createdAt: string; items: { id: string; name: string; priceSnapshot: number; quantity: number }[] }[]
  totals: { orderCount: number; totalSpent: number }
}

export default function AdminClientDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Detail>(`/admin/clients/${id}/detail`).then(setData).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/clients" className="mb-3 inline-block text-sm text-ink-2 hover:underline">← Clients</Link>
      <h1 className="mb-1 font-display text-2xl text-ink">{data.user.name ?? '(sans nom)'}</h1>
      <div className="mb-4 text-sm text-muted">Rôles : {data.user.roles.join(', ')} · Actif : {data.user.activeContext ?? '—'}</div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Contact</div>
          <div className="mt-2 text-sm">
            <div>{data.user.phone ?? '—'}</div>
            <div className="text-muted">{data.user.email ?? '—'}</div>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Commandes</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{data.totals.orderCount}</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Total dépensé</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{fmtFcfa(data.totals.totalSpent)}</div>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Commandes ({data.orders.length})</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="py-1">Date</th>
              <th className="py-1">Statut</th>
              <th className="py-1">Articles</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="py-2 text-xs">{o.createdAt.slice(0, 10)}</td>
                <td className="py-2 text-xs">{o.status}</td>
                <td className="py-2 text-xs">{o.items.length}</td>
                <td className="py-2 text-right font-mono">{fmtFcfa(o.totalAmount)}</td>
              </tr>
            ))}
            {data.orders.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-xs text-muted">Aucune commande.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
