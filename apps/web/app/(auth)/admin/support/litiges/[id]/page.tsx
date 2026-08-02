'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supportFetch, fmtFcfa, type SupportDisputeDetail } from '@/lib/support-api'
import {
  DISPUTE_STATUS_LABELS,
  DISPUTE_STATUS_VARIANTS,
  formatDate,
  formatDateTime,
} from '@/lib/support-utils'
import { Chip, StatusChip, type ChipVariant } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'

const ESCROW_STATUS_LABELS: Record<string, string> = {
  HELD: 'Bloqué (séquestre)',
  RELEASED: 'Libéré au vendeur',
  REFUNDED: 'Remboursé au client',
}

// Miroir des pastilles de condition (ui/chip n'expose que 3 des 5 valeurs de
// PartCondition) — les chips de condition doivent rester visibles partout.
const CONDITION_CHIP: Record<string, { label: string; variant: ChipVariant }> = {
  NEW: { label: 'Neuf', variant: 'neuf' },
  USED: { label: 'Occasion importée', variant: 'occasion' },
  REFURBISHED: { label: 'Ré-usiné', variant: 'reusine' },
  AFTERMARKET: { label: 'Aftermarket', variant: 'aftermarket' },
  OEM: { label: 'OEM', variant: 'oem' },
}

