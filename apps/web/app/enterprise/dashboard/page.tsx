'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ABIDJAN_COMMUNES } from 'shared/constants/communes'
import { buildMaintenanceSearchHref } from 'shared/constants'
import { setCartVehicle } from '@/lib/cart'
import {
  enterpriseFetch,
  enterpriseDownload,
  getActiveEnterpriseId,
  setActiveEnterpriseId,
  type Enterprise,
  type DashboardData,
} from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const VendorMapPicker = dynamic(
  () => import('@/components/vendor-map-picker').then((m) => m.VendorMapPicker),
  { ssr: false, loading: () => <div className="h-[280px] rounded-md bg-surface" /> },
)

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

interface MaintenanceAlert {
  vehicleId: string
  brand: string
  model: string
  year: number
  plate: string | null
  mileage: number | null
  scheduleId: string
  kind: string
  label: string | null
  intervalKm: number
  nextDueAtKm: number | null
  kmRemaining: number | null
  status: 'OVERDUE' | 'DUE_SOON' | 'NEVER_DONE' | 'OK'
  estimatedDaysToDue: number | null
}

interface MaintenanceUpcoming {
  counts: { overdue: number; dueSoon: number; neverDone: number }
  alerts: MaintenanceAlert[]
}

const KIND_LABEL_FR: Record<string, string> = {
  OIL_CHANGE: 'Vidange',
  OIL_FILTER: 'Filtre huile',
  AIR_FILTER: 'Filtre air',
  FUEL_FILTER: 'Filtre carburant',
  CABIN_FILTER: "Filtre habitacle",
  BRAKE_PADS_FRONT: 'Plaquettes AV',
  BRAKE_PADS_REAR: 'Plaquettes AR',
  TIMING_BELT: 'Courroie distrib.',
  TIRES: 'Pneus',
  COOLANT: 'Liquide refroid.',
  TRANSMISSION_FLUID: 'Huile boîte',
  OTHER: 'Autre',
}

