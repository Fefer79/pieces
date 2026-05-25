'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend)

interface Overview {
  totals: {
    users: number; vendors: number; enterprises: number; orders: number
    activeOrders: number; gmv: number; commissions: number
  }
  thisMonth: { orders: number; newUsers: number }
  revenueByMonth: { month: string; gmv: number; commissions: number; orders: number }[]
  topVendors: { vendorId: string; shopName: string; commissions: number; gmv: number; orderItems: number }[]
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
    </div>
  )
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Overview>('/admin/overview').then(setData).catch((e) => setError(e.message))
  }, [])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Tableau de bord</h1>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="GMV total" value={fmtFcfa(data.totals.gmv)} />
        <Kpi label="Commissions" value={fmtFcfa(data.totals.commissions)} />
        <Kpi label="Commandes actives" value={data.totals.activeOrders} />
        <Kpi label="Commandes ce mois" value={data.thisMonth.orders} />
        <Kpi label="Utilisateurs" value={data.totals.users} />
        <Kpi label="Vendeurs" value={data.totals.vendors} />
        <Kpi label="Entreprises" value={data.totals.enterprises} />
        <Kpi label="Nouveaux ce mois" value={data.thisMonth.newUsers} />
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Revenus 12 derniers mois</div>
        <Bar
          data={{
            labels: data.revenueByMonth.map((m) => m.month),
            datasets: [
              { label: 'GMV (FCFA)', data: data.revenueByMonth.map((m) => m.gmv), backgroundColor: '#002366' },
              { label: 'Commissions (FCFA)', data: data.revenueByMonth.map((m) => m.commissions), backgroundColor: '#ff6b00' },
            ],
          }}
          options={{
            responsive: true,
            plugins: { legend: { position: 'top' as const } },
            scales: { y: { beginAtZero: true } },
          }}
        />
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Top 5 vendeurs (commissions)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              <th className="py-1">Vendeur</th>
              <th className="py-1 text-right">Commissions</th>
              <th className="py-1 text-right">GMV</th>
              <th className="py-1 text-right">Articles vendus</th>
            </tr>
          </thead>
          <tbody>
            {data.topVendors.map((v) => (
              <tr key={v.vendorId} className="border-t border-border">
                <td className="py-2">
                  <Link href={`/admin/vendors/${v.vendorId}`} className="text-ink-2 hover:underline">{v.shopName}</Link>
                </td>
                <td className="py-2 text-right font-mono">{fmtFcfa(v.commissions)}</td>
                <td className="py-2 text-right font-mono">{fmtFcfa(v.gmv)}</td>
                <td className="py-2 text-right font-mono">{v.orderItems}</td>
              </tr>
            ))}
            {data.topVendors.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-center text-xs text-muted">Aucune commande terminée pour l&apos;instant.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
