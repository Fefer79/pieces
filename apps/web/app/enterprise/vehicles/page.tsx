'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  enterpriseFetch,
  getActiveEnterpriseId,
  type FleetVehicle,
} from '@/lib/enterprise-api'

const USAGE_LABEL: Record<NonNullable<FleetVehicle['usageType']>, string> = {
  TRANSPORT: 'Transport',
  CHANTIER: 'Chantier',
  LIVRAISON: 'Livraison',
  DIRECTION: 'Direction',
  AUTRE: 'Autre',
}

export default function EnterpriseVehiclesPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [filterGroup, setFilterGroup] = useState<string>('')
  const [filterUsage, setFilterUsage] = useState<string>('')

  useEffect(() => {
    setEnterpriseId(getActiveEnterpriseId())
  }, [])

  async function loadVehicles(id: string) {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterGroup) params.set('groupName', filterGroup)
    if (filterUsage) params.set('usageType', filterUsage)
    const qs = params.toString()
    const res = await enterpriseFetch<FleetVehicle[]>(`/${id}/vehicles${qs ? `?${qs}` : ''}`)
    setLoading(false)
    if (!res.ok) { setError(res.message); return }
    setVehicles(res.data)
  }

  useEffect(() => {
    if (enterpriseId) loadVehicles(enterpriseId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterpriseId, filterGroup, filterUsage])

  if (!enterpriseId) {
    return (
      <div className="p-8 text-sm text-muted">
        Sélectionnez ou créez d'abord une entreprise depuis le{' '}
        <Link className="underline" href="/enterprise/dashboard">tableau de bord</Link>.
      </div>
    )
  }

  const uniqueGroups = Array.from(new Set(vehicles.map((v) => v.groupName).filter(Boolean))) as string[]

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Véhicules</h1>
          <p className="mt-1 text-sm text-muted">{vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} dans la flotte.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/enterprise/vehicles/import"
            className="rounded-md border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Importer CSV
          </Link>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
          >
            Ajouter
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="rounded-sm border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous les groupes</option>
          {uniqueGroups.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={filterUsage}
          onChange={(e) => setFilterUsage(e.target.value)}
          className="rounded-sm border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="">Tous les usages</option>
          {Object.entries(USAGE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="overflow-hidden rounded-md border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
              <th className="px-6 py-3 text-left">Véhicule</th>
              <th className="px-6 py-3 text-left">Plaque</th>
              <th className="px-6 py-3 text-left">Usage</th>
              <th className="px-6 py-3 text-left">Groupe</th>
              <th className="px-6 py-3 text-right">Kilométrage</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-6 py-8 text-center text-sm text-muted">Chargement…</td></tr>}
            {!loading && vehicles.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted">Aucun véhicule. Ajoutez-en un ou importez un CSV.</td></tr>
            )}
            {vehicles.map((v) => (
              <tr key={v.id} className="border-b border-border last:border-0 hover:bg-surface">
                <td className="px-6 py-3 text-sm text-ink">
                  <Link href={`/enterprise/vehicles/${v.id}`} className="hover:underline">
                    {v.brand} {v.model} {v.year}
                  </Link>
                </td>
                <td className="px-6 py-3 text-sm text-muted tabular">{v.plate ?? '—'}</td>
                <td className="px-6 py-3 text-sm text-muted">
                  {v.usageType ? USAGE_LABEL[v.usageType] : '—'}
                </td>
                <td className="px-6 py-3 text-sm text-muted">{v.groupName ?? '—'}</td>
                <td className="px-6 py-3 text-right text-sm text-muted tabular">
                  {v.mileage != null ? `${v.mileage.toLocaleString('fr-FR')} km` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateVehicleModal
          enterpriseId={enterpriseId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadVehicles(enterpriseId)
          }}
        />
      )}
    </div>
  )
}

function CreateVehicleModal({
  enterpriseId,
  onClose,
  onCreated,
}: { enterpriseId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    brand: '', model: '', year: new Date().getFullYear(),
    plate: '', vin: '', engine: '', mileage: '',
    usageType: '', groupName: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = {
      brand: form.brand,
      model: form.model,
      year: Number(form.year),
    }
    if (form.plate) payload.plate = form.plate
    if (form.vin) payload.vin = form.vin
    if (form.engine) payload.engine = form.engine
    if (form.mileage) payload.mileage = Number(form.mileage)
    if (form.usageType) payload.usageType = form.usageType
    if (form.groupName) payload.groupName = form.groupName

    const res = await enterpriseFetch(`/${enterpriseId}/vehicles`, {
      method: 'POST', body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 font-display text-xl text-ink">Ajouter un véhicule</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Marque *" value={form.brand} onChange={(v) => setForm({ ...form, brand: v })} required />
            <Field label="Modèle *" value={form.model} onChange={(v) => setForm({ ...form, model: v })} required />
            <Field label="Année *" type="number" value={String(form.year)} onChange={(v) => setForm({ ...form, year: Number(v) })} required />
            <Field label="Plaque" value={form.plate} onChange={(v) => setForm({ ...form, plate: v })} />
            <Field label="VIN" value={form.vin} onChange={(v) => setForm({ ...form, vin: v.toUpperCase() })} />
            <Field label="Motorisation" value={form.engine} onChange={(v) => setForm({ ...form, engine: v })} />
            <Field label="Kilométrage" type="number" value={form.mileage} onChange={(v) => setForm({ ...form, mileage: v })} />
            <div>
              <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Usage</label>
              <select
                value={form.usageType}
                onChange={(e) => setForm({ ...form, usageType: e.target.value })}
                className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm"
              >
                <option value="">—</option>
                <option value="TRANSPORT">Transport</option>
                <option value="CHANTIER">Chantier</option>
                <option value="LIVRAISON">Livraison</option>
                <option value="DIRECTION">Direction</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
            <Field label="Groupe" value={form.groupName} onChange={(v) => setForm({ ...form, groupName: v })} />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:bg-surface">Annuler</button>
            <button type="submit" disabled={submitting} className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label, value, onChange, type = 'text', required = false,
}: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
      />
    </div>
  )
}
