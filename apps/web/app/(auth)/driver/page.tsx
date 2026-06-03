'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

interface DriverProfile {
  id: string
  name: string
  enterprise: { id: string; name: string } | null
  activeAssignment: { vehicle: { id: string; brand: string; model: string; year: number; plate: string | null } } | null
  todayRecord: { revenue: number; fuelCost: number; otherExpenses: number; kmDriven: number | null } | null
}

interface DailyRecord {
  id: string
  date: string
  revenue: number
  fuelCost: number
  otherExpenses: number
  kmDriven: number | null
  vehicle: { brand: string; model: string; plate: string | null } | null
}

const fmt = (n: number) => `${n.toLocaleString('fr-FR')} F`
const todayISO = () => new Date().toISOString().slice(0, 10)

export default function DriverHomePage() {
  const { getAccessToken } = useAuth()
  const [profile, setProfile] = useState<DriverProfile | null>(null)
  const [records, setRecords] = useState<DailyRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [notDriver, setNotDriver] = useState(false)
  const [form, setForm] = useState({ revenue: '', fuelCost: '', otherExpenses: '', kmDriven: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const authFetch = useCallback(async (path: string, init?: RequestInit) => {
    const token = await getAccessToken()
    return fetch(`/api/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    })
  }, [getAccessToken])

  const load = useCallback(async () => {
    const res = await authFetch('/driver/me')
    if (res.ok) {
      const body = await res.json()
      if (!body.data) { setNotDriver(true); setLoading(false); return }
      setProfile(body.data)
      if (body.data.todayRecord) {
        const t = body.data.todayRecord
        setForm({
          revenue: String(t.revenue ?? ''),
          fuelCost: String(t.fuelCost ?? ''),
          otherExpenses: String(t.otherExpenses ?? ''),
          kmDriven: t.kmDriven != null ? String(t.kmDriven) : '',
        })
      }
      const rRes = await authFetch('/driver/me/records')
      if (rRes.ok) setRecords((await rRes.json()).data)
    }
    setLoading(false)
  }, [authFetch])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setErr(null); setMsg(null)
    const res = await authFetch('/driver/me/daily', {
      method: 'POST',
      body: JSON.stringify({
        date: todayISO(),
        revenue: Number(form.revenue) || 0,
        fuelCost: Number(form.fuelCost) || 0,
        otherExpenses: Number(form.otherExpenses) || 0,
        ...(form.kmDriven ? { kmDriven: Number(form.kmDriven) } : {}),
      }),
    })
    setSaving(false)
    if (!res.ok) { const b = await res.json().catch(() => ({})); setErr(b.error?.message ?? 'Erreur'); return }
    setMsg('Relevé du jour enregistré ✓')
    load()
  }

  if (loading) return <main className="flex min-h-[40vh] items-center justify-center"><p className="text-sm text-muted">Chargement…</p></main>

  if (notDriver) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 py-10 text-center">
        <h1 className="font-display text-2xl text-ink">Espace chauffeur</h1>
        <p className="mt-2 text-sm text-muted">
          Votre compte n&apos;est pas encore rattaché à une flotte. Demandez à votre gestionnaire
          de vous onboarder avec ce numéro de téléphone.
        </p>
      </main>
    )
  }

  const labelCls = 'font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'
  const inputCls = 'mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2.5 text-sm text-ink'

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 lg:py-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Espace chauffeur</div>
        <h1 className="mt-1 font-display text-3xl text-ink">Bonjour {profile?.name}</h1>
        {profile?.enterprise && <p className="mt-1 text-sm text-muted">{profile.enterprise.name}</p>}
      </div>

      {/* Véhicule */}
      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className={labelCls}>Mon véhicule</div>
        {profile?.activeAssignment ? (
          <p className="mt-1 font-display text-lg text-ink">
            {profile.activeAssignment.vehicle.brand} {profile.activeAssignment.vehicle.model}
            {' '}<span className="font-mono text-sm text-muted">{profile.activeAssignment.vehicle.plate ?? ''}</span>
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted">Aucun véhicule affecté pour le moment.</p>
        )}
      </div>

      {/* Relevé du jour */}
      <form onSubmit={submit} className="mb-8 rounded-md border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Relevé du jour</h2>
          <span className="font-mono text-xs text-muted tabular">{todayISO()}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Chiffre d&apos;affaires</label><input type="number" inputMode="numeric" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} className={inputCls} placeholder="FCFA" /></div>
          <div><label className={labelCls}>Carburant</label><input type="number" inputMode="numeric" value={form.fuelCost} onChange={(e) => setForm({ ...form, fuelCost: e.target.value })} className={inputCls} placeholder="FCFA" /></div>
          <div><label className={labelCls}>Autres dépenses</label><input type="number" inputMode="numeric" value={form.otherExpenses} onChange={(e) => setForm({ ...form, otherExpenses: e.target.value })} className={inputCls} placeholder="FCFA" /></div>
          <div><label className={labelCls}>Km parcourus</label><input type="number" inputMode="numeric" value={form.kmDriven} onChange={(e) => setForm({ ...form, kmDriven: e.target.value })} className={inputCls} /></div>
        </div>
        {err && <p className="mt-3 text-sm text-error-fg">{err}</p>}
        {msg && <p className="mt-3 text-sm text-success-fg">{msg}</p>}
        <button type="submit" disabled={saving} className="mt-4 w-full rounded-md bg-accent py-2.5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50">
          {saving ? 'Enregistrement…' : 'Enregistrer le relevé'}
        </button>
      </form>

      {/* Historique */}
      <div>
        <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Mes derniers relevés</h2>
        {records.length === 0 ? (
          <p className="text-sm text-muted">Aucun relevé pour l&apos;instant.</p>
        ) : (
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                <div>
                  <div className="font-mono text-xs text-muted tabular">{r.date.slice(0, 10)}</div>
                  <div className="text-sm text-ink">{r.vehicle ? `${r.vehicle.brand} ${r.vehicle.model}` : '—'}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg text-ink">{fmt(r.revenue)}</div>
                  <div className="text-[11px] text-muted">net {fmt(r.revenue - r.fuelCost - r.otherExpenses)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
