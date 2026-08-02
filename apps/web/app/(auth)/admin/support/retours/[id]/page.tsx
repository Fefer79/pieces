'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  supportFetch,
  fmtFcfa,
  type ReturnStatus,
  type SupportReturnDetail,
} from '@/lib/support-api'
import {
  NEXT_RETURN_STATUSES,
  RETURN_REASON_LABELS,
  RETURN_STATUS_LABELS,
  RETURN_STATUS_VARIANTS,
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

export default function SupportRetourDetailPage() {
  const params = useParams<{ id: string }>()
  const [retour, setRetour] = useState<SupportReturnDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showTransitionForm, setShowTransitionForm] = useState(false)

  const load = useCallback(() => {
    supportFetch<SupportReturnDetail>(`/returns/${params.id}`).then((res) => {
      if (res.ok) {
        setRetour(res.data)
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

  if (notFound) {
    return (
      <div>
        <Link href="/admin/support/retours" className="text-[13px] text-ink-2 hover:underline">
          ← Retours
        </Link>
        <p className="mt-4 text-sm text-error-fg">{error ?? 'Retour introuvable.'}</p>
      </div>
    )
  }
  if (!retour) return <div className="text-sm text-muted">Chargement…</div>

  const nextStatuses = NEXT_RETURN_STATUSES[retour.status]

  return (
    <div>
      <div className="mb-4">
        <Link href="/admin/support/retours" className="text-[13px] text-ink-2 hover:underline">
          ← Retours
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-2xl text-ink">
            Retour du {formatDate(retour.requestedAt)}
          </h1>
          <Chip variant={RETURN_STATUS_VARIANTS[retour.status]}>
            {RETURN_STATUS_LABELS[retour.status]}
          </Chip>
          <div className="ml-auto flex flex-wrap gap-2">
            {nextStatuses.length > 0 && (
              <button
                onClick={() => setShowTransitionForm((v) => !v)}
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                {showTransitionForm ? 'Fermer' : 'Faire avancer'}
              </button>
            )}
          </div>
        </div>
        <p className="mt-1 font-mono text-xs text-muted">Commande #{retour.orderId.slice(0, 8)}</p>
      </div>

      {showTransitionForm && nextStatuses.length > 0 && (
        <TransitionForm
          returnId={retour.id}
          nextStatuses={nextStatuses}
          onTransitioned={() => {
            setShowTransitionForm(false)
            load()
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section title={`Motif : ${RETURN_REASON_LABELS[retour.reason]}`}>
            {retour.description ? (
              <p className="text-sm text-ink">{retour.description}</p>
            ) : (
              <p className="text-sm text-muted">Aucune description.</p>
            )}
            <p className="mt-2 text-xs text-muted">
              Demandé le {formatDateTime(retour.requestedAt)} par {retour.requestedBy.name ?? '—'}
            </p>
          </Section>

          <Section title={`Preuves (${retour.evidence.length})`}>
            {retour.evidence.length === 0 ? (
              <p className="text-sm text-muted">Aucune preuve jointe.</p>
            ) : (
              <ul className="space-y-1.5">
                {retour.evidence.map((url, i) => (
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

          {(retour.pickupAddress || retour.pickupContactName || retour.pickupContactPhone) && (
            <Section title="Enlèvement">
              <dl className="space-y-1.5 text-sm">
                {retour.pickupAddress && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Adresse</dt>
                    <dd className="text-right text-ink">{retour.pickupAddress}</dd>
                  </div>
                )}
                {retour.pickupContactName && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Contact</dt>
                    <dd className="text-ink">{retour.pickupContactName}</dd>
                  </div>
                )}
                {retour.pickupContactPhone && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Téléphone</dt>
                    <dd className="text-ink">{retour.pickupContactPhone}</dd>
                  </div>
                )}
              </dl>
            </Section>
          )}

          <Section title="Étapes">
            <dl className="space-y-1.5 text-sm">
              <StepRow label="Demandé" value={retour.requestedAt} />
              <StepRow label="Accepté" value={retour.acceptedAt} />
              <StepRow label="Récupéré" value={retour.pickedUpAt} />
              <StepRow label="Inspecté" value={retour.inspectedAt} />
              <StepRow label="Remboursé" value={retour.refundedAt} />
              <StepRow label="Rejeté" value={retour.rejectedAt} />
              <StepRow label="Annulé" value={retour.cancelledAt} />
            </dl>
            {retour.refundAmount != null && (
              <p className="mt-2 text-sm text-ink">
                Montant remboursé : <span className="font-mono tabular">{fmtFcfa(retour.refundAmount)}</span>
              </p>
            )}
          </Section>

          {retour.resolutionNote && (
            <Section title="Note de résolution">
              <p className="text-sm text-ink">{retour.resolutionNote}</p>
            </Section>
          )}

          <Section title="Demandeur">
            <p className="text-sm text-ink">{retour.requestedBy.name ?? '—'}</p>
            {retour.requestedBy.phone && (
              <p className="mt-1 text-sm text-muted">{retour.requestedBy.phone}</p>
            )}
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Section title="Commande">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-muted">#{retour.order.id.slice(0, 8)}</span>
              <StatusChip status={retour.order.status} />
            </div>
            <dl className="mb-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Total</dt>
                <dd className="font-mono tabular text-ink">{fmtFcfa(retour.order.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Livraison</dt>
                <dd className="font-mono tabular text-ink">{fmtFcfa(retour.order.deliveryFee)}</dd>
              </div>
              {retour.order.laborCost != null && (
                <div className="flex justify-between">
                  <dt className="text-muted">Main-d&apos;œuvre</dt>
                  <dd className="font-mono tabular text-ink">{fmtFcfa(retour.order.laborCost)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">Séquestre</dt>
                <dd className="text-ink">
                  {retour.order.escrow
                    ? `${ESCROW_STATUS_LABELS[retour.order.escrow.status] ?? retour.order.escrow.status} · ${fmtFcfa(retour.order.escrow.amount)}`
                    : 'Aucun'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Passée le</dt>
                <dd className="text-ink">{formatDate(retour.order.createdAt)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Client</dt>
                <dd className="text-ink">
                  {retour.order.initiator.name ?? '—'}
                  {retour.order.initiator.phone ? ` · ${retour.order.initiator.phone}` : ''}
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
                {retour.order.items.map((item) => (
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
// Formulaire de transition (select limité aux statuts suivants autorisés)
// ---------------------------------------------------------------------------

function TransitionForm({
  returnId,
  nextStatuses,
  onTransitioned,
}: {
  returnId: string
  nextStatuses: ReturnStatus[]
  onTransitioned: () => void
}) {
  const [statut, setStatut] = useState<ReturnStatus>(nextStatuses[0]!)
  const [refundAmount, setRefundAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (statut === 'REFUNDED' && !refundAmount.trim()) {
      setError('Le montant remboursé est requis pour passer au statut « Remboursé ».')
      return
    }
    setBusy(true)
    setError(null)
    const body: Record<string, unknown> = { statut }
    if (statut === 'REFUNDED') body.refundAmount = Number(refundAmount)
    if (note.trim()) body.note = note.trim()
    const res = await supportFetch(`/returns/${returnId}/transition`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    onTransitioned()
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-md border border-border bg-card p-5">
      <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
        Faire avancer le retour
      </h2>
      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="statut" className="mb-1 block text-sm font-medium text-ink">
            Nouveau statut
          </label>
          <select
            id="statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value as ReturnStatus)}
            className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
          >
            {nextStatuses.map((s) => (
              <option key={s} value={s}>
                {RETURN_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        {statut === 'REFUNDED' && (
          <div>
            <label htmlFor="refundAmount" className="mb-1 block text-sm font-medium text-ink">
              Montant remboursé (FCFA)
            </label>
            <input
              id="refundAmount"
              type="number"
              min={0}
              step={1}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
            />
          </div>
        )}
      </div>
      {statut === 'REFUNDED' && (
        <p className="mb-3 rounded-md border border-warn-fg/20 bg-warn-bg p-2.5 text-xs text-warn-fg">
          Le passage au statut « Remboursé » rembourse le séquestre au client si celui-ci est
          encore bloqué, et le client est notifié par WhatsApp.
        </p>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={2000}
        placeholder="Note de résolution (facultative, visible dans l'historique)…"
        className="mb-3 w-full rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
        >
          {busy ? 'Enregistrement…' : 'Confirmer'}
        </button>
        {error && <p className="text-xs text-error-fg">{error}</p>}
      </div>
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

function StepRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className={value ? 'text-ink' : 'text-muted'}>{formatDateTime(value)}</dd>
    </div>
  )
}
