'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { ChartCard } from '@/components/ui/chart-card'
import { Cockpit, type CockpitData } from './_cockpit'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
)

interface Overview {
  totals: {
    users: number
    vendors: number
    enterprises: number
    orders: number
    activeOrders: number
    gmv: number
    commissions: number
  }
  thisMonth: { orders: number; newUsers: number }
  revenueByMonth: { month: string; gmv: number; commissions: number; orders: number }[]
  topVendors: {
    vendorId: string
    shopName: string
    commissions: number
    gmv: number
    orderItems: number
  }[]
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
  const [cockpit, setCockpit] = useState<CockpitData | null>(null)
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<CockpitData>('/admin/cockpit?months=6')
      .then(setCockpit)
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => {
    // Les statistiques marketplace détaillées demandent `erp:admin` : un membre
    // de l'équipe sans ce droit garde le cockpit et perd ce bloc, plutôt que
    // de tomber sur une page en erreur.
    adminFetch<Overview>('/admin/overview')
      .then(setData)
      .catch(() => setData(null))
  }, [])

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!cockpit) return <div className="p-6 text-sm text-muted">Chargement…</div>

  return (
    <div className="p-4 lg:p-6">
      <h1 className="mb-4 font-display text-2xl text-ink">Tableau de bord</h1>

      <Cockpit data={cockpit} />

      {!data ? null : (
        <>
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

          <ChartCard title="Revenus 12 derniers mois" className="mb-6">
            <Bar
              data={{
                labels: data.revenueByMonth.map((m) => m.month),
                datasets: [
                  {
                    label: 'GMV (FCFA)',
                    data: data.revenueByMonth.map((m) => m.gmv),
                    backgroundColor: '#002366',
                  },
                  {
                    label: 'Commissions (FCFA)',
                    data: data.revenueByMonth.map((m) => m.commissions),
                    backgroundColor: '#ff6b00',
                  },
                ],
              }}
              options={{
                responsive: true,
                plugins: { legend: { position: 'top' as const } },
                scales: { y: { beginAtZero: true } },
              }}
            />
          </ChartCard>

          <ChartCard title="Top 5 vendeurs (commissions)">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Vendeur</Th>
                  <Th align="right">Commissions</Th>
                  <Th align="right">GMV</Th>
                  <Th align="right">Articles vendus</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.topVendors.map((v) => (
                  <Tr key={v.vendorId}>
                    <Td>
                      <Link
                        href={`/admin/vendors/${v.vendorId}`}
                        className="font-semibold text-ink-2 hover:underline"
                      >
                        {v.shopName}
                      </Link>
                    </Td>
                    <Td num>{fmtFcfa(v.commissions)}</Td>
                    <Td num>{fmtFcfa(v.gmv)}</Td>
                    <Td num>{v.orderItems}</Td>
                  </Tr>
                ))}
                {data.topVendors.length === 0 && (
                  <Tr hover={false}>
                    <Td colSpan={4} align="center" className="py-6 text-muted">
                      Aucune commande terminée pour l&apos;instant.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </ChartCard>
        </>
      )}
    </div>
  )
}
