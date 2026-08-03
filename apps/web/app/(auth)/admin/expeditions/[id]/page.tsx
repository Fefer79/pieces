/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Chip } from '@/components/ui/chip'
import {
  shipmentFetch,
  fmtFcfa,
  CARRIER_LABELS,
  SHIPMENT_STATUS_LABELS,
  SHIPMENT_TRANSITIONS,
  type ShipmentDetail,
  type ShipmentStatusCode,
  type ShipmentCarrierCode,
} from '@/lib/sourcing-api'

const STATUS_CHIP: Record<ShipmentStatusCode, 'plain' | 'oem' | 'status-ok' | 'status-warn' | 'status-err'> =
  {
    SOURCING: 'plain',
    COLLECTED: 'oem',
    IN_TRANSIT: 'status-warn',
    CUSTOMS: 'status-warn',
    LOCAL_DELIVERY: 'status-warn',
    DELIVERED: 'status-ok',
    CANCELLED: 'status-err',
  }

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

const inputCls =
  'w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'
const labelCls = 'block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

export default function AdminExpeditionDetailPage() {
  const params = useParams<{ id: string }>()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [toStatus, setToStatus] = useState<ShipmentStatusCode | ''>('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')
  const [tracking, setTracking] = useState('')

  const load = useCallback(async () => {
    const res = await shipmentFetch<ShipmentDetail>(`/${params.id}`)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setShipment(res.data)
    setTracking(res.data.trackingNumber ?? '')
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function transition() {
    if (!toStatus) return
    setBusy(true)
    const res = await shipmentFetch<ShipmentDetail>(`/${params.id}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        toStatus,
        ...(location ? { location } : {}),
        ...(note ? { note } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setToStatus('')
    setLocation('')
    setNote('')
    load()
  }

  async function saveTracking() {
    setBusy(true)
    const res = await shipmentFetch(`/${params.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ trackingNumber: tracking || null }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setFlash('Numéro de suivi enregistré.')
    load()
  }

  async function notify() {
    setBusy(true)
    const res = await shipmentFetch<{ sent: boolean }>(`/${params.id}/notify`, { method: 'POST' })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setError(null)
    setFlash(res.data.sent ? 'Client prévenu par WhatsApp.' : 'Message non délivré.')
  }

  if (error && !shipment) return <div className="p-6 text-sm text-error-fg">{error}</div>
  if (!shipment) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const nextStatuses = SHIPMENT_TRANSITIONS[shipment.status]

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-4">
        <Link href="/admin/expeditions" className="text-[13px] text-muted hover:underline">
          ← Expéditions
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold text-ink">{shipment.reference}</h1>
          <Chip variant={STATUS_CHIP[shipment.status]}>
            {SHIPMENT_STATUS_LABELS[shipment.status]}
          </Chip>
        </div>
        <p className="mt-1 text-sm text-muted">
          {CARRIER_LABELS[shipment.carrier as ShipmentCarrierCode] ?? shipment.carrier}
          {shipment.carrierOther && ` — ${shipment.carrierOther}`}
          {shipment.originCity && ` · départ ${shipment.originCity}`}
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/20 bg-error-bg p-3 text-sm text-error-fg">
          {error}
        </div>
      )}
      {flash && (
        <div className="mb-3 rounded-md border border-success-fg/20 bg-success-bg p-3 text-sm text-success-fg">
          {flash}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Frise des étapes */}
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-lg text-ink">Étapes</h2>
            <ol className="mt-4 space-y-4">
              {shipment.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
                  <div>
                    <div className="text-[14px] font-medium text-ink">{e.label}</div>
                    <div className="font-mono text-[11.5px] text-muted">
                      {fmtDateTime(e.occurredAt)}
                      {e.location && ` · ${e.location}`}
                    </div>
                    {e.note && <div className="mt-0.5 text-[12.5px] text-muted">{e.note}</div>}
                  </div>
                </li>
              ))}
            </ol>

            {nextStatuses.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <h3 className={labelCls}>Faire avancer</h3>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <select
                    value={toStatus}
                    onChange={(e) => setToStatus(e.target.value as ShipmentStatusCode | '')}
                    className={inputCls}
                  >
                    <option value="">Étape suivante…</option>
                    {nextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {SHIPMENT_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lieu (optionnel)"
                    className={inputCls}
                  />
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optionnel)"
                    className={inputCls}
                  />
                </div>
                <button
                  onClick={transition}
                  disabled={busy || !toStatus}
                  className="mt-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
                >
                  Enregistrer l&apos;étape
                </button>
              </div>
            ) : (
              <p className="mt-5 border-t border-border pt-4 text-[13px] text-muted">
                {shipment.status === 'DELIVERED'
                  ? 'Expédition livrée. La réception en stock se fait sur le bon de commande.'
                  : 'Expédition annulée.'}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {/* Suivi transporteur */}
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className="font-display text-lg text-ink">Suivi transporteur</h2>
            <label className={`${labelCls} mt-3`}>Numéro de suivi</label>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="—"
              className={`${inputCls} mt-1 font-mono`}
            />
            <button
              onClick={saveTracking}
              disabled={busy}
              className="mt-2 rounded-md border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface disabled:opacity-50"
            >
              Enregistrer
            </button>
            {shipment.trackingUrl && (
              <a
                href={shipment.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block text-[13px] text-ink-2 hover:underline"
              >
                Ouvrir le suivi transporteur ↗
              </a>
            )}
            <button
              onClick={notify}
              disabled={busy || !shipment.quoteRequest}
              className="mt-4 w-full rounded-md border border-border-strong px-3 py-2 text-sm text-ink hover:bg-surface disabled:opacity-50"
            >
              Prévenir le client (WhatsApp)
            </button>
            <p className="mt-2 text-[11.5px] text-muted">
              Le message ne nomme jamais le transitaire partenaire.
            </p>
          </div>

          {/* Rattachements */}
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className={labelCls}>Rattachements</h2>
            <dl className="mt-3 space-y-2 text-[13px]">
              <div>
                <dt className="text-muted">Bon de commande</dt>
                <dd>
                  {shipment.purchaseOrder ? (
                    <Link
                      href={`/admin/stock/achats/${shipment.purchaseOrder.id}`}
                      className="font-mono text-ink-2 hover:underline"
                    >
                      {shipment.purchaseOrder.numero} ({shipment.purchaseOrder.statut})
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted">Cotation</dt>
                <dd>
                  {shipment.quoteRequest ? (
                    <Link
                      href={`/admin/logistique/${shipment.quoteRequest.id}`}
                      className="font-mono text-ink-2 hover:underline"
                    >
                      {shipment.quoteRequest.reference}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Coûts */}
          <div className="rounded-md border border-border bg-card p-5">
            <h2 className={labelCls}>Coûts</h2>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <CostRow label="Fret" value={shipment.freightCostFcfa} />
              <CostRow label="Douane" value={shipment.customsCostFcfa} />
              <CostRow label="Livraison Abidjan" value={shipment.lastMileCostFcfa} />
              <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                <dt className="text-ink">Total</dt>
                <dd className="tabular font-mono text-ink">
                  {shipment.totalCostFcfa != null ? fmtFcfa(shipment.totalCostFcfa) : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function CostRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular font-mono text-ink-2">{value != null ? fmtFcfa(value) : '—'}</dd>
    </div>
  )
}
