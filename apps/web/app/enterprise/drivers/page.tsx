'use client'
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'

type ActiveAssignment = {
  id: string
  startedAt: string
  vehicle: { id: string; brand: string; model: string; year: number; plate: string | null }
} | null

export type Driver = {
  id: string
  name: string
  phone: string
  status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'
  licenseNumber: string | null
  licenseCategory: string | null
  userId: string | null
  activeAssignment: ActiveAssignment
}

const STATUS_LABEL: Record<Driver['status'], { label: string; cls: string }> = {
  ACTIVE: { label: 'Actif', cls: 'bg-success-bg text-success-fg' },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-warn-bg text-warn-fg' },
  INACTIVE: { label: 'Inactif', cls: 'bg-surface text-muted' },
}

export default function DriversPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const res = await enterpriseFetch<Driver[]>(`/${enterpriseId}/drivers`)
    setLoading(false)
    if (!res.ok) { setError(res.message); return }
    setDrivers(res.data)
  }

  useEffect(() => { load() }, [enterpriseId])

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">Chauffeurs</h1>
          <p className="mt-1 text-sm text-muted">Onboarding, affectation et performance de vos chauffeurs.</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          <Link
            href="/enterprise/drivers/import"
            className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
          >
            Importer
          </Link>
          <button
            onClick={() => setCreating(true)}
            className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink"
          >
            + Onboarder
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-md bg-error-bg p-3 text-sm text-error-fg">{error}</div>}
      {loading && <p className="text-sm text-muted">Chargement…</p>}

      {!loading && drivers.length === 0 && (
        <div className="rounded-md border border-dashed border-border-strong bg-card/40 p-8 text-center">
          <p className="text-sm font-medium text-ink">Aucun chauffeur</p>
          <p className="mt-1 text-xs text-muted">Onboardez un chauffeur pour suivre son CA et sa conduite.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {drivers.map((d) => {
          const st = STATUS_LABEL[d.status]
          return (
            <Link
              key={d.id}
              href={`/enterprise/drivers/${d.id}`}
              className="block rounded-md border border-border bg-card p-4 hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-lg text-ink">{d.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.label}</span>
                    {!d.userId && (
                      <span className="rounded-full bg-occasion-bg px-2 py-0.5 text-[11px] font-medium text-occasion-fg">
                        Compte non activé
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-mono text-xs text-muted">{d.phone}</p>
                </div>
                <div className="flex-shrink-0 text-right text-xs text-muted">
                  {d.activeAssignment ? (
                    <>
                      <div className="font-medium text-ink">
                        {d.activeAssignment.vehicle.brand} {d.activeAssignment.vehicle.model}
                      </div>
                      <div className="tabular">{d.activeAssignment.vehicle.plate ?? '—'}</div>
                    </>
                  ) : (
                    <span className="text-muted-2">Non affecté</span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {creating && enterpriseId && (
        <OnboardModal
          enterpriseId={enterpriseId}
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); load() }}
        />
      )}
    </div>
  )
}

function OnboardModal({
  enterpriseId, onClose, onCreated,
}: { enterpriseId: string; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', phone: '+225', licenseNumber: '', licenseCategory: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload: Record<string, unknown> = { name: form.name, phone: form.phone }
    if (form.licenseNumber) payload.licenseNumber = form.licenseNumber
    if (form.licenseCategory) payload.licenseCategory = form.licenseCategory
    if (form.notes) payload.notes = form.notes
    const res = await enterpriseFetch(`/${enterpriseId}/drivers`, { method: 'POST', body: JSON.stringify(payload) })
    setSaving(false)
    if (!res.ok) { setErr(res.message); return }
    onCreated()
  }

  const labelCls = 'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
  const inputCls = 'mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-md bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 font-display text-xl text-ink">Onboarder un chauffeur</h2>
        <p className="mb-4 text-sm text-muted">
          Le chauffeur active son compte en se connectant avec ce numéro (OTP).
        </p>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className={labelCls}>Nom complet *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Ex. Koffi Yao" />
          </div>
          <div>
            <label className={labelCls}>Téléphone * (+225…)</label>
            <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d+]/g, '') })} className={`${inputCls} font-mono`} placeholder="+2250700000000" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>N° permis</label>
              <input value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Catégorie</label>
              <input value={form.licenseCategory} onChange={(e) => setForm({ ...form, licenseCategory: e.target.value })} className={inputCls} placeholder="B, C…" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted hover:bg-surface">Annuler</button>
            <button type="submit" disabled={saving} className="rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50">
              {saving ? 'Création…' : 'Onboarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
