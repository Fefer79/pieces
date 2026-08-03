'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  shipmentFetch,
  fmtFcfa,
  type ShipmentDetail,
  type ShipmentStatus,
} from '@/lib/sourcing-api'
import {
  SHIPMENT_STATUS_LABEL,
  SHIPMENT_TRANSITIONS,
  CARRIERS,
  type ShipmentStatusKey,
} from 'shared/constants'
import { Chip } from '@/components/ui/chip'
import { STATUS_CHIP } from '../_shared'

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : '—'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })

const labelCls = 'font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const inputCls = 'w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'
const btnCls =
  'rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink hover:bg-surface disabled:opacity-40'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className={labelCls}>{label}</div>
      <div className="mt-0.5 text-sm text-ink">{value}</div>
    </div>
  )
}

export default function AdminExpeditionDetailPage() {
  const params = useParams<{ id: string }>()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [nextStatus, setNextStatus] = useState<ShipmentStatus | ''>('')
  const [location, setLocation] = useState('')
  const [note, setNote] = useState('')

  const load = useCallback(() => {
    return shipmentFetch<ShipmentDetail>(`/${params.id}`).then((res) => {
      if (!res.ok) {
        setError(res.message)
        return
      }
      setError(null)
      setShipment(res.data)
      setNextStatus('')
      setLocation('')
      setNote('')
    })
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  const transition = useCallback(async () => {
    if (!nextStatus) return
    setBusy(true)
    const res = await shipmentFetch(`/${params.id}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        status: nextStatus,
        ...(location ? { location } : {}),
        ...(note ? { note } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    await load()
  }, [params.id, nextStatus, location, note, load])

  const notify = useCallback(async () => {
    setBusy(true)
    const res = await shipmentFetch<{ sent: boolean; channel: string | null }>(
      `/${params.id}/notify`,
      { method: 'POST' },
    )
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setNotice(
      res.data.sent ? 'Message envoyé au demandeur.' : 'Envoi impossible : aucun canal disponible.',
    )
  }, [params.id])

  if (error && !shipment) return <div className="p-6 text-sm text-error-fg">{error}</div>
  if (!shipment) return <div className="p-6 text-sm text-muted">Chargement…</div>

  const allowed = SHIPMENT_TRANSITIONS[shipment.status as ShipmentStatusKey] ?? []
  const carrier = CARRIERS[shipment.carrier]

  return (
    <div className="p-4 lg:p-6">
      <Link href="/admin/expeditions" className="text-[13px] text-muted hover:underline">
        ← Expéditions
      </Link>

      <div className="mt-3 rounded-md border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1">
            <div className={labelCls}>Référence</div>
            <h1 className="mt-1 font-mono text-2xl font-semibold text-ink">{shipment.reference}</h1>
          </div>
          <Chip variant={STATUS_CHIP[shipment.status]}>
            {SHIPMENT_STATUS_LABEL[shipment.status]}
          </Chip>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field
            label="Transporteur"
            value={
              <>
                {carrier?.label ?? shipment.carrier}
                {shipment.carrierOther && (
                  <span className="text-muted"> — {shipment.carrierOther}</span>
                )}
                {shipment.trackingUrl && shipment.trackingNumber && (
                  <p className="mt-0.5">
                    <a
                      href={shipment.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[12px] text-muted hover:underline"
                    >
                      {shipment.trackingNumber} ↗
                    </a>
                  </p>
                )}
              </>
            }
          />
          <Field
            label="Origine"
            value={[shipment.originCity, shipment.originCountry].filter(Boolean).join(', ') || '—'}
          />
          <Field label="Arrivée estimée" value={fmtDate(shipment.etaAt)} />
          <Field
            label="Bon de commande"
            value={
              shipment.purchaseOrder ? (
                <Link
                  href={`/admin/stock/achats/${shipment.purchaseOrder.id}`}
                  className="font-mono hover:underline"
                >
                  {shipment.purchaseOrder.numero}
                </Link>
              ) : (
                '—'
              )
            }
          />
          <Field
            label="Poids taxable"
            value={
              shipment.chargeableWeightKg != null ? `${shipment.chargeableWeightKg} kg` : '—'
            }
          />
          <Field label="Départ" value={fmtDate(shipment.departedAt)} />
        </div>

        {/* Détail des coûts — jamais un total nu (DESIGN.md). */}
        <div className="mt-5 rounded-sm border border-border bg-surface p-4">
          <div className={labelCls}>Coût logistique</div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Fret</dt>
              <dd className="tabular text-ink">{fmtFcfa(shipment.freightCostFcfa)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Douane</dt>
              <dd className="tabular text-ink">{fmtFcfa(shipment.customsCostFcfa)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Livraison Abidjan</dt>
              <dd className="tabular text-ink">{fmtFcfa(shipment.lastMileCostFcfa)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1 font-semibold">
              <dt className="text-ink">Total</dt>
              <dd className="tabular text-ink">{fmtFcfa(shipment.totalCostFcfa)}</dd>
            </div>
          </dl>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-error-fg">{error}</p>}
      {notice && <p className="mt-3 text-sm text-success-fg">{notice}</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* --- Frise --- */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg text-ink">Étapes</h2>
          <ol className="mt-4 space-y-4">
            {shipment.events.map((ev) => (
              <li key={ev.id} className="border-l-2 border-border pl-4">
                <div className="text-sm font-semibold text-ink">{ev.label}</div>
                <div className="font-mono text-[11px] text-muted-2">
                  {fmtDateTime(ev.occurredAt)}
                  {ev.location && ` · ${ev.location}`}
                </div>
                {ev.note && <p className="mt-1 text-[13px] text-muted">{ev.note}</p>}
              </li>
            ))}
            {shipment.events.length === 0 && (
              <li className="text-sm text-muted">Aucune étape enregistrée.</li>
            )}
          </ol>
        </div>

        {/* --- Actions --- */}
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg text-ink">Faire avancer</h2>
          {allowed.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Cette expédition est terminée : plus aucune étape n&apos;est possible.
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              <div>
                <label className={`block ${labelCls}`}>Nouvelle étape</label>
                <select
                  value={nextStatus}
                  onChange={(e) => setNextStatus(e.target.value as ShipmentStatus | '')}
                  className={`mt-1 ${inputCls}`}
                >
                  <option value="">Choisir…</option>
                  {allowed.map((s) => (
                    <option key={s} value={s}>
                      {SHIPMENT_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block ${labelCls}`}>Lieu</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Dubaï, Abidjan Port…"
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <div>
                <label className={`block ${labelCls}`}>Note</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  className={`mt-1 ${inputCls}`}
                />
              </div>
              <button
                onClick={() => void transition()}
                disabled={busy || !nextStatus}
                className={`w-full ${btnCls}`}
              >
                Enregistrer l&apos;étape
              </button>
            </div>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <h3 className="font-display text-[15px] text-ink">Prévenir le demandeur</h3>
            <p className="mt-1 text-[13px] text-muted">
              Envoie l&apos;étape en cours par WhatsApp. Rien n&apos;est envoyé automatiquement.
            </p>
            <button
              onClick={() => void notify()}
              disabled={busy || !shipment.quoteRequest}
              className={`mt-2 w-full ${btnCls}`}
            >
              Envoyer le message
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