export default function EnterpriseDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [active, setActive] = useState<Enterprise | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [maintenance, setMaintenance] = useState<MaintenanceUpcoming | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ---- Load enterprises and pick active --------------------------------

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await enterpriseFetch<Enterprise[]>('/')
      if (cancelled) return
      if (!res.ok) {
        setError(res.message)
        setLoading(false)
        return
      }
      setEnterprises(res.data)
      const storedId = getActiveEnterpriseId()
      const picked = res.data.find((e) => e.id === storedId) ?? res.data[0] ?? null
      setActive(picked)
      if (picked) setActiveEnterpriseId(picked.id)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  // ---- Load dashboard data when active changes --------------------------

  useEffect(() => {
    if (!active) {
      setDashboard(null)
      return
    }
    let cancelled = false
    ;(async () => {
      const [dRes, mRes] = await Promise.all([
        enterpriseFetch<DashboardData>(`/${active.id}/dashboard`),
        enterpriseFetch<MaintenanceUpcoming>(`/${active.id}/maintenance/upcoming`),
      ])
      if (cancelled) return
      if (dRes.ok) setDashboard(dRes.data)
      else setError(dRes.message)
      if (mRes.ok) setMaintenance(mRes.data)
    })()
    return () => { cancelled = true }
  }, [active])

  async function handleExport() {
    if (!active) return
    const blob = await enterpriseDownload(`/${active.id}/orders/export.csv`)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pieces-commandes-${active.slug}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-8 text-sm text-muted">Chargement…</div>
  }

  if (enterprises.length === 0) {
    return <CreateEnterprisePrompt onCreated={(e) => {
      setEnterprises([e])
      setActive(e)
      setActiveEnterpriseId(e.id)
    }} />
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Tableau de bord</h1>
          {active && (
            <p className="mt-1 text-sm text-muted">{active.name}</p>
          )}
        </div>
        <button
          onClick={handleExport}
          disabled={!active || !dashboard}
          className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          Exporter (CSV)
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Véhicules" value={dashboard ? String(dashboard.vehiclesCount) : '—'} />
        <StatCard label="Membres" value={dashboard ? String(dashboard.membersCount) : '—'} />
        <StatCard label="Commandes actives" value={dashboard ? String(dashboard.activeOrders) : '—'} />
        <StatCard label="Dépenses du mois" value={dashboard ? formatFcfa(dashboard.monthlySpend) : '—'} />
      </div>

      {maintenance && (maintenance.counts.overdue + maintenance.counts.dueSoon + maintenance.counts.neverDone > 0) && (
        <div className="mb-8 rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <div>
              <h2 className="font-display text-lg text-ink">Entretiens à prévoir</h2>
              <p className="mt-1 text-xs text-muted">
                Alertes prédictives basées sur le kilométrage et les intervalles déclarés.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              {maintenance.counts.overdue > 0 && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                  {maintenance.counts.overdue} en retard
                </span>
              )}
              {maintenance.counts.dueSoon > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  {maintenance.counts.dueSoon} bientôt
                </span>
              )}
              {maintenance.counts.neverDone > 0 && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                  {maintenance.counts.neverDone} jamais fait
                </span>
              )}
            </div>
          </div>
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Véhicule</Th>
                <Th>Entretien</Th>
                <Th align="right">Reste</Th>
                <Th align="right">Estimation</Th>
                <Th>Statut</Th>
                <Th align="right">Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {maintenance.alerts.slice(0, 10).map((a) => {
                const badgeClass =
                  a.status === 'OVERDUE'
                    ? 'bg-red-100 text-red-700'
                    : a.status === 'DUE_SOON'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-600'
                const statusLabel =
                  a.status === 'OVERDUE' ? 'En retard' : a.status === 'DUE_SOON' ? 'Bientôt' : 'Jamais fait'
                return (
                  <Tr key={a.scheduleId}>
                    <Td className="text-ink">
                      <Link href={`/enterprise/vehicles/${a.vehicleId}`} className="font-semibold hover:underline">
                        {a.brand} {a.model} {a.year}
                      </Link>
                      {a.plate && <span className="ml-2 font-mono text-[10px] text-muted">{a.plate}</span>}
                    </Td>
                    <Td className="text-muted">
                      {a.label ?? KIND_LABEL_FR[a.kind] ?? a.kind}
                    </Td>
                    <Td num className="text-muted">
                      {a.kmRemaining != null
                        ? a.kmRemaining < 0
                          ? `−${Math.abs(a.kmRemaining).toLocaleString('fr-FR')} km`
                          : `${a.kmRemaining.toLocaleString('fr-FR')} km`
                        : '—'}
                    </Td>
                    <Td num className="text-muted">
                      {a.estimatedDaysToDue != null ? `~${a.estimatedDaysToDue} j` : '—'}
                    </Td>
                    <Td>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </Td>
                    <Td num>
                      <button
                        onClick={() => {
                          setCartVehicle({
                            vehicleId: a.vehicleId,
                            label: `${a.brand} ${a.model} ${a.year}`,
                          })
                          router.push(buildMaintenanceSearchHref(a.kind, a))
                        }}
                        className="rounded-sm border border-accent/40 bg-accent/5 px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/10"
                      >
                        🛒 Commander
                      </button>
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
          {maintenance.alerts.length > 10 && (
            <div className="border-t border-border px-6 py-3 text-xs text-muted">
              + {maintenance.alerts.length - 10} autres alertes
            </div>
          )}
        </div>
      )}

      {dashboard && dashboard.moneyPits.length > 0 && (
        <div className="mb-8 rounded-md border border-red-200 bg-red-50/40">
          <div className="flex items-center justify-between border-b border-red-200 px-6 py-4">
            <div>
              <h2 className="font-display text-lg text-ink">
                Véhicules « gouffres » détectés
              </h2>
              <p className="mt-1 text-xs text-muted">
                Coût au km au moins 1,5× supérieur à la médiane de la flotte
                {dashboard.medianCostPerKm != null && (
                  <> ({dashboard.medianCostPerKm.toLocaleString('fr-FR')} F/km)</>
                )}
                . À investiguer : véhicule fatigué ou conduite.
              </p>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 font-mono text-[11px] text-red-700">
              {dashboard.moneyPits.length} signalé{dashboard.moneyPits.length > 1 ? 's' : ''}
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-red-200 bg-red-50 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-red-700/80">
                <th className="px-6 py-3 text-left">Véhicule</th>
                <th className="px-6 py-3 text-right">Coût / km</th>
                <th className="px-6 py-3 text-right">vs médiane</th>
                <th className="px-6 py-3 text-right">Surcoût estimé</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.moneyPits.map((m) => (
                <tr key={m.vehicle.id} className="border-b border-red-200/60 last:border-0">
                  <td className="px-6 py-3 text-sm text-ink">
                    <Link href={`/enterprise/vehicles/${m.vehicle.id}`} className="hover:underline">
                      {m.vehicle.brand} {m.vehicle.model} {m.vehicle.year}
                    </Link>
                    {m.vehicle.plate && (
                      <span className="ml-2 font-mono text-[10px] text-muted">{m.vehicle.plate}</span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right text-sm tabular text-ink">
                    {m.costPerKm.toLocaleString('fr-FR')} F
                  </td>
                  <td className="px-6 py-3 text-right text-sm tabular font-medium text-red-700">
                    ×{m.multipleOfMedian.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-3 text-right text-sm tabular text-red-700">
                    {formatFcfa(m.excessSpend)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-md border border-border bg-card">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-display text-lg text-ink">Véhicules les plus coûteux</h2>
          <p className="mt-1 text-xs text-muted">Sur toute la période — top 5 par dépenses cumulées.</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
              <th className="px-6 py-3 text-left">Véhicule</th>
              <th className="px-6 py-3 text-left">Plaque</th>
              <th className="px-6 py-3 text-right">Total dépensé</th>
            </tr>
          </thead>
          <tbody>
            {!dashboard && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-muted">Chargement…</td></tr>
            )}
            {dashboard && dashboard.topVehiclesByCost.length === 0 && (
              <tr><td colSpan={3} className="px-6 py-8 text-center text-sm text-muted">Aucune commande payée pour le moment.</td></tr>
            )}
            {dashboard?.topVehiclesByCost.map((t, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-6 py-3 text-sm text-ink">
                  {t.vehicle ? (
                    <Link href={`/enterprise/vehicles/${t.vehicle.id}`} className="hover:underline">
                      {t.vehicle.brand} {t.vehicle.model} {t.vehicle.year}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-6 py-3 text-sm text-muted">{t.vehicle?.plate ?? '—'}</td>
                <td className="px-6 py-3 text-right text-sm font-medium tabular text-ink">
                  {formatFcfa(t.totalSpent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <p className="font-display text-2xl text-ink tabular">{value}</p>
      <p className="mt-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
    </div>
  )
}

function CreateEnterprisePrompt({ onCreated }: { onCreated: (e: Enterprise) => void }) {
  const [name, setName] = useState('')
  const [commune, setCommune] = useState('')
  const [address, setAddress] = useState('')
  const [rccm, setRccm] = useState('')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commune) { setError('La commune est requise.'); return }
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = { name, commune }
    if (address) payload.address = address
    if (rccm) payload.rccm = rccm
    if (coords) { payload.lat = coords.lat; payload.lng = coords.lng }

    const res = await enterpriseFetch<Enterprise>('/', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    onCreated(res.data)
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="font-display text-3xl text-ink">Créer mon entreprise</h1>
        <p className="mt-1 text-sm text-muted">Première étape pour gérer votre flotte.</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-md border border-border bg-card p-6">
        <div>
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Nom de l'entreprise *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
            placeholder="Ex. Transports Yopougon SARL"
          />
        </div>

        <div>
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Commune *
          </label>
          <select
            required
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">— Choisissez —</option>
            {ABIDJAN_COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Adresse précise <span className="text-muted/60">(facultatif)</span>
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Quartier, rue, repère…"
            className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="text-sm font-medium text-ink-2 hover:underline"
          >
            {showMap ? '− Masquer la carte' : '+ Préciser la position sur la carte'}
          </button>
          {coords && !showMap && (
            <p className="mt-1 text-xs text-muted tabular">
              Position : {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </p>
          )}
          {showMap && (
            <div className="mt-2">
              <VendorMapPicker
                lat={coords?.lat ?? null}
                lng={coords?.lng ?? null}
                onChange={setCoords}
                height={280}
              />
              <p className="mt-1 text-xs text-muted">
                Cliquez sur la carte pour placer un repère exact.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            RCCM <span className="text-muted/60">(facultatif)</span>
          </label>
          <input
            type="text"
            value={rccm}
            onChange={(e) => setRccm(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
          />
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
        >
          {submitting ? 'Création…' : 'Créer l\'entreprise'}
        </button>
      </form>
    </div>
  )
}
