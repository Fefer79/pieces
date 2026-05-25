'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Detail {
  vendor: {
    id: string; shopName: string; phone: string; status: string; commune: string | null; address: string | null
    user: { id: string; name: string | null; phone: string | null; email: string | null; createdAt: string } | null
    kyc: { kycType: string } | null
  }
  items: { id: string; name: string | null; price: number | null; commissionAmount: number | null; status: string; createdAt: string }[]
  transactions: { id: string; name: string; priceSnapshot: number; commissionAmount: number | null; quantity: number; createdAt: string; order: { id: string; status: string } }[]
  totals: { commissions: number; gmv: number; transactionCount: number }
  commissionByMonth: { month: string; commissions: number; gmv: number; orders: number }[]
}

export default function AdminVendorDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Detail>(`/admin/vendors/${id}/detail`).then(setData).catch((e) => setError(e.message))
  }, [id])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const v = data.vendor
  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/vendors" className="mb-3 inline-block text-sm text-ink-2 hover:underline">← Vendeurs</Link>
      <h1 className="mb-1 font-display text-2xl text-ink">{v.shopName}</h1>
      <div className="mb-4 text-sm text-muted">{v.status} · {v.commune ?? ''}</div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Contact</div>
          <div className="mt-2 text-sm">
            <div className="font-medium text-ink">{v.user?.name ?? '—'}</div>
            <div>{v.user?.phone ?? v.phone}</div>
            <div className="text-muted">{v.user?.email ?? ''}</div>
          </div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Commissions totales</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{fmtFcfa(data.totals.commissions)}</div>
          <div className="text-xs text-muted">sur {data.totals.transactionCount} articles vendus</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">GMV (chiffre d&apos;affaires)</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{fmtFcfa(data.totals.gmv)}</div>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Commissions par mois</div>
        <Bar
          data={{
            labels: data.commissionByMonth.map((m) => m.month),
            datasets: [{ label: 'Commissions (FCFA)', data: data.commissionByMonth.map((m) => m.commissions), backgroundColor: '#ff6b00' }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
        />
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Transactions ({data.transactions.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="py-1">Date</th>
                <th className="py-1">Article</th>
                <th className="py-1 text-right">Prix</th>
                <th className="py-1 text-right">Qté</th>
                <th className="py-1 text-right">Commission</th>
                <th className="py-1">Commande</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="py-2 text-xs">{t.createdAt.slice(0, 10)}</td>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2 text-right font-mono">{fmtFcfa(t.priceSnapshot)}</td>
                  <td className="py-2 text-right font-mono">{t.quantity}</td>
                  <td className="py-2 text-right font-mono">{fmtFcfa(t.commissionAmount)}</td>
                  <td className="py-2 text-xs">{t.order.status}</td>
                </tr>
              ))}
              {data.transactions.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-xs text-muted">Aucune transaction.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Articles catalogue ({data.items.length})</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                <th className="py-1">Nom</th>
                <th className="py-1 text-right">Prix</th>
                <th className="py-1 text-right">Commission</th>
                <th className="py-1">Statut</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id} className="border-t border-border">
                  <td className="py-2">{it.name ?? '—'}</td>
                  <td className="py-2 text-right font-mono">{fmtFcfa(it.price)}</td>
                  <td className="py-2 text-right font-mono">{fmtFcfa(it.commissionAmount)}</td>
                  <td className="py-2 text-xs">{it.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
