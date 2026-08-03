'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  stockFetch,
  fmtFcfa,
  type PurchaseOrderDetail,
  type PurchaseOrderLine,
  type PurchaseOrderStatus,
} from '@/lib/stock-api'
import {
  formatShortDate,
  nextPoTransitions,
  PO_STATUS_LABELS,
  poLineRemaining,
  poModeLabel,
  poStatusVariant,
  poTransitionActionLabel,
} from '@/lib/stock-utils'
import { Chip } from '@/components/ui/chip'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { ShipmentPanel } from '@/components/logistique/shipment-panel'

// Statuts depuis lesquels une réception est possible (garde identique côté API).
const RECEIVABLE: PurchaseOrderStatus[] = ['ENVOYEE', 'EN_TRANSIT', 'RECEPTION_PARTIELLE']

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [po, setPo] = useState<PurchaseOrderDetail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    stockFetch<PurchaseOrderDetail>(`/purchase-orders/${params.id}`).then((res) => {
      if (res.ok) {
        setPo(res.data)
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

  async function transition(target: PurchaseOrderStatus) {
    if (!po || busy) return
    if (target === 'ANNULEE' && !window.confirm(`Annuler le bon ${po.numero} ?`)) return
    setBusy(true)
    setError(null)
    const res = await stockFetch(`/purchase-orders/${po.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ statut: target }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    load()
  }

  if (notFound) {
    return (
      <div className="p-4">
        <Link href="/admin/stock/achats" className="text-[13px] text-ink-2 hover:underline">
          ← Achats
        </Link>
        <p className="mt-4 text-sm text-error-fg">{error ?? 'Bon de commande introuvable.'}</p>
      </div>
    )
  }
  if (!po) return <div className="text-sm text-muted">Chargement…</div>

  const frais = po.fraisEstimes

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/stock/achats" className="text-[13px] text-ink-2 hover:underline">
          ← Achats
        </Link>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink">{po.numero}</h1>
          <Chip variant={poStatusVariant(po.statut)}>{PO_STATUS_LABELS[po.statut]}</Chip>
        </div>
        <p className="mt-1 text-sm text-muted">
          {po.supplier.nom} · {poModeLabel(po.mode)} · créé le {formatShortDate(po.createdAt)}
          {po.createdBy.name ? ` par ${po.createdBy.name}` : ''}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Section title={`Lignes (${po.lines.length})`}>
            <Table>
              <Thead>
                <Tr hover={false}>
                  <Th>Désignation</Th>
                  <Th align="right">Commandée</Th>
                  <Th align="right">Reçue</Th>
                  <Th align="right">Prix unit.</Th>
                  <Th align="right">Sous-total</Th>
                </Tr>
              </Thead>
              <Tbody>
                {po.lines.map((l) => (
                  <Tr key={l.id}>
                    <Td>
                      {l.catalogItem ? (
                        <Link
                          href={`/admin/catalog/${l.catalogItem.id}`}
                          className="font-medium text-ink hover:text-accent hover:underline"
                        >
                          {l.designation}
                        </Link>
                      ) : (
                        <span className="font-medium text-ink">{l.designation}</span>
                      )}
                      <div className="text-xs text-muted">
                        {l.catalogItem ? 'Fiche liée' : 'Ligne libre'}
                        {l.oemReference ? ` · Réf. ${l.oemReference}` : ''}
                        {l.poidsEstimeKg != null ? ` · ${l.poidsEstimeKg} kg/u` : ''}
                      </div>
                    </Td>
                    <Td num>{l.quantite}</Td>
                    <Td num>
                      {l.quantiteRecue}
                      {l.quantiteRecue < l.quantite && (
                        <span className="text-muted-2"> (reste {poLineRemaining(l)})</span>
                      )}
                    </Td>
                    <Td num>{fmtFcfa(l.prixUnitaire)}</Td>
                    <Td num>{fmtFcfa(l.quantite * l.prixUnitaire)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Section>

          <Section title="Expédition">
            <ShipmentPanel purchaseOrderId={po.id} />
          </Section>

          {RECEIVABLE.includes(po.statut) && (
            <ReceiveSection
              po={po}
              busy={busy}
              setBusy={setBusy}
              setError={setError}
              onReceived={load}
            />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {nextPoTransitions(po.statut).length > 0 && (
            <Section title="Statut">
              <div className="space-y-2">
                {nextPoTransitions(po.statut).map((target) => (
                  <button
                    key={target}
                    onClick={() => transition(target)}
                    disabled={busy}
                    className={
                      target === 'ANNULEE'
                        ? 'w-full rounded-md border border-error-fg/30 px-4 py-2.5 text-[14px] font-semibold text-error-fg hover:bg-error-bg disabled:opacity-50'
                        : 'w-full rounded-md bg-ink-2 px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-ink disabled:opacity-50'
                    }
                  >
                    {poTransitionActionLabel(target)}
                  </button>
                ))}
              </div>
            </Section>
          )}

          <Section title="Montants">
            <dl className="space-y-1.5 text-[13px]">
              <Row label="Marchandise estimée" value={fmtFcfa(po.montantEstimeFcfa)} mono />
              {frais && (
                <>
                  <Row label="Fret" value={fmtFcfa(frais.fret)} mono />
                  <Row label="Douane" value={fmtFcfa(frais.douane)} mono />
                  <Row label="Last-mile" value={fmtFcfa(frais.lastMile)} mono />
                  <Row label="Total rendu estimé" value={fmtFcfa(frais.total)} mono />
                  <Row label="Délai estimé" value={`${frais.delaiJours} j`} mono />
                </>
              )}
              {po.montantReelFcfa != null && (
                <Row label="Montant réel réceptionné" value={fmtFcfa(po.montantReelFcfa)} mono />
              )}
            </dl>
          </Section>

          <Section title="Informations">
            <dl className="space-y-1.5 text-[13px]">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted">Fournisseur</dt>
                <dd>
                  <Link
                    href={`/admin/stock/fournisseurs/${po.supplier.id}`}
                    className="text-ink-2 hover:underline"
                  >
                    {po.supplier.nom}
                  </Link>
                </dd>
              </div>
              <Row label="Destination" value={po.destination?.nom ?? 'Aucune'} />
              <Row label="Mode" value={poModeLabel(po.mode)} />
              <Row
                label="Devise"
                value={po.devise + (po.tauxChange ? ` (1 = ${po.tauxChange} F)` : '')}
                mono
              />
              <Row label="ETA" value={formatShortDate(po.etaAt)} />
              {po.envoyeAt && <Row label="Envoyée le" value={formatShortDate(po.envoyeAt)} />}
              {po.recuAt && <Row label="Dernière réception" value={formatShortDate(po.recuAt)} />}
            </dl>
          </Section>

          <NotesSection po={po} busy={busy} setBusy={setBusy} setError={setError} onSaved={load} />
        </aside>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Réception partielle par ligne
// ---------------------------------------------------------------------------

function ReceiveSection({
  po,
  busy,
  setBusy,
  setError,
  onReceived,
}: {
  po: PurchaseOrderDetail
  busy: boolean
  setBusy: (v: boolean) => void
  setError: (v: string | null) => void
  onReceived: () => void
}) {
  // Seules les valeurs modifiées sont stockées ; la valeur affichée par défaut
  // est dérivée du restant (pas de setState dans un effet).
  const [edited, setEdited] = useState<Record<string, { qty?: string; prix?: string }>>({})

  const openLines = po.lines.filter((l) => poLineRemaining(l) > 0)

  async function receiveLine(line: PurchaseOrderLine) {
    const remaining = poLineRemaining(line)
    const qtyStr = edited[line.id]?.qty ?? String(remaining)
    const prixStr = edited[line.id]?.prix?.trim() ?? ''
    const qty = Number.parseInt(qtyStr, 10)
    if (!Number.isInteger(qty) || qty < 1 || qty > remaining || busy) return
    const prix = Number.parseInt(prixStr, 10)
    setBusy(true)
    setError(null)
    const res = await stockFetch(`/purchase-orders/${po.id}/receive`, {
      method: 'POST',
      body: JSON.stringify({
        lines: [
          {
            lineId: line.id,
            quantiteRecue: qty,
            prixUnitaireReelFcfa: prixStr !== '' && Number.isInteger(prix) ? prix : null,
          },
        ],
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setEdited((prev) => {
      const next = { ...prev }
      delete next[line.id]
      return next
    })
    onReceived()
  }

  return (
    <Section title="Réception">
      {!po.destinationId && (
        <p className="mb-3 rounded-md border border-warn-fg/20 bg-warn-bg p-2 text-xs text-warn-fg">
          Aucune destination sur ce bon : les quantités et coûts seront trackés, mais sans impact
          sur les niveaux de stock.
        </p>
      )}
      {openLines.length === 0 ? (
        <p className="text-sm text-muted">Toutes les lignes sont entièrement réceptionnées.</p>
      ) : (
        <div className="space-y-3">
          {openLines.map((l) => {
            const remaining = poLineRemaining(l)
            const qtyStr = edited[l.id]?.qty ?? String(remaining)
            const qty = Number.parseInt(qtyStr, 10)
            const valid = Number.isInteger(qty) && qty >= 1 && qty <= remaining
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-end gap-2 rounded-md border border-border p-3"
              >
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-medium text-ink">{l.designation}</p>
                  <p className="text-xs text-muted">
                    Reste {remaining} / {l.quantite}
                    {!l.catalogItemId && ' · ligne libre (coût seul)'}
                  </p>
                </div>
                <label className="text-xs text-muted">
                  Qté reçue
                  <input
                    value={qtyStr}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        [l.id]: { ...prev[l.id], qty: e.target.value },
                      }))
                    }
                    inputMode="numeric"
                    className="ml-1 w-20 rounded-sm border border-border-strong bg-white px-2 py-1.5 text-center font-mono text-sm"
                  />
                </label>
                <label className="text-xs text-muted">
                  Prix réel FCFA
                  <input
                    value={edited[l.id]?.prix ?? ''}
                    onChange={(e) =>
                      setEdited((prev) => ({
                        ...prev,
                        [l.id]: { ...prev[l.id], prix: e.target.value },
                      }))
                    }
                    inputMode="numeric"
                    placeholder={String(Math.round(l.prixUnitaire * (po.tauxChange ?? 1)))}
                    className="ml-1 w-28 rounded-sm border border-border-strong bg-white px-2 py-1.5 text-right font-mono text-sm"
                  />
                </label>
                <button
                  onClick={() => receiveLine(l)}
                  disabled={!valid || busy}
                  className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40"
                >
                  Réceptionner
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Notes internes (PATCH)
// ---------------------------------------------------------------------------

function NotesSection({
  po,
  busy,
  setBusy,
  setError,
  onSaved,
}: {
  po: PurchaseOrderDetail
  busy: boolean
  setBusy: (v: boolean) => void
  setError: (v: string | null) => void
  onSaved: () => void
}) {
  // Valeur d'édition ; null = jamais touchée → affiche la note du bon.
  const [edited, setEdited] = useState<string | null>(null)
  const value = edited ?? po.notes ?? ''

  async function save() {
    if (busy) return
    setBusy(true)
    setError(null)
    const res = await stockFetch(`/purchase-orders/${po.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes: value.trim() || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setEdited(null)
    onSaved()
  }

  return (
    <Section title="Notes internes">
      <textarea
        value={value}
        onChange={(e) => setEdited(e.target.value)}
        rows={3}
        placeholder="Conditions, transporteur, remarques…"
        className="w-full rounded-md border border-border-strong bg-card px-3 py-2 text-sm text-ink"
      />
      {edited != null && (
        <button
          onClick={save}
          disabled={busy}
          className="mt-2 w-full rounded-md bg-ink-2 px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink disabled:opacity-50"
        >
          {busy ? 'Enregistrement…' : 'Enregistrer les notes'}
        </button>
      )}
    </Section>
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

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink'}>{value}</dd>
    </div>
  )
}
