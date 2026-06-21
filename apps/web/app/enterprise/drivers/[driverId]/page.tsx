'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { enterpriseFetch, getActiveEnterpriseId, type FleetVehicle } from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

type VehicleRef = { id: string; brand: string; model: string; plate: string | null }

interface DriverDetail {
  id: string
  name: string
  phone: string
  licenseNumber: string | null
  licenseCategory: string | null
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  notes: string | null
  userId: string | null
  activeAssignment: { vehicle: { id: string; brand: string; model: string; year: number; plate: string | null } } | null
  assignments: { id: string; startedAt: string; endedAt: string | null; vehicle: { id: string; brand: string; model: string; plate: string | null } }[]
  dailyRecords: { id: string; date: string; revenue: number; fuelCost: number; otherExpenses: number; kmDriven: number | null; notes: string | null; vehicle: VehicleRef | null }[]
  incidents: { id: string; type: string; severity: string; date: string; description: string | null; costEstimate: number | null; vehicle: VehicleRef | null }[]
}

interface Analytics {
  windowDays: number
  daysWorked: number
  totalRevenue: number
  netRevenue: number
  avgDailyRevenue: number
  totalKm: number
  revenuePerKm: number
  incidentCount: number
  partsSpend: number
  profit: number
}

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} F`
const INCIDENT_LABEL: Record<string, string> = {
  ACCIDENT: 'Accident', INFRACTION: 'Infraction', BREAKDOWN: 'Panne', COMPLAINT: 'Plainte', OTHER: 'Autre',
}
const SEVERITY_CLS: Record<string, string> = {
  LOW: 'bg-surface text-muted', MEDIUM: 'bg-warn-bg text-warn-fg', HIGH: 'bg-error-bg text-error-fg',
}

export default function DriverDetailPage() {
  const router = useRouter()
  const { driverId } = useParams<{ driverId: string }>()
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [driver, setDriver] = useState<DriverDetail | null>(null)
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showDaily, setShowDaily] = useState(false)
  const [showIncident, setShowIncident] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const [dRes, aRes, vRes] = await Promise.all([
      enterpriseFetch<DriverDetail>(`/${enterpriseId}/drivers/${driverId}`),
      enterpriseFetch<Analytics>(`/${enterpriseId}/drivers/${driverId}/analytics`),
      enterpriseFetch<FleetVehicle[]>(`/${enterpriseId}/vehicles`),
    ])
    if (!dRes.ok) { setError(dRes.message); return }
    setDriver(dRes.data)
    if (aRes.ok) setAnalytics(aRes.data)
    if (vRes.ok) setVehicles(vRes.data)
  }

  useEffect(() => { load() }, [enterpriseId, driverId])

  async function assign(vehicleId: string | null) {
    if (!enterpriseId) return
    const res = await enterpriseFetch(`/${enterpriseId}/drivers/${driverId}/assign`, {
      method: 'POST', body: JSON.stringify({ vehicleId }),
    })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  async function handleDelete() {
    if (!enterpriseId || !confirm('Supprimer ce chauffeur ?')) return
    const res = await enterpriseFetch(`/${enterpriseId}/drivers/${driverId}`, { method: 'DELETE' })
    if (!res.ok) { setError(res.message); return }
    router.push('/enterprise/drivers')
  }

  if (error && !driver) return <div className="p-8 text-sm text-red-600">{error}</div>
  if (!driver) return <div className="p-8 text-sm text-muted">Chargement…</div>

  return (
    <div className="p-6 lg:p-8">
      <Link href="/enterprise/drivers" className="text-sm text-muted hover:underline">← Chauffeurs</Link>

      <div className="mt-3 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{driver.name}</h1>
          <p className="mt-1 font-mono text-sm text-muted">{driver.phone}
            {driver.licenseCategory ? ` · Permis ${driver.licenseCategory}` : ''}
            {!driver.userId ? ' · compte non activé' : ''}
          </p>
        </div>
        <button onClick={handleDelete} className="flex-shrink-0 rounded-md border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
          Supprimer
        </button>
      </div>

      {error && <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</div>}

      {/* KPIs */}
      {analytics && (
        <div className="mb-6">
          <div className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Performance ({analytics.windowDays} derniers jours)
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <Kpi label="CA total" value={fmt(analytics.totalRevenue)} />
            <Kpi label="CA net" value={fmt(analytics.netRevenue)} />
            <Kpi label="CA / jour" value={fmt(analytics.avgDailyRevenue)} />
            <Kpi label="CA / km" value={analytics.revenuePerKm ? fmt(analytics.revenuePerKm) : '—'} />
            <Kpi label="Jours / km" value={`${analytics.daysWorked} j · ${analytics.totalKm.toLocaleString('fr-FR')} km`} />
            <Kpi label="Rentabilité" value={fmt(analytics.profit)} accent={analytics.profit >= 0 ? 'pos' : 'neg'} />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Rentabilité = CA − carburant − dépenses − pièces ({fmt(analytics.partsSpend)}) − incidents · {analytics.incidentCount} incident(s)
          </p>
        </div>
      )}

      {/* Affectation */}
      <Section title="Véhicule affecté">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={driver.activeAssignment?.vehicle.id ?? ''}
            onChange={(e) => assign(e.target.value || null)}
            className="rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
          >
            <option value="">— Non affecté —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.brand} {v.model} {v.plate ? `(${v.plate})` : ''}</option>
            ))}
          </select>
          {driver.activeAssignment && (
            <span className="text-sm text-muted">
              Actuel : <strong className="text-ink">{driver.activeAssignment.vehicle.brand} {driver.activeAssignment.vehicle.model}</strong>
            </span>
          )}
        </div>
      </Section>

      {/* Relevés journaliers */}
      <Section
        title="Relevés journaliers"
        action={<button onClick={() => setShowDaily(true)} className="text-sm font-semibold text-accent hover:underline">+ Ajouter</button>}
      >
        {driver.dailyRecords.length === 0 ? (
          <p className="text-sm text-muted">Aucun relevé. Le chauffeur peut saisir depuis son espace, ou ajoutez-en un ici.</p>
        ) : (
          <div className="rounded-md border border-border">
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Date</Th><Th>Véhicule</Th>
                  <Th align="right">CA</Th><Th align="right">Carburant</Th>
                  <Th align="right">Dépenses</Th><Th align="right">Km</Th>
                </Tr>
              </Thead>
              <Tbody>
                {driver.dailyRecords.map((r) => (
                  <Tr key={r.id}>
                    <Td className="tabular">{r.date.slice(0, 10)}</Td>
                    <Td className="text-muted">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : '—'}</Td>
                    <Td num className="text-ink">{fmt(r.revenue)}</Td>
                    <Td num className="text-muted">{fmt(r.fuelCost)}</Td>
                    <Td num className="text-muted">{fmt(r.otherExpenses)}</Td>
                    <Td num className="text-muted">{r.kmDriven ?? '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        )}
      </Section>

      {/* Incidents */}
      <Section
        title="Incidents & conduite"
        action={<button onClick={() => setShowIncident(true)} className="text-sm font-semibold text-accent hover:underline">+ Signaler</button>}
      >
        {driver.incidents.length === 0 ? (
          <p className="text-sm text-muted">Aucun incident enregistré.</p>
        ) : (
          <div className="space-y-2">
            {driver.incidents.map((i) => (
              <div key={i.id} className="rounded-md border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{INCIDENT_LABEL[i.type] ?? i.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] ${SEVERITY_CLS[i.severity] ?? ''}`}>{i.severity}</span>
                  </div>
                  <span className="font-mono text-xs text-muted">{i.date.slice(0, 10)}</span>
                </div>
                {i.description && <p className="mt-1 text-sm text-muted">{i.description}</p>}
                {i.costEstimate != null && <p className="mt-1 text-xs text-muted">Coût estimé : {fmt(i.costEstimate)}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {showDaily && enterpriseId && (
        <DailyModal enterpriseId={enterpriseId} driverId={driverId} onClose={() => setShowDaily(false)} onSaved={() => { setShowDaily(false); load() }} />
      )}
      {showIncident && enterpriseId && (
        <IncidentModal enterpriseId={enterpriseId} driverId={driverId} onClose={() => setShowIncident(false)} onSaved={() => { setShowIncident(false); load() }} />
      )}
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'pos' | 'neg' }) {
  const color = accent === 'pos' ? 'text-success-fg' : accent === 'neg' ? 'text-error-fg' : 'text-ink'
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <div className={`font-display text-xl ${color}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const labelCls = 'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
const inputCls = 'mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink'

function DailyModal({ enterpriseId, driverId, onClose, onSaved }: { enterpriseId: string; driverId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ date: todayISO(), revenue: '', fuelCost: '', otherExpenses: '', kmDriven: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    const payload: Record<string, unknown> = {
      date: form.date,
      revenue: Number(form.revenue) || 0,
      fuelCost: Number(form.fuelCost) || 0,
      otherExpenses: Number(form.otherExpenses) || 0,
    }
    if (form.kmDriven) payload.kmDriven = Number(form.kmDriven)
    const res = await enterpriseFetch(`/${enterpriseId}/drivers/${driverId}/daily`, { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (!res.ok) { setErr(res.message); return }
    onSaved()
  }

  return (
    <Modal title="Ajouter un relevé" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>CA (FCFA)</label><input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Carburant</label><input type="number" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Autres dépenses</label><input type="number" value={form.otherExpenses} onChange={(e) => setForm({ ...form, otherExpenses: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Km</label><input type="number" value={form.kmDriven} onChange={(e) => setForm({ ...form, kmDriven: e.target.value })} className={inputCls} /></div>
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <ModalActions saving={saving} onClose={onClose} label="Enregistrer" />
      </form>
    </Modal>
  )
}

function IncidentModal({ enterpriseId, driverId, onClose, onSaved }: { enterpriseId: string; driverId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ type: 'ACCIDENT', severity: 'LOW', date: todayISO(), description: '', costEstimate: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null)
    const payload: Record<string, unknown> = { type: form.type, severity: form.severity, date: form.date }
    if (form.description) payload.description = form.description
    if (form.costEstimate) payload.costEstimate = Number(form.costEstimate)
    const res = await enterpriseFetch(`/${enterpriseId}/drivers/${driverId}/incidents`, { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (!res.ok) { setErr(res.message); return }
    onSaved()
  }

  return (
    <Modal title="Signaler un incident" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
              {Object.entries(INCIDENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Gravité</label>
            <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })} className={inputCls}>
              <option value="LOW">Faible</option><option value="MEDIUM">Moyenne</option><option value="HIGH">Élevée</option>
            </select>
          </div>
          <div><label className={labelCls}>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} /></div>
          <div><label className={labelCls}>Coût estimé</label><input type="number" value={form.costEstimate} onChange={(e) => setForm({ ...form, costEstimate: e.target.value })} className={inputCls} /></div>
        </div>
        <div><label className={labelCls}>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <ModalActions saving={saving} onClose={onClose} label="Signaler" />
      </form>
    </Modal>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl text-ink">{title}</h2>
        {children}
      </div>
    </div>
  )
}

function ModalActions({ saving, onClose, label }: { saving: boolean; onClose: () => void; label: string }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:bg-surface">Annuler</button>
      <button type="submit" disabled={saving} className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">
        {saving ? '…' : label}
      </button>
    </div>
  )
}