export default function SupportLitigeDetailPage() {
  const params = useParams<{ id: string }>()
  const [dispute, setDispute] = useState<SupportDisputeDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showResolveForm, setShowResolveForm] = useState(false)

  const load = useCallback(() => {
    supportFetch<SupportDisputeDetail>(`/disputes/${params.id}`).then((res) => {
      if (res.ok) {
        setDispute(res.data)
        setError(null)
      } else {
        setNotFound(true)
        setError(res.message)
      }
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(path: string) {
    if (busy) return
    setBusy(true)
    setActionError(null)
    const res = await supportFetch(`/disputes/${params.id}${path}`, { method: 'POST' })
    setBusy(false)
    if (!res.ok) {
      setActionError(res.message)
      return
    }
    load()
  }

  if (notFound) {
    return (
      <div>
        <Link href="/admin/support" className="text-[13px] text-ink-2 hover:underline">
          ← Litiges
        </Link>
        <p className="mt-4 text-sm text-error-fg">{error ?? 'Litige introuvable.'}</p>
      </div>
    )
  }
  if (!dispute) return <div className="text-sm text-muted">Chargement…</div>

  const canReview = dispute.status === 'OPEN'
  const canResolve = dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW'
  const canClose =
    dispute.status === 'UNDER_REVIEW' ||
    dispute.status === 'RESOLVED_BUYER' ||
    dispute.status === 'RESOLVED_SELLER'

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/support" className="text-[13px] text-ink-2 hover:underline">
          ← Litiges
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink">
            Litige du {formatDate(dispute.createdAt)}
          </h1>
          <Chip variant={DISPUTE_STATUS_VARIANTS[dispute.status]}>
            {DISPUTE_STATUS_LABELS[dispute.status]}
          </Chip>
          <div className="ml-auto flex flex-wrap gap-2">
            {canReview && (
              <button
                onClick={() => runAction('/review')}
                disabled={busy}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
              >
                Prendre en charge
              </button>
            )}
            {canResolve && (
              <button
                onClick={() => setShowResolveForm((v) => !v)}
                disabled={busy}
                className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card disabled:opacity-40"
              >
                {showResolveForm ? 'Fermer' : 'Résoudre'}
              </button>
            )}
            {canClose && (
              <button
                onClick={() => {
                  if (window.confirm('Clôturer ce litige ? Cette action est définitive.')) {
                    runAction('/close')
                  }
                }}
                disabled={busy}
                className="rounded-sm border border-border-strong px-3 py-1.5 text-sm hover:bg-card disabled:opacity-40"
              >
                Clôturer
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 font-mono text-xs text-muted">Commande #{dispute.orderId.slice(0, 8)}</p>
      </div>

      {actionError && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {actionError}
        </div>
      )}

      {showResolveForm && canResolve && (
        <ResolveForm
          disputeId={dispute.id}
          onResolved={() => {
            setShowResolveForm(false)
            load()
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section title="Raison du litige">
            <p className="text-sm text-ink">{dispute.reason}</p>
            <p className="mt-2 text-xs text-muted">
              Ouvert le {formatDateTime(dispute.createdAt)} par {dispute.opener.name ?? '—'}
            </p>
          </Section>

          <Section title={`Preuves (${dispute.evidence.length})`}>
            {dispute.evidence.length === 0 ? (
              <p className="text-sm text-muted">Aucune preuve jointe.</p>
            ) : (
              <ul className="space-y-1.5">
                {dispute.evidence.map((url, i) => (
                  <li key={`${url}-${i}`}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-accent hover:underline"
                    >
                      Preuve {i + 1}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {dispute.resolution && (
            <Section title="Résolution">
              <p className="text-sm text-ink">{dispute.resolution}</p>
              <p className="mt-2 text-xs text-muted">
                Résolu le {formatDateTime(dispute.resolvedAt)} —{' '}
                {DISPUTE_STATUS_LABELS[dispute.status]}
              </p>
            </Section>
          )}

          <Section title="Plaignant">
            <p className="text-sm text-ink">{dispute.opener.name ?? '—'}</p>
            {dispute.opener.phone && (
              <p className="mt-1 text-sm text-muted">{dispute.opener.phone}</p>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Section title="Commande">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">#{dispute.order.id.slice(0, 8)}</span>
              <StatusChip status={dispute.order.status} />
            </div>
            <dl className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total</dt>
                <dd className="font-mono tabular text-ink">{fmtFcfa(dispute.order.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Livraison</dt>
                <dd className="font-mono tabular text-ink">{fmtFcfa(dispute.order.deliveryFee)}</dd>
              </div>
              {dispute.order.laborCost != null && (
                <div className="flex justify-between">
                  <dt className="text-muted">Main-d&apos;œuvre</dt>
                  <dd className="font-mono tabular text-ink">{fmtFcfa(dispute.order.laborCost)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Séquestre</dt>
                <dd className="text-ink">
                  {dispute.order.escrow
                    ? `${ESCROW_STATUS_LABELS[dispute.order.escrow.status] ?? dispute.order.escrow.status} · ${fmtFcfa(dispute.order.escrow.amount)}`
                    : 'Aucun'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Passée le</dt>
                <dd className="text-ink">{formatDate(dispute.order.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Client</dt>
                <dd className="text-ink">
                  {dispute.order.initiator.name ?? '—'}
                  {dispute.order.initiator.phone ? ` · ${dispute.order.initiator.phone}` : ''}
                </dd>
              </div>
            </dl>
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Article</Th>
                  <Th>Vendeur</Th>
                  <Th align="right">Qté</Th>
                  <Th align="right">Prix</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dispute.order.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <span className="text-sm text-ink">{item.name}</span>
                      {item.condition && CONDITION_CHIP[item.condition] && (
                        <div className="mt-1">
                          <Chip variant={CONDITION_CHIP[item.condition]!.variant}>
                            {CONDITION_CHIP[item.condition]!.label}
                          </Chip>
                        </div>
                      )}
                    </Td>
                    <Td className="text-sm">{item.vendorShopName}</Td>
                    <Td num>{item.quantity}</Td>
                    <Td num>{fmtFcfa(item.priceSnapshot * item.quantity)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Section>
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulaire de résolution (radio client/vendeur + résolution écrite)
// ---------------------------------------------------------------------------

function ResolveForm({
  disputeId,
  onResolved,
}: {
  disputeId: string
  onResolved: () => void
}) {
  const [inFavorOf, setInFavorOf] = useState<'buyer' | 'seller'>('buyer')
  const [resolution, setResolution] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!resolution.trim() || busy) return
    setBusy(true)
    setError(null)
    const res = await supportFetch(`/disputes/${disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ inFavorOf, resolution: resolution.trim() }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onResolved()
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-md border border-border bg-card p-5"
    >
      <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Résoudre le litige
      </h2>
      <div className="mb-3 flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="inFavorOf"
            checked={inFavorOf === 'buyer'}
            onChange={() => setInFavorOf('buyer')}
          />
          En faveur du client
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="inFavorOf"
            checked={inFavorOf === 'seller'}
            onChange={() => setInFavorOf('seller')}
          />
          En faveur du vendeur
        </label>
      </div>
      <textarea
        value={resolution}
        onChange={(e) => setResolution(e.target.value)}
        rows={4}
        maxLength={2000}
        placeholder="Résolution écrite et factuelle (visible dans l'historique, envoyée au client par WhatsApp)…"
        className="mb-3 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || !resolution.trim()}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Résolution…' : 'Confirmer la résolution'}
        </button>
        {error && <p className="text-xs text-error-fg">{error}</p>}
      </div>
      <p className="mt-2 text-xs text-muted">
        Le plaignant est notifié par WhatsApp avec le texte de la résolution.
      </p>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Primitives de mise en page (gabarit fiche admin)
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-5 py-3">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}
