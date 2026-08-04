'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { ErpShell } from '@/components/erp/erp-shell'
import { useErp } from '@/components/erp/erp-context'
import { erpFetch, fmtFcfa, fmtFcfaCompact, type ErpCockpit } from '@/lib/erp-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

// Cockpit de la console.
//
// Les chiffres viennent de `getAdminOverview()`, exactement ceux du tableau de
// bord /admin : deux écrans qui compteraient différemment feraient perdre
// confiance aux deux. La note de méthode sous les tuiles dit d'où ils sortent —
// principe « ne rien inventer » de la réorganisation.

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint && <div className="mt-0.5 text-[12px] text-muted">{hint}</div>}
    </div>
  )
}

export default function ErpCockpitPage() {
  const me = useErp()
  const [data, setData] = useState<ErpCockpit | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await erpFetch<ErpCockpit>('/cockpit')
      if (cancelled) return
      if (res.ok) setData(res.data)
      else setError(res.message)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ErpShell me={me} eyebrow="Pilotage" title="Cockpit">
      {error && (
        <div className="mb-4 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      {!data ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="GMV total" value={fmtFcfaCompact(data.totals.gmv)} hint="Commandes terminées" />
            <Kpi
              label="Commissions"
              value={fmtFcfaCompact(data.totals.commissions)}
              hint="Le revenu de Pièces"
            />
            <Kpi label="Commandes actives" value={data.totals.activeOrders} hint="Ni terminées ni annulées" />
            <Kpi label="Commandes ce mois" value={data.thisMonth.orders} />
            <Kpi label="Utilisateurs" value={data.totals.users.toLocaleString('fr-FR')} />
            <Kpi label="Vendeurs" value={data.totals.vendors.toLocaleString('fr-FR')} />
            <Kpi label="Entreprises" value={data.totals.enterprises.toLocaleString('fr-FR')} />
            <Kpi label="Nouveaux ce mois" value={data.thisMonth.newUsers} />
          </div>

          <p className="mt-3 text-[12px] leading-snug text-muted">
            Méthode : seules les commandes au statut « Terminée » entrent dans le GMV et les
            commissions ; la période d’une commande est sa date de création. Le GMV est le total
            payé par les clients — le revenu de Pièces est la ligne « Commissions ».
          </p>

          <div className="mt-6 rounded-md border border-border bg-card p-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Revenus — 12 derniers mois
            </div>
            <div className="h-[260px]">
              <Bar
                data={{
                  labels: data.revenueByMonth.map((m) => m.month),
                  datasets: [
                    {
                      label: 'GMV',
                      data: data.revenueByMonth.map((m) => m.gmv),
                      backgroundColor: '#002366',
                      borderRadius: 4,
                    },
                    {
                      label: 'Commissions',
                      data: data.revenueByMonth.map((m) => m.commissions),
                      backgroundColor: '#FF6B00',
                      borderRadius: 4,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'top' as const },
                    tooltip: { callbacks: { label: (c) => fmtFcfa(c.parsed.y) } },
                  },
                  scales: {
                    x: { grid: { display: false } },
                    y: {
                      beginAtZero: true,
                      ticks: { callback: (v) => fmtFcfaCompact(Number(v)), font: { size: 10 } },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-card p-4">
            <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Top 5 vendeurs (commissions)
            </div>
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
                      Aucune commande terminée pour l’instant.
                    </Td>
                  </Tr>
                )}
              </Tbody>
            </Table>
          </div>
        </>
      )}
    </ErpShell>
  )
}
