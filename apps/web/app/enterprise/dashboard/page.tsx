'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  enterpriseFetch,
  enterpriseDownload,
  getActiveEnterpriseId,
  setActiveEnterpriseId,
  type Enterprise,
  type DashboardData,
} from '@/lib/enterprise-api'

function formatFcfa(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export default function EnterpriseDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [enterprises, setEnterprises] = useState<Enterprise[]>([])
  const [active, setActive] = useState<Enterprise | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
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
      const res = await enterpriseFetch<DashboardData>(`/${active.id}/dashboard`)
      if (cancelled) return
      if (res.ok) setDashboard(res.data)
      else setError(res.message)
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
  const [address, setAddress] = useState('')
  const [rccm, setRccm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await enterpriseFetch<Enterprise>('/', {
      method: 'POST',
      body: JSON.stringify({ name, address: address || undefined, rccm: rccm || undefined }),
    })
    setSubmitting(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
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
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Adresse <span className="text-muted/60">(facultatif)</span></label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 w-full rounded-sm border border-border bg-white px-3 py-2 text-sm text-ink"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">RCCM <span className="text-muted/60">(facultatif)</span></label>
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
