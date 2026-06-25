'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { adminFetch, fmtFcfa } from '@/lib/admin-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Detail {
  vendor: {
    id: string; shopName: string; contactName: string; phone: string; status: string; commune: string | null; address: string | null
    user: { id: string; name: string | null; phone: string | null; email: string | null; createdAt: string } | null
    kyc: { kycType: string } | null
  }
  items: { id: string; name: string | null; price: number | null; commissionAmount: number | null; status: string; createdAt: string }[]
  transactions: { id: string; name: string; priceSnapshot: number; commissionAmount: number | null; quantity: number; createdAt: string; order: { id: string; status: string } }[]
  totals: { commissions: number; gmv: number; transactionCount: number }
  commissionByMonth: { month: string; commissions: number; gmv: number; orders: number }[]
}

export default function AdminVendorDetailPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<Detail | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Édition des infos vendeur (nom de boutique + contact + téléphone)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ shopName: '', contactName: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    adminFetch<Detail>(`/admin/vendors/${id}/detail`).then(setData).catch((e) => setError(e.message))
  }, [id])

  function startEdit() {
    if (!data) return
    setForm({
      shopName: data.vendor.shopName ?? '',
      contactName: data.vendor.contactName ?? '',
      phone: data.vendor.phone ?? '',
    })
    setSaveError(null)
    setEditing(true)
  }

  async function saveContact() {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await adminFetch<Detail>(`/admin/vendors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName: form.shopName.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
        }),
      })
      setData(updated)
      setEditing(false)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setSaving(false)
    }
  }

  if (error) return <div className="p-6 text-sm text-status-err">{error}</div>
  if (!data) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const v = data.vendor
  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/vendors" className="mb-3 inline-block text-sm text-ink-2 hover:underline">← Vendeurs</Link>
      <h1 className="mb-1 font-display text-2xl text-ink">{v.shopName}</h1>
      <div className="mb-4 text-sm text-muted">{v.status} · {v.commune ?? ''}</div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Contact</div>
            {!editing && (
              <button onClick={startEdit} className="text-xs font-medium text-accent hover:underline">
                Éditer
              </button>
            )}
          </div>

          {editing ? (
            <div className="mt-2 space-y-2 text-sm">
              <div>
                <label className="text-[11px] text-muted">Nom de la boutique</label>
                <input
                  value={form.shopName}
                  onChange={(e) => setForm((f) => ({ ...f, shopName: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1.5 text-sm"
                  placeholder="Nom de la boutique / du vendeur"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Nom du contact</label>
                <input
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1.5 text-sm"
                  placeholder="Nom du contact"
                />
              </div>
              <div>
                <label className="text-[11px] text-muted">Téléphone</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-sm border border-border-strong bg-surface px-2 py-1.5 text-sm"
                  placeholder="+225XXXXXXXXXX"
                />
              </div>
              {saveError && <div className="text-xs text-status-err">{saveError}</div>}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={saveContact}
                  disabled={saving}
                  className="rounded-sm bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="rounded-sm border border-border-strong px-3 py-1.5 text-xs hover:bg-surface"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm">
              <div className="font-medium text-ink">{v.contactName || '—'}</div>
              <div>{v.phone}</div>
              {v.user?.email && <div className="text-muted">{v.user.email}</div>}
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">Commissions totales</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{fmtFcfa(data.totals.commissions)}</div>
          <div className="text-xs text-muted">sur {data.totals.transactionCount} articles vendus</div>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">GMV (chiffre d&apos;affaires)</div>
          <div className="mt-2 text-2xl font-semibold text-ink">{fmtFcfa(data.totals.gmv)}</div>
        </div>
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Commissions par mois</div>
        <Bar
          data={{
            labels: data.commissionByMonth.map((m) => m.month),
            datasets: [{ label: 'Commissions (FCFA)', data: data.commissionByMonth.map((m) => m.commissions), backgroundColor: '#ff6b00' }],
          }}
          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
        />
      </div>

      <div className="mb-6 rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Transactions ({data.transactions.length})</div>
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Date</Th>
              <Th>Article</Th>
              <Th align="right">Prix</Th>
              <Th align="right">Qté</Th>
              <Th align="right">Commission</Th>
              <Th>Commande</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.transactions.map((t) => (
              <Tr key={t.id}>
                <Td className="text-xs">{t.createdAt.slice(0, 10)}</Td>
                <Td>{t.name}</Td>
                <Td num>{fmtFcfa(t.priceSnapshot)}</Td>
                <Td num>{t.quantity}</Td>
                <Td num>{fmtFcfa(t.commissionAmount)}</Td>
                <Td className="text-xs">{t.order.status}</Td>
              </Tr>
            ))}
            {data.transactions.length === 0 && (
              <Tr hover={false}><Td colSpan={6} align="center" className="py-6 text-muted">Aucune transaction.</Td></Tr>
            )}
          </Tbody>
        </Table>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Articles catalogue ({data.items.length})</div>
        <Table>
          <Thead>
            <Tr hover={false}>
              <Th>Nom</Th>
              <Th align="right">Prix</Th>
              <Th align="right">Commission</Th>
              <Th>Statut</Th>
            </Tr>
          </Thead>
          <Tbody>
            {data.items.map((it) => (
              <Tr key={it.id}>
                <Td>{it.name ?? '—'}</Td>
                <Td num>{fmtFcfa(it.price)}</Td>
                <Td num>{fmtFcfa(it.commissionAmount)}</Td>
                <Td className="text-xs">{it.status}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </div>
    </div>
  )
}
