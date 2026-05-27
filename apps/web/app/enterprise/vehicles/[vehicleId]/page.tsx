'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { enterpriseFetch, getActiveEnterpriseId, type FleetVehicle } from '@/lib/enterprise-api'

type VehicleDetail = FleetVehicle & {
  orders: {
    id: string
    status: string
    totalAmount: number
    paidAt: string | null
    createdAt: string
  }[]
}

interface VehicleAnalytics {
  vehicleId: string
  totalSpend: number
  ytdSpend: number
  spendByMonth: { month: string; total: number }[]
  items: {
    id: string
    orderId: string
    orderPaidAt: string | null
    name: string
    category: string | null
    priceSnapshot: number
    quantity: number
    lineTotal: number
    vendorShopName: string
  }[]
  peerCount: number
  avgSpendForSimilar: number | null
  outlierFlag: boolean
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PENDING_PAYMENT: 'En attente',
  PAID: 'Payée',
  VENDOR_CONFIRMED: 'Confirmée',
  DISPATCHED: 'Expédiée',
  IN_TRANSIT: 'En transit',
  DELIVERED: 'Livrée',
  CONFIRMED: 'Confirmée',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
}

export default function VehicleDetailPage() {
  const router = useRouter()
  const params = useParams<{ vehicleId: string }>()
  const vehicleId = params.vehicleId

  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null)
  const [analytics, setAnalytics] = useState<VehicleAnalytics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mileageInput, setMileageInput] = useState('')

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const [vRes, aRes] = await Promise.all([
      enterpriseFetch<VehicleDetail>(`/${enterpriseId}/vehicles/${vehicleId}`),
      enterpriseFetch<VehicleAnalytics>(`/${enterpriseId}/vehicles/${vehicleId}/analytics`),
    ])
    if (!vRes.ok) { setError(vRes.message); return }
    setVehicle(vRes.data)
    setMileageInput(vRes.data.mileage != null ? String(vRes.data.mileage) : '')
    if (aRes.ok) setAnalytics(aRes.data)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [enterpriseId, vehicleId])

  async function handleMileageSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || !mileageInput) return
    const res = await enterpriseFetch(`/${enterpriseId}/vehicles/${vehicleId}/mileage`, {
      method: 'PATCH',
      body: JSON.stringify({ mileage: Number(mileageInput) }),
    })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  async function handleDelete() {
    if (!enterpriseId) return
    if (!confirm('Supprimer ce véhicule ?')) return
    const res = await enterpriseFetch(`/${enterpriseId}/vehicles/${vehicleId}`, { method: 'DELETE' })
    if (!res.ok) { setError(res.message); return }
    router.push('/enterprise/vehicles')
  }

  if (error) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!vehicle) return <div className="p-8 text-sm text-muted">Chargement…</div>

  const totalSpent = vehicle.orders
    .filter((o) => o.paidAt)
    .reduce((sum, o) => sum + o.totalAmount, 0)

  return (
    <div className="p-6 lg:p-8">
      <Link href="/enterprise/vehicles" className="text-sm text-muted hover:underline">← Véhicules</Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">
            {vehicle.brand} {vehicle.model} <span className="text-muted">{vehicle.year}</span>
          </h1>
          <p className="mt-1 text-sm text-muted tabular">{vehicle.plate ?? 'Sans plaque'}</p>
        </div>
        <button
          onClick={handleDelete}
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>

      {analytics && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Dépense totale" value={`${analytics.totalSpend.toLocaleString('fr-FR')} F`} />
          <Kpi label="Année en cours" value={`${analytics.ytdSpend.toLocaleString('fr-FR')} F`} />
          <Kpi
            label="Moyenne flotte similaire"
            value={
              analytics.avgSpendForSimilar != null
                ? `${analytics.avgSpendForSimilar.toLocaleString('fr-FR')} F`
                : `— (${analytics.peerCount} pairs)`
            }
            hint={
              analytics.peerCount < 3
                ? 'Pas assez de pairs (min. 3)'
                : `Basé sur ${analytics.peerCount} véhicules`
            }
          />
          <div
            className={`rounded-md border p-3 ${
              analytics.outlierFlag
                ? 'border-red-300 bg-red-50'
                : 'border-border bg-card'
            }`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              Statut
            </div>
            <div className={`mt-1 text-sm font-semibold ${analytics.outlierFlag ? 'text-red-700' : 'text-ink'}`}>
              {analytics.outlierFlag ? '🚨 Coût élevé' : '✓ Dans la moyenne'}
            </div>
            {analytics.outlierFlag && analytics.avgSpendForSimilar != null && (
              <div className="mt-1 text-[11px] text-red-700">
                {Math.round((analytics.totalSpend / analytics.avgSpendForSimilar) * 100) / 100}× la moyenne
              </div>
            )}
          </div>
        </div>
      )}

      {analytics && analytics.spendByMonth.some((m) => m.total > 0) && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg text-ink">Dépense par mois (12 mois)</h2>
          <MonthlyBars data={analytics.spendByMonth} />
        </div>
      )}

      {analytics && analytics.items.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg text-ink">Pièces achetées ({analytics.items.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/50">
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2 font-medium">Date</th>
                  <th className="px-2 py-2 font-medium">Pièce</th>
                  <th className="px-2 py-2 font-medium">Catégorie</th>
                  <th className="px-2 py-2 font-medium">Fournisseur</th>
                  <th className="px-2 py-2 font-medium text-right">Qté</th>
                  <th className="px-2 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {analytics.items.map((it) => (
                  <tr key={it.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono text-[11px] text-muted">
                      {it.orderPaidAt ? new Date(it.orderPaidAt).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-2 py-2 text-ink">{it.name}</td>
                    <td className="px-2 py-2 text-muted">{it.category ?? '—'}</td>
                    <td className="px-2 py-2 text-muted">{it.vendorShopName}</td>
                    <td className="px-2 py-2 text-right tabular">{it.quantity}</td>
                    <td className="px-2 py-2 text-right font-semibold tabular text-ink">
                      {it.lineTotal.toLocaleString('fr-FR')} F
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Info card */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Informations</h2>
          <dl className="space-y-2 text-sm">
            <Row label="VIN" value={vehicle.vin ?? '—'} />
            <Row label="Motorisation" value={vehicle.engine ?? '—'} />
            <Row label="Usage" value={vehicle.usageType ?? '—'} />
            <Row label="Groupe" value={vehicle.groupName ?? '—'} />
            <Row label="Kilométrage" value={vehicle.mileage != null ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '—'} />
            <Row label="MAJ km" value={vehicle.mileageUpdatedAt ? new Date(vehicle.mileageUpdatedAt).toLocaleDateString('fr-FR') : '—'} />
          </dl>

          <form onSubmit={handleMileageSubmit} className="mt-5 flex gap-2 border-t border-border pt-4">
            <input
              type="number"
              min="0"
              value={mileageInput}
              onChange={(e) => setMileageInput(e.target.value)}
              placeholder="Mettre à jour le km"
              className="flex-1 rounded-sm border border-border bg-white px-3 py-2 text-sm tabular"
            />
            <button type="submit" className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink">
              MAJ
            </button>
          </form>
        </div>

        {/* History card */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="mb-1 font-display text-lg text-ink">Historique des commandes</h2>
          <p className="mb-4 text-xs text-muted">
            Total dépensé : <span className="font-semibold text-ink tabular">{totalSpent.toLocaleString('fr-FR')} FCFA</span>
          </p>
          {vehicle.orders.length === 0 && <p className="text-sm text-muted">Aucune commande liée.</p>}
          <ul className="space-y-2">
            {vehicle.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <div>
                  <p className="text-sm text-ink">{STATUS_LABEL[o.status] ?? o.status}</p>
                  <p className="font-mono text-[11px] text-muted">
                    {new Date(o.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular text-ink">
                  {o.totalAmount.toLocaleString('fr-FR')} FCFA
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-1.5 last:border-0">
      <dt className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  )
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink tabular">{value}</div>
      {hint && <div className="mt-1 text-[11px] text-muted">{hint}</div>}
    </div>
  )
}

function MonthlyBars({ data }: { data: { month: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d) => {
        const h = max > 0 ? Math.max(2, Math.round((d.total / max) * 100)) : 2
        const label = d.month.slice(5) + '/' + d.month.slice(2, 4)
        return (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <div
              title={`${d.month} : ${d.total.toLocaleString('fr-FR')} F`}
              className="w-full rounded-sm bg-ink-2/70"
              style={{ height: `${h}%` }}
            />
            <span className="font-mono text-[9px] text-muted">{label}</span>
          </div>
        )
      })}
    </div>
  )
}
