'use client'
/* eslint-disable react-hooks/set-state-in-effect, react/no-unescaped-entities */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiFetch, getActiveEnterpriseId } from '@/lib/enterprise-api'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

type ReturnReason = 'DEFECTIVE' | 'WRONG_PART' | 'NOT_AS_DESCRIBED' | 'NO_LONGER_NEEDED' | 'OTHER'
type ReturnStatus = 'REQUESTED' | 'ACCEPTED' | 'PICKED_UP' | 'INSPECTED' | 'REFUNDED' | 'REJECTED' | 'CANCELLED'

interface ReturnRow {
  id: string
  orderId: string
  orderItemId: string | null
  reason: ReturnReason
  description: string | null
  status: ReturnStatus
  refundAmount: number | null
  pickupAddress: string | null
  pickupContactName: string | null
  pickupContactPhone: string | null
  requestedAt: string
  acceptedAt: string | null
  pickedUpAt: string | null
  inspectedAt: string | null
  refundedAt: string | null
  rejectedAt: string | null
  cancelledAt: string | null
  resolutionNote: string | null
}

const REASON_LABEL: Record<ReturnReason, string> = {
  DEFECTIVE: 'Pièce défectueuse',
  WRONG_PART: 'Pièce erronée',
  NOT_AS_DESCRIBED: 'Non conforme',
  NO_LONGER_NEEDED: "Plus besoin",
  OTHER: 'Autre',
}

const STATUS_LABEL: Record<ReturnStatus, string> = {
  REQUESTED: 'Demandé',
  ACCEPTED: 'Accepté',
  PICKED_UP: 'Enlevé',
  INSPECTED: 'Inspecté',
  REFUNDED: 'Remboursé',
  REJECTED: 'Rejeté',
  CANCELLED: 'Annulé',
}

const STATUS_CLASS: Record<ReturnStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-700',
  ACCEPTED: 'bg-blue-100 text-blue-700',
  PICKED_UP: 'bg-indigo-100 text-indigo-700',
  INSPECTED: 'bg-purple-100 text-purple-700',
  REFUNDED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-600',
}

export default function EnterpriseReturnsPage() {
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null)
  const [returns, setReturns] = useState<ReturnRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [orderId, setOrderId] = useState('')
  const [reason, setReason] = useState<ReturnReason>('DEFECTIVE')
  const [description, setDescription] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupContactName, setPickupContactName] = useState('')
  const [pickupContactPhone, setPickupContactPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { setEnterpriseId(getActiveEnterpriseId()) }, [])

  async function load() {
    if (!enterpriseId) return
    const res = await apiFetch<ReturnRow[]>(`/returns/by-enterprise/${enterpriseId}`)
    if (!res.ok) { setError(res.message); return }
    setReturns(res.data)
  }

  useEffect(() => { load() /* eslint-disable-next-line */ }, [enterpriseId])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!orderId.trim()) return
    setSubmitting(true)
    setError(null)
    const payload: Record<string, unknown> = { orderId: orderId.trim(), reason }
    if (description) payload.description = description
    if (pickupAddress) payload.pickupAddress = pickupAddress
    if (pickupContactName) payload.pickupContactName = pickupContactName
    if (pickupContactPhone) payload.pickupContactPhone = pickupContactPhone
    const res = await apiFetch(`/returns`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    setSubmitting(false)
    if (!res.ok) { setError(res.message); return }
    setOrderId(''); setDescription(''); setPickupAddress(''); setPickupContactName(''); setPickupContactPhone('')
    setShowForm(false)
    load()
  }

  async function handleCancel(returnId: string) {
    if (!confirm('Annuler cette demande de retour ?')) return
    const res = await apiFetch(`/returns/${returnId}/cancel`, { method: 'POST' })
    if (!res.ok) { setError(res.message); return }
    load()
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Entreprise
          </div>
          <h1 className="mt-1 font-display text-3xl text-ink">Retours</h1>
          <p className="mt-1 text-sm text-muted">
            Demandes de retour sur les pièces livrées. Enlèvement géré par Pièces.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-ink-2 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink"
        >
          {showForm ? 'Annuler' : '+ Demander un retour'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mb-6 rounded-md border border-border bg-card p-5">
          <h2 className="mb-4 font-display text-lg text-ink">Nouvelle demande</h2>
          <div className="space-y-4">
            <Field label="ID commande *">
              <input
                type="text"
                required
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="UUID de la commande concernée"
                className="returns-input font-mono"
              />
            </Field>
            <Field label="Motif *">
              <select value={reason} onChange={(e) => setReason(e.target.value as ReturnReason)} className="returns-input">
                {(Object.keys(REASON_LABEL) as ReturnReason[]).map((r) => (
                  <option key={r} value={r}>{REASON_LABEL[r]}</option>
                ))}
              </select>
            </Field>
            <Field label="Description (détails)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="returns-input"
                rows={3}
                placeholder="Décrivez le problème"
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Adresse d'enlèvement">
                <input
                  type="text"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  className="returns-input"
                  placeholder="Où récupérer la pièce"
                />
              </Field>
              <Field label="Contact sur place">
                <input
                  type="text"
                  value={pickupContactName}
                  onChange={(e) => setPickupContactName(e.target.value)}
                  className="returns-input"
                  placeholder="Nom du contact"
                />
              </Field>
              <Field label="Téléphone du contact">
                <input
                  type="text"
                  value={pickupContactPhone}
                  onChange={(e) => setPickupContactPhone(e.target.value)}
                  className="returns-input"
                  placeholder="+225XXXXXXXXXX"
                />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-ink-2 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink disabled:opacity-50"
            >
              {submitting ? 'Envoi…' : 'Envoyer la demande'}
            </button>
          </div>
          <style jsx>{`
            :global(.returns-input) {
              width: 100%;
              padding: 0.6rem 0.75rem;
              border-radius: 6px;
              border: 1px solid var(--border, #e5e5e5);
              background: var(--card, #fff);
              color: var(--ink, #1a1a1a);
              font-size: 14px;
            }
          `}</style>
        </form>
      )}

      {returns.length === 0 ? (
        <div className="rounded-md border border-dashed border-border-strong bg-card p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucun retour</p>
          <p className="mt-1 text-xs text-muted">Vos demandes de retour apparaîtront ici.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <Thead>
              <Tr hover={false}>
                <Th>Demandé</Th>
                <Th>Commande</Th>
                <Th>Motif</Th>
                <Th>Statut</Th>
                <Th align="right">Remboursement</Th>
                <Th align="right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {returns.map((r) => (
                <Tr key={r.id}>
                  <Td className="text-muted">
                    {new Date(r.requestedAt).toLocaleDateString('fr-FR')}
                  </Td>
                  <Td className="font-mono text-[11px] text-ink">
                    {r.orderId.slice(0, 8)}…
                  </Td>
                  <Td className="text-ink">
                    {REASON_LABEL[r.reason]}
                    {r.description && (
                      <p className="mt-0.5 text-xs text-muted line-clamp-1">{r.description}</p>
                    )}
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </Td>
                  <Td num className="text-ink">
                    {r.refundAmount != null ? `${r.refundAmount.toLocaleString('fr-FR')} F` : '—'}
                  </Td>
                  <Td align="right">
                    {(r.status === 'REQUESTED' || r.status === 'ACCEPTED') && (
                      <button
                        onClick={() => handleCancel(r.id)}
                        className="rounded-sm border border-red-200 px-2 py-1 text-[11px] text-red-600 hover:bg-red-50"
                      >
                        Annuler
                      </button>
                    )}
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
