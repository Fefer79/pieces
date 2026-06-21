'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { enterpriseFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

type StockStatus = 'OUT' | 'LOW' | 'BELOW_TARGET' | 'OK'

interface BufferStockRow {
  id: string
  enterpriseId: string
  catalogItemId: string
  targetQty: number
  currentQty: number
  autoReplenish: boolean
  notes: string | null
  status: StockStatus
  catalogItem: {
    id: string
    name: string | null
    category: string | null
    oemReference: string | null
    imageThumbUrl: string | null
    vendor: { id: string; shopName: string }
  }
}

const STATUS_LABEL: Record<StockStatus, string> = {
  OUT: 'Épuisé',
  LOW: 'Bas',
  BELOW_TARGET: 'Sous-objectif',
  OK: 'OK',
}

const STATUS_CLASS: Record<StockStatus, string> = {
  OUT: 'bg-red-100 text-red-700',
  LOW: 'bg-amber-100 text-amber-700',
  BELOW_TARGET: 'bg-blue-100 text-blue-700',
  OK: 'bg-green-100 text-green-700',
}

export default function EnterpriseBufferStockPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [rows, setRows] = useState<BufferStockRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [catalogItemId, setCatalogItemId] = useState('')
  const [targetQty, setTargetQty] = useState('')
  const [currentQty, setCurrentQty] = useState('')
  const [autoReplenish, setAutoReplenish] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const res = await enterpriseFetch<BufferStockRow[]>(`/${enterpriseId}/buffer-stock`)
    if (!res.ok) { setError(res.message); return }
    setRows(res.data)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [enterpriseId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!enterpriseId || !catalogItemId.trim() || !targetQty) return
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = {
      catalogItemId: catalogItemId.trim(),
      targetQty: Number(targetQty),
      autoReplenish,
    }
    if (currentQty) payload.currentQty = Number(currentQty)
    const res = await enterpriseFetch(`/${enterpriseId}/buffer-stock`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    setCatalogItemId(''); setTargetQty(''); setCurrentQty(''); setAutoReplenish(false)
    setShowForm(false)
    load()
  }

  async function handleAdjust(id: string, delta: number) {
    if (!enterpriseId) return
    const res = await enterpriseFetch(`/${enterpriseId}/buffer-stock/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify({ delta }),
    })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  async function handleDelete(id: string) {
    if (!enterpriseId) return
    if (!confirm('Retirer cette référence du stock tampon ?')) return
    const res = await enterpriseFetch(`/${enterpriseId}/buffer-stock/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  const alertsCount = rows.filter((r) => r.status === 'OUT' || r.status === 'LOW').length

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Stock tampon</h1>
          <p className="mt-1 text-sm text-muted">
            Références SKU à disponibilité garantie 24h. Alerte automatique sous-seuil.
          </p>
          {alertsCount > 0 && (
            <p className="mt-2 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
              {alertsCount} alerte{alertsCount > 1 ? 's' : ''} stock critique
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
        >
          {showForm ? 'Annuler' : '+ Ajouter une référence'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-md border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Nouvelle référence en stock</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="ID pièce catalogue *">
              <input
                type="text"
                required
                value={catalogItemId}
                onChange={(e) => setCatalogItemId(e.target.value)}
                placeholder="UUID CatalogItem"
                className="buf-input font-mono"
              />
            </Field>
            <Field label="Quantité cible *">
              <input
                type="number"
                required
                min={1}
                value={targetQty}
                onChange={(e) => setTargetQty(e.target.value)}
                placeholder="Ex. 20"
                className="buf-input"
              />
            </Field>
            <Field label="Quantité actuelle">
              <input
                type="number"
                min={0}
                value={currentQty}
                onChange={(e) => setCurrentQty(e.target.value)}
                placeholder="Optionnel, défaut 0"
                className="buf-input"
              />
            </Field>
            <Field label="Réappro automatique">
              <label className="flex h-10 items-center gap-2">
                <input
                  type="checkbox"
                  checked={autoReplenish}
                  onChange={(e) => setAutoReplenish(e.target.checked)}
                />
                <span className="text-sm text-muted">Commander auto sous le seuil</span>
              </label>
            </Field>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-ink-2 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
            >
              {submitting ? 'Création…' : 'Ajouter'}
            </button>
          </div>
          <style jsx>{`
            :global(.buf-input) {
              width: 100%;
              padding: 0.6rem 0.75rem;
              border-radius: 6px;
              border: 1px solid var(--border, #e5e5e5);
              background: var(--card, #fff);
              color: var(--ink, #1a1a1a);
              font-size: 14px;
              min-height: 40px;
            }
          `}</style>
        </form>
      )}

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong bg-card p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucune référence en stock tampon</p>
          <p className="mt-1 text-xs text-muted">
            Ajoutez les SKU critiques à forte rotation pour garantir leur dispo.
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Pièce</Th>
                <Th>Fournisseur</Th>
                <Th align="right">Cible</Th>
                <Th align="right">Actuel</Th>
                <Th>Statut</Th>
                <Th align="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="text-ink">
                    {r.catalogItem.name ?? 'Sans nom'}
                    {r.catalogItem.oemReference && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted">
                        Réf. {r.catalogItem.oemReference}
                      </p>
                    )}
                  </Td>
                  <Td className="text-muted">{r.catalogItem.vendor.shopName}</Td>
                  <Td num className="text-muted">{r.targetQty}</Td>
                  <Td num className="font-semibold text-ink">
                    {r.currentQty}
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </Td>
                  <Td align="right">
                    <button
                      onClick={() => handleAdjust(r.id, +1)}
                      className="mr-1 rounded-sm border border-border px-2 py-1 text-[11px] text-ink hover:bg-surface"
                      title="Incrémenter"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => handleAdjust(r.id, -1)}
                      className="mr-1 rounded-sm border border-border px-2 py-1 text-[11px] text-ink hover:bg-surface"
                      title="Décrémenter"
                    >
                      −1
                    </button>
                    <button
                      onClick={() => handleDelete(r.id)}
                      className="rounded-sm border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      )}

      <div className="mt-6 text-sm">
        <Link href="/enterprise/dashboard" className="text-muted hover:underline">← Tableau de bord</Link>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
