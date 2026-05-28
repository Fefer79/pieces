'use client'

import { useEffect, useState } from 'react'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'
import { createClient } from '@/lib/supabase'

interface Invoice {
  id: string
  invoiceNumber: string
  issuedAt: string
  subtotalHt: number
  tvaRate: number
  tvaAmount: number
  totalTtc: number
  fneValidationNumber: string | null
  order: {
    id: string
    shareToken: string
    paidAt: string | null
    vehicle: { brand: string; model: string; year: number; plate: string | null } | null
  }
}

function fcfa(n: number): string {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

function monthOptions(): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const yyyymm = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({
      value: yyyymm,
      label: d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    })
  }
  return out
}

type EnterpriseRef =
  | { status: 'loading' }
  | { status: 'no-enterprise' }
  | { status: 'ready'; id: string }

export default function EnterpriseInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [period, setPeriod] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [enterprise, setEnterprise] = useState<EnterpriseRef>({ status: 'loading' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const months = monthOptions()
  const enterpriseId = enterprise.status === 'ready' ? enterprise.id : null
  const displayError = enterprise.status === 'no-enterprise' ? 'Aucune entreprise active.' : error

  useEffect(() => {
    const id = getActiveEnterpriseId()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage read, client-only
    setEnterprise(id ? { status: 'ready', id } : { status: 'no-enterprise' })
  }, [])

  useEffect(() => {
    if (enterprise.status === 'loading') return
    if (enterprise.status !== 'ready') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- terminal "no-enterprise" branch, no fetch to run
      setLoading(false)
      return
    }
    let cancelled = false
    const year = period.slice(0, 4)
    const month = period.slice(4, 6)
    enterpriseFetch<Invoice[]>(`/${enterprise.id}/invoices?year=${year}&month=${month}`)
      .then((res) => {
        if (cancelled) return
        if (res.ok) {
          setInvoices(res.data)
          setError(null)
        } else {
          setError(res.message)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enterprise, period])

  async function download(path: string, filename: string) {
    if (!enterpriseId) return
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Session expirée')
      return
    }
    const res = await fetch(`/api/v1/enterprises${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) {
      setError(`Échec téléchargement (${res.status})`)
      return
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const totals = invoices.reduce(
    (a, i) => ({ ht: a.ht + i.subtotalHt, tva: a.tva + i.tvaAmount, ttc: a.ttc + i.totalTtc }),
    { ht: 0, tva: 0, ttc: 0 },
  )

  return (
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="font-display text-3xl text-ink">Factures normalisées</h1>
      <p className="mt-1 text-sm text-muted">
        Toutes vos factures DGI-compliant, consolidation mensuelle et export FEC pour votre comptable.
      </p>

      {displayError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{displayError}</div>
      )}

      {/* Period selector + actions */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-border bg-card p-4">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Période</span>
          <select
            value={period}
            onChange={(e) => {
              setLoading(true)
              setPeriod(e.target.value)
            }}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </label>

        <button
          onClick={() => download(`/${enterpriseId}/invoices/monthly/${period}.pdf`, `pieces-mensuelle-${period}.pdf`)}
          disabled={invoices.length === 0}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
        >
          Télécharger facture consolidée (PDF)
        </button>
        <button
          onClick={() => download(`/${enterpriseId}/invoices/fec/${period}.csv`, `pieces-fec-${period}.csv`)}
          disabled={invoices.length === 0}
          className="rounded-md border border-border-strong bg-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface disabled:opacity-50"
        >
          Export FEC (CSV)
        </button>
      </div>

      {/* Summary */}
      {invoices.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Nombre de factures" value={String(invoices.length)} />
          <Stat label="Total HT" value={fcfa(totals.ht)} />
          <Stat label={`TVA (18 %)`} value={fcfa(totals.tva)} />
          <Stat label="Total TTC" value={fcfa(totals.ttc)} highlight />
        </div>
      )}

      {/* Invoice list */}
      <div className="mt-6 overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface text-left">
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Date</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">N° Facture</th>
              <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Véhicule</th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted">HT</th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted">TVA</th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted">TTC</th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted">DGI</th>
              <th className="px-4 py-2 text-right font-mono text-[10px] uppercase tracking-[0.08em] text-muted">PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">Chargement…</td></tr>
            ) : invoices.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">Aucune facture sur cette période.</td></tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv.id} className="border-t border-border">
                  <td className="px-4 py-2.5 text-xs text-ink">{new Date(inv.issuedAt).toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-ink">{inv.invoiceNumber}</td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {inv.order.vehicle ? `${inv.order.vehicle.brand} ${inv.order.vehicle.model}` : '—'}
                    {inv.order.vehicle?.plate && <span className="ml-1 font-mono">{inv.order.vehicle.plate}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">{fcfa(inv.subtotalHt)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs text-muted">{fcfa(inv.tvaAmount)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold">{fcfa(inv.totalTtc)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {inv.fneValidationNumber ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">Validé</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">FNE à venir</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => download(`/${enterpriseId}/invoices/${inv.id}.pdf`, `${inv.invoiceNumber}.pdf`)}
                      className="text-xs text-accent hover:underline"
                    >
                      Télécharger
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
        <strong>Intégration FNE-CI en cours.</strong> Le numéro de validation officiel de la
        Direction Générale des Impôts sera ajouté rétroactivement à chaque facture à l&apos;activation
        de la passerelle FNE. Les factures actuelles valent justificatif commercial avec mention TVA.
      </p>
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${highlight ? 'border-accent bg-accent/5' : 'border-border bg-surface'}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{label}</div>
      <div className={`mt-0.5 font-medium ${highlight ? 'text-accent' : 'text-ink'}`}>{value}</div>
    </div>
  )
}
