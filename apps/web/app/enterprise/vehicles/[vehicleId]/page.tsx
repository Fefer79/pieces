'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { enterpriseFetch, getActiveEnterpriseId, type FleetVehicle, type MaintenanceCenter } from '@/lib/enterprise-api'
import { setCartVehicle } from '@/lib/cart'
import { buildMaintenanceSearchHref } from 'shared/constants'

const DAY_LABEL: Record<number, string> = {
  0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi',
}

type VehicleDetail = FleetVehicle & {
  orders: {
    id: string
    status: string
    totalAmount: number
    paidAt: string | null
    createdAt: string
  }[]
}

type MaintenanceKind =
  | 'OIL_CHANGE'
  | 'OIL_FILTER'
  | 'AIR_FILTER'
  | 'FUEL_FILTER'
  | 'CABIN_FILTER'
  | 'BRAKE_PADS_FRONT'
  | 'BRAKE_PADS_REAR'
  | 'TIMING_BELT'
  | 'TIRES'
  | 'COOLANT'
  | 'TRANSMISSION_FLUID'
  | 'OTHER'

type ScheduleStatus = 'NEVER_DONE' | 'OK' | 'DUE_SOON' | 'OVERDUE'

interface MaintenanceSchedule {
  id: string
  vehicleId: string
  kind: MaintenanceKind
  label: string | null
  intervalKm: number
  warningKm: number
  lastDoneAtKm: number | null
  lastDoneAt: string | null
  enabled: boolean
  notes: string | null
  status: ScheduleStatus
  nextDueAtKm: number | null
  kmRemaining: number | null
}

const KIND_LABEL: Record<MaintenanceKind, string> = {
  OIL_CHANGE: 'Vidange moteur',
  OIL_FILTER: 'Filtre à huile',
  AIR_FILTER: 'Filtre à air',
  FUEL_FILTER: 'Filtre à carburant',
  CABIN_FILTER: "Filtre d'habitacle",
  BRAKE_PADS_FRONT: 'Plaquettes avant',
  BRAKE_PADS_REAR: 'Plaquettes arrière',
  TIMING_BELT: 'Courroie distribution',
  TIRES: 'Pneus',
  COOLANT: 'Liquide de refroidissement',
  TRANSMISSION_FLUID: 'Huile de boîte',
  OTHER: 'Autre',
}

const KIND_DEFAULT_INTERVAL_KM: Record<MaintenanceKind, number> = {
  OIL_CHANGE: 5000,
  OIL_FILTER: 5000,
  AIR_FILTER: 15000,
  FUEL_FILTER: 20000,
  CABIN_FILTER: 15000,
  BRAKE_PADS_FRONT: 30000,
  BRAKE_PADS_REAR: 60000,
  TIMING_BELT: 100000,
  TIRES: 50000,
  COOLANT: 60000,
  TRANSMISSION_FLUID: 60000,
  OTHER: 10000,
}

