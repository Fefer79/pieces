'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  shipmentFetch,
  fmtFcfa,
  SHIPMENT_STATUS_LABELS,
  CARRIER_LABELS,
  MODE_LABELS,
  type ShipmentDetail,
  type ShipmentStatus,
  type ShipmentCarrier,
} from '@/lib/sourcing-api'
import { SHIPMENT_STATUS_CHIP, SHIPMENT_TRANSITIONS } from '@/lib/sourcing-utils'
import { Chip } from '@/components/ui/chip'

const CARRIERS = Object.keys(CARRIER_LABELS) as ShipmentCarrier[]

const fmtDateTime = (d: string | null) =>
  d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export default function AdminExpeditionDetailPage() {
  const params = useParams<{ id: string }>()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    shipmentFetch<ShipmentDetail>(`/${params.id}`).then((res) => {
      if (res.ok) setShipment(res.data)
      else setError(res.message)
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  async function transition(toStatus: ShipmentStatus) {
    setBusy(true)
    const res = await shipmentFetch(`/${params.id}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        toStatus,
        ...(location.trim() && { location: location.trim() }),
        ...(note.trim() && { note: note.trim() }),
      }),
    })
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setError(null)
    setLocation('')
    setNote('')
    load()
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    const res = await shipmentFetch(`/${params.id}`, { method: 'PATCH', body: JSON.stringify(body) })
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setError(null)
    load()
  }

  async function notify() {
    setBusy(true)
    const res = await shipmentFetch<{ sent: boolean }>(`/${params.id}/notify`, { method: 'POST' })
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setError(null)
    setNotice(res.data.sent ? 'Message envoyé au demandeur.' : 'Message non délivré.')
  }

  if (error && !shipment) {
    return (
      <div className="rounded-md border border-error-fg/30 bg-error-bg/40 p-4 text-[13px] text-error-fg">
        {error}
      </div>
    )
  }
  if (!shipment) return <div className="text-muted">Chargement…</div>

  const nextStates = SHIPMENT_TRANSITIONS[shipment.status]

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/expeditions"
            className="text-[13px] text-muted underline underline-offset-2"
          >
            ← Toutes les expéditions
          </Link>
          <h1 className="mt-1 font-mono text-2xl text-ink">{shipment.reference}</h1>
          <p className="text-[13px] text-muted">
            {CARRIER_LABELS[shipment.carrier]} · {MODE_LABELS[shipment.mode] ?? shipment.mode}
            {shipment.originCity && <> · départ {shipment.originCity}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip variant={SHIPMENT_STATUS_CHIP[shipment.status]}>
            {SHIPMENT_STATUS_LABELS[shipment.status]}
          </Chip>
          {shipment.quoteRequest && (
            <button
              type="button"
              disabled={busy}
              onClick={notify}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-[13px] disabled:opacity-40"
            >
              Prévenir le client
            </button>
          )}
          {shipment.purchaseOrder && (
            <Link
              href={`/admin/stock/achats/${shipment.purchaseOrder.id}`}
              className="rounded-sm border border-border-strong px-3 py-1.5 text-[13px]"
            >
              BC {shipment.purchaseOrder.numero}
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-3 rounded-md border border-success-fg/30 bg-success-bg/40 p-3 text-[13px] text-success-fg">
          {notice}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Frise d'événements */}
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
            Suivi
          </h2>
          <ol className="space-y-3">
            {shipment.events.map((e) => (
              <li key={e.id} className="border-l-2 border-border pl-3">
                <div className="text-[13.5px] font-medium text-ink">{e.label}</div>
                <div className="font-mono text-[11.5px] text-muted">
                  {fmtDateTime(e.occurredAt)}
                  {e.location && <> · {e.location}</>}
                </div>
                {e.note && <div className="mt-1 text-[12.5px] text-muted">{e.note}</div>}
              </li>
            ))}
            {shipment.events.length === 0 && (
              <li className="text-[13px] text-muted">Aucun événement.</li>
            )}
          </ol>

          {nextStates.length > 0 ? (
            <div className="mt-4 border-t border-border pt-4">
              <h3 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Faire avancer
              </h3>
              <div className="mb-2 flex flex-wrap gap-2">
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lieu (facultatif)"
                  className="min-w-[160px] flex-1 rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
                />
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note (facultatif)"
                  className="min-w-[160px] flex-1 rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {nextStates.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy}
                    onClick={() => transition(s)}
                    className={`rounded-sm px-3 py-1.5 text-[13px] disabled:opacity-40 ${
                      s === 'CANCELLED'
                        ? 'border border-border-strong text-error-fg'
                        : 'bg-ink text-card'
                    }`}
                  >
                    {SHIPMENT_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-4 border-t border-border pt-4 text-[13px] text-muted">
              Expédition terminée : plus aucune transition possible.
            </p>
          )}
        </div>

        {/* Fiche */}
        <div className="space-y-4">
          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Transport
            </h2>
            <TrackingForm shipment={shipment} busy={busy} onSave={patch} />
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Coûts réels
            </h2>
            {/* DESIGN.md : chaque poste est montré, le total n'est jamais un chiffre nu. */}
            <dl className="space-y-1.5 text-[13.5px]">
              <Row label="Fret" value={fmtFcfa(shipment.freightCostFcfa)} />
              <Row label="Douane" value={fmtFcfa(shipment.customsCostFcfa)} />
              <Row label="Livraison locale" value={fmtFcfa(shipment.lastMileCostFcfa)} />
              <div className="border-t border-border pt-1.5">
                <Row label="Total" value={fmtFcfa(shipment.totalCostFcfa)} strong />
              </div>
            </dl>
            <p className="mt-2 text-[11.5px] text-muted">
              Ces montants ne sont jamais affichés au client.
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <h2 className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Dates
            </h2>
            <dl className="space-y-1.5 text-[13.5px]">
              <Row label="Départ" value={fmtDateTime(shipment.departedAt)} />
              <Row label="Arrivée estimée" value={fmtDateTime(shipment.etaAt)} />
              <Row label="Dédouanée" value={fmtDateTime(shipment.customsClearedAt)} />
              <Row label="Arrivée" value={fmtDateTime(shipment.arrivedAt)} />
              <Row label="Livrée" value={fmtDateTime(shipment.deliveredAt)} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-mono tabular ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}

function TrackingForm({
  shipment,
  busy,
  onSave,
}: {
  shipment: ShipmentDetail
  busy: boolean
  onSave: (body: Record<string, unknown>) => void
}) {
  const [carrier, setCarrier] = useState<ShipmentCarrier>(shipment.carrier)
  const [trackingNumber, setTrackingNumber] = useState(shipment.trackingNumber ?? '')
  const [etaAt, setEtaAt] = useState(shipment.etaAt ? shipment.etaAt.slice(0, 10) : '')

  const inputCls =
    'w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'
  const labelCls =
    'block font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls} htmlFor="carrier">
          Transporteur
        </label>
        <select
          id="carrier"
          value={carrier}
          onChange={(e) => setCarrier(e.target.value as ShipmentCarrier)}
          className={`mt-1 ${inputCls}`}
        >
          {CARRIERS.map((c) => (
            <option key={c} value={c}>
              {CARRIER_LABELS[c]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelCls} htmlFor="tracking">
          Numéro de suivi
        </label>
        <input
          id="tracking"
          value={trackingNumber}
          onChange={(e) => setTrackingNumber(e.target.value)}
          className={`mt-1 ${inputCls}`}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="eta">
          Arrivée estimée
        </label>
        <input
          id="eta"
          type="date"
          value={etaAt}
          onChange={(e) => setEtaAt(e.target.value)}
          className={`mt-1 ${inputCls}`}
        />
      </div>
      {shipment.trackingUrl && (
        <a
          href={shipment.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[13px] underline underline-offset-2"
        >
          Ouvrir le suivi transporteur
        </a>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          onSave({
            carrier,
            trackingNumber: trackingNumber.trim() || null,
            etaAt: etaAt ? new Date(`${etaAt}T00:00:00.000Z`).toISOString() : null,
          })
        }
        className="w-full rounded-sm bg-ink px-3 py-2 text-[13px] text-card disabled:opacity-40"
      >
        Enregistrer
      </button>
    </div>
  )
}
