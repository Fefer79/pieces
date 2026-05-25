'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'

interface Detail {
  enterprise: {
    id: string; name: string; commune: string | null; address: string | null; rccm: string | null
    members: { id: string; role: string; joinedAt: string | null; user: { id: string; name: string | null; phone: string | null; email: string | null } }[]
    vehicles: { id: string; brand: string; model: string; year: number; plate: string | null; mileage: number | null }[]
  }
  orders: { id: string; status: string; totalAmount: number | null; createdAt: string }[]
}

export default function AdminEnterpriseDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Detail>(`/admin/enterprises/${id}/detail`).then(setData).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const e = data.enterprise
  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/enterprises" className="mb-3 inline-block text-sm text-ink-2 hover:underline">← Entreprises</Link>
      <h1 className="mb-1 font-display text-2xl text-ink">{e.name}</h1>
      <div className="mb-4 text-sm text-muted">{e.commune ?? ''} · RCCM : {e.rccm ?? '—'}</div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Membres ({e.members.length})</div>
          <table className="w-full text-sm">
            <tbody>
              {e.members.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="py-2">{m.user.name ?? '—'}</td>
                  <td className="py-2 text-xs">{m.user.phone ?? m.user.email ?? '—'}</td>
                  <td className="py-2 text-xs">{m.role}</td>
                </tr>
              ))}
              {e.members.length === 0 && <tr><td className="py-4 text-center text-xs text-muted">Aucun membre.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Parc auto ({e.vehicles.length})</div>
          <table className="w-full text-sm">
            <tbody>
              {e.vehicles.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="py-2">{v.brand} {v.model} ({v.year})</td>
                  <td className="py-2 text-xs font-mono">{v.plate ?? '—'}</td>
                  <td className="py-2 text-right text-xs font-mono">{v.mileage ? `${v.mileage.toLocaleString('fr-FR')} km` : '—'}</td>
                </tr>
              ))}
              {e.vehicles.length === 0 && <tr><td className="py-4 text-center text-xs text-muted">Aucun véhicule.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Commandes ({data.orders.length})</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="py-1">Date</th>
              <th className="py-1">Statut</th>
              <th className="py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="py-2 text-xs">{o.createdAt.slice(0, 10)}</td>
                <td className="py-2 text-xs">{o.status}</td>
                <td className="py-2 text-right font-mono">{fmtFcfa(o.totalAmount)}</td>
              </tr>
            ))}
            {data.orders.length === 0 && <tr><td colSpan={3} className="py-4 text-center text-xs text-muted">Aucune commande.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