interface VehicleAnalytics {
  vehicleId: string
  totalSpend: number
  ytdSpend: number
  spendByMonth: { month: string; total: number }[]
  spendByCategory: { category: string; total: number }[]
  costPerKm: number | null
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
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([])
  const [newKind, setNewKind] = useState<MaintenanceKind>('OIL_CHANGE')
  const [newInterval, setNewInterval] = useState('5000')
  const [newLastDoneKm, setNewLastDoneKm] = useState('')
  const [centers, setCenters] = useState<MaintenanceCenter[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mileageInput, setMileageInput] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const [vRes, aRes, sRes, cRes] = await Promise.all([
      enterpriseFetch<VehicleDetail>(`/${enterpriseId}/vehicles/${vehicleId}`),
      enterpriseFetch<VehicleAnalytics>(`/${enterpriseId}/vehicles/${vehicleId}/analytics`),
      enterpriseFetch<MaintenanceSchedule[]>(`/${enterpriseId}/vehicles/${vehicleId}/schedules`),
      enterpriseFetch<MaintenanceCenter[]>(`/${enterpriseId}/centers`),
    ])
    if (!vRes.ok) { setError(vRes.message); return }
    setVehicle(vRes.data)
    setMileageInput(vRes.data.mileage != null ? String(vRes.data.mileage) : '')
    if (aRes.ok) setAnalytics(aRes.data)
    if (sRes.ok) setSchedules(sRes.data)
    if (cRes.ok) setCenters(cRes.data)
  }

  async function handleHomeCenterChange(centerId: string) {
    if (!enterpriseId) return
    const res = await enterpriseFetch(`/${enterpriseId}/vehicles/${vehicleId}/home-center`, {
      method: 'PATCH',
      body: JSON.stringify({ homeCenterId: centerId || null }),
    })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  async function handleCreateSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId) return
    const intervalKm = Number(newInterval)
    if (!intervalKm || intervalKm < 100) return
    const lastKm = newLastDoneKm ? Number(newLastDoneKm) : null
    const res = await enterpriseFetch(`/${enterpriseId}/vehicles/${vehicleId}/schedules`, {
      method: 'POST',
      body: JSON.stringify({
        kind: newKind,
        intervalKm,
        lastDoneAtKm: lastKm,
        lastDoneAt: lastKm != null ? new Date().toISOString() : null,
      }),
    })
    if (!res.ok) { setError(res.message); return }
    setNewInterval(String(KIND_DEFAULT_INTERVAL_KM[newKind]))
    setNewLastDoneKm('')
    load()
  }

  async function handleMarkDone(scheduleId: string) {
    if (!enterpriseId) return
    const res = await enterpriseFetch(
      `/${enterpriseId}/vehicles/${vehicleId}/schedules/${scheduleId}/done`,
      { method: 'POST', body: JSON.stringify({}) },
    )
    if (!res.ok) { setError(res.message); return }
    load()
  }

  function handleOrderPart(kind: string) {
    if (!vehicle) return
    setCartVehicle({
      vehicleId,
      label: `${vehicle.brand} ${vehicle.model} ${vehicle.year}`,
    })
    router.push(buildMaintenanceSearchHref(kind, vehicle))
  }

  async function handleDeleteSchedule(scheduleId: string) {
    if (!enterpriseId) return
    if (!confirm('Supprimer cet entretien programmé ?')) return
    const res = await enterpriseFetch(
      `/${enterpriseId}/vehicles/${vehicleId}/schedules/${scheduleId}`,
      { method: 'DELETE' },
    )
    if (!res.ok) { setError(res.message); return }
    load()
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
        <div className="flex flex-shrink-0 gap-2">
          <button
            onClick={() => setEditing(true)}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Modifier
          </button>
          <button
            onClick={handleDelete}
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
        </div>
      </div>

      {editing && enterpriseId && (
        <EditVehicleModal
          enterpriseId={enterpriseId}
          vehicleId={vehicleId}
          vehicle={vehicle}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); load() }}
        />
      )}

      {analytics && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi label="Dépense totale" value={`${analytics.totalSpend.toLocaleString('fr-FR')} F`} />
          <Kpi label="Année en cours" value={`${analytics.ytdSpend.toLocaleString('fr-FR')} F`} />
          <Kpi
            label="Coût / km"
            value={
              analytics.costPerKm != null
                ? `${analytics.costPerKm.toLocaleString('fr-FR')} F`
                : '—'
            }
            hint={analytics.costPerKm == null ? 'Renseignez le kilométrage' : undefined}
          />
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

      {analytics && analytics.spendByCategory.length > 0 && (
        <div className="mb-4 rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 font-display text-lg text-ink">Dépense par catégorie</h2>
          <CategoryBars data={analytics.spendByCategory} total={analytics.totalSpend} />
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

      <div className="mb-4 rounded-md border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Entretiens programmés</h2>
          <span className="font-mono text-[11px] text-muted">
            {schedules.length} {schedules.length > 1 ? 'planifiés' : 'planifié'}
          </span>
        </div>

        {schedules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/50">
                <tr className="text-left text-xs uppercase tracking-[0.06em] text-muted">
                  <th className="px-2 py-2 font-medium">Type</th>
                  <th className="px-2 py-2 font-medium text-right">Intervalle</th>
                  <th className="px-2 py-2 font-medium text-right">Dernier (km)</th>
                  <th className="px-2 py-2 font-medium text-right">Prochain (km)</th>
                  <th className="px-2 py-2 font-medium">Statut</th>
                  <th className="px-2 py-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="px-2 py-2 text-ink">{s.label ?? KIND_LABEL[s.kind]}</td>
                    <td className="px-2 py-2 text-right tabular text-muted">
                      {s.intervalKm.toLocaleString('fr-FR')} km
                    </td>
                    <td className="px-2 py-2 text-right tabular text-muted">
                      {s.lastDoneAtKm != null ? s.lastDoneAtKm.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-2 py-2 text-right tabular text-muted">
                      {s.nextDueAtKm != null ? s.nextDueAtKm.toLocaleString('fr-FR') : '—'}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={s.status} kmRemaining={s.kmRemaining} />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        onClick={() => handleOrderPart(s.kind)}
                        className="mr-1 rounded-sm border border-accent/40 bg-accent/5 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10"
                      >
                        🛒 Commander
                      </button>
                      <button
                        onClick={() => handleMarkDone(s.id)}
                        className="mr-1 rounded-sm border border-border px-2 py-1 text-[11px] text-ink hover:bg-surface"
                      >
                        ✓ Fait
                      </button>
                      <button
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="rounded-sm border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={handleCreateSchedule} className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">Type</label>
            <select
              value={newKind}
              onChange={(e) => {
                const k = e.target.value as MaintenanceKind
                setNewKind(k)
                setNewInterval(String(KIND_DEFAULT_INTERVAL_KM[k]))
              }}
              className="w-full rounded-sm border border-border bg-white px-2 py-2 text-sm"
            >
              {(Object.keys(KIND_LABEL) as MaintenanceKind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div className="w-32">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">Intervalle (km)</label>
            <input
              type="number"
              min="100"
              value={newInterval}
              onChange={(e) => setNewInterval(e.target.value)}
              className="w-full rounded-sm border border-border bg-white px-2 py-2 text-sm tabular"
            />
          </div>
          <div className="w-40">
            <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">Dernier fait à (km)</label>
            <input
              type="number"
              min="0"
              value={newLastDoneKm}
              onChange={(e) => setNewLastDoneKm(e.target.value)}
              placeholder="Optionnel"
              className="w-full rounded-sm border border-border bg-white px-2 py-2 text-sm tabular"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
          >
            + Ajouter
          </button>
        </form>
      </div>

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
            <Row
              label="Centre attitré"
              value={
                vehicle.homeCenter
                  ? `${vehicle.homeCenter.name}${
                      vehicle.homeCenter.deliveryDayOfWeek != null
                        ? ` · ${DAY_LABEL[vehicle.homeCenter.deliveryDayOfWeek]}`
                        : ''
                    }`
                  : '— Non assigné'
              }
            />
          </dl>

          {centers.length > 0 && (
            <div className="mt-4 border-t border-border pt-4">
              <label className="block font-mono text-[10px] uppercase tracking-[0.08em] text-muted mb-1">
                Changer le centre attitré
              </label>
              <select
                value={vehicle.homeCenterId ?? ''}
                onChange={(e) => handleHomeCenterChange(e.target.value)}
                className="w-full rounded-sm border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">— Aucun —</option>
                {centers.filter((c) => c.active).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.commune ? ` (${c.commune})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

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

function StatusBadge({ status, kmRemaining }: { status: ScheduleStatus; kmRemaining: number | null }) {
  if (status === 'OVERDUE') {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
        En retard{kmRemaining != null ? ` (${Math.abs(kmRemaining).toLocaleString('fr-FR')} km)` : ''}
      </span>
    )
  }
  if (status === 'DUE_SOON') {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        Bientôt due{kmRemaining != null ? ` (${kmRemaining.toLocaleString('fr-FR')} km)` : ''}
      </span>
    )
  }
  if (status === 'NEVER_DONE') {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
        Jamais fait
      </span>
    )
  }
  return (
    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
      À jour{kmRemaining != null ? ` (${kmRemaining.toLocaleString('fr-FR')} km)` : ''}
    </span>
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

function CategoryBars({
  data,
  total,
}: {
  data: { category: string; total: number }[]
  total: number
}) {
  const max = Math.max(...data.map((d) => d.total), 1)
  return (
    <div className="flex flex-col gap-2">
      {data.map((d) => {
        const w = Math.max(2, Math.round((d.total / max) * 100))
        const pct = total > 0 ? Math.round((d.total / total) * 100) : 0
        return (
          <div key={d.category} className="flex items-center gap-3">
            <span className="w-28 shrink-0 truncate text-xs text-ink" title={d.category}>
              {d.category}
            </span>
            <div className="h-4 flex-1 rounded-sm bg-surface/50">
              <div
                className="h-full rounded-sm bg-ink-2/70"
                style={{ width: `${w}%` }}
              />
            </div>
            <span className="w-28 shrink-0 text-right font-semibold tabular text-ink">
              {d.total.toLocaleString('fr-FR')} F
              <span className="ml-1 font-normal text-muted">({pct}%)</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

const USAGE_OPTIONS: { value: FleetVehicle['usageType']; label: string }[] = [
  { value: null, label: '—' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'CHANTIER', label: 'Chantier' },
  { value: 'LIVRAISON', label: 'Livraison' },
  { value: 'DIRECTION', label: 'Direction' },
  { value: 'AUTRE', label: 'Autre' },
]

function EditVehicleModal({
  enterpriseId,
  vehicleId,
  vehicle,
  onClose,
  onSaved,
}: {
  enterpriseId: string
  vehicleId: string
  vehicle: VehicleDetail
  onClose: () => void
  onSaved: () => void
}) {
  const [plate, setPlate] = useState(vehicle.plate ?? '')
  const [engine, setEngine] = useState(vehicle.engine ?? '')
  const [usageType, setUsageType] = useState<FleetVehicle['usageType']>(vehicle.usageType)
  const [groupName, setGroupName] = useState(vehicle.groupName ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    // PATCH partiel : on n'envoie que les champs descriptifs éditables ici.
    const payload: Record<string, unknown> = {
      plate: plate.trim() || undefined,
      engine: engine.trim() || undefined,
      groupName: groupName.trim() || undefined,
    }
    if (usageType) payload.usageType = usageType
    const res = await enterpriseFetch(`/${enterpriseId}/vehicles/${vehicleId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) { setErr(res.message); return }
    onSaved()
  }

  const labelCls = 'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
  const inputCls = 'mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-xl text-ink">Modifier le véhicule</h2>
        <p className="mb-4 text-sm text-muted">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className={labelCls}>Immatriculation</label>
            <input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Ex. 1234 AB 01"
              className={`${inputCls} uppercase`}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Motorisation</label>
              <input value={engine} onChange={(e) => setEngine(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Usage</label>
              <select
                value={usageType ?? ''}
                onChange={(e) => setUsageType((e.target.value || null) as FleetVehicle['usageType'])}
                className={inputCls}
              >
                {USAGE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value ?? ''}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Groupe</label>
            <input value={groupName} onChange={(e) => setGroupName(e.target.value)} className={inputCls} />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:bg-surface">Annuler</button>
            <button type="submit" disabled={saving} className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
