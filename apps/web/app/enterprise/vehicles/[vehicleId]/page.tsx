'use client'

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
  const [error, setError] = useState<string | null>(null)
  const [mileageInput, setMileageInput] = useState('')

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const res = await enterpriseFetch<VehicleDetail>(`/${enterpriseId}/vehicles/${vehicleId}`)
    if (!res.ok) { setError(res.message); return }
    setVehicle(res.data)
    setMileageInput(res.data.mileage != null ? String(res.data.mileage) : '')
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
