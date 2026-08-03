'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { shipmentFetch, type ShipmentRow, type ShipmentCarrier } from '@/lib/sourcing-api'
import { SHIPMENT_STATUS_LABEL, SHIPMENT_CARRIERS, CARRIERS } from 'shared/constants'
import { Chip } from '@/components/ui/chip'

const labelCls = 'block font-mono text-[10px] uppercase tracking-[0.08em] text-muted'
const inputCls = 'mt-1 w-full rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

/**
 * Bloc « Expédition » d'un bon de commande : consulter l'envoi rattaché, ou en
 * créer un. Le jeton de suivi public n'est affiché qu'à la création — il n'est
 * stocké que haché.
 */
export function ShipmentPanel({ purchaseOrderId }: { purchaseOrderId: string }) {
  const [shipments, setShipments] = useState<ShipmentRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [carrier, setCarrier] = useState<ShipmentCarrier>('TRANSITAIRE')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [publicToken, setPublicToken] = useState<{ reference: string; token: string } | null>(null)

  const load = useCallback(() => {
    return shipmentFetch<{ items: ShipmentRow[] }>('/?pageSize=100').then((res) => {
      if (!res.ok) {
        setError(res.message)
        return
      }
      setError(null)
      setShipments(res.data.items.filter((s) => s.purchaseOrder?.id === purchaseOrderId))
    })
  }, [purchaseOrderId])

  useEffect(() => {
    load()
  }, [load])

  const create = useCallback(async () => {
    setBusy(true)
    const res = await shipmentFetch<{ id: string; reference: string; publicToken: string }>('/', {
      method: 'POST',
      body: JSON.stringify({
        purchaseOrderId,
        carrier,
        ...(trackingNumber ? { trackingNumber } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) {
      setError(res.message)
      return
    }
    setPublicToken({ reference: res.data.reference, token: res.data.publicToken })
    setOpen(false)
    setTrackingNumber('')
    await load()
  }, [purchaseOrderId, carrier, trackingNumber, load])

  return (
    <div>
      {error && <p className="mb-2 text-sm text-error-fg">{error}</p>}

      {shipments && shipments.length > 0 ? (
        <ul className="space-y-2">
          {shipments.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2"
            >
              <Link
                href={`/admin/expeditions/${s.id}`}
                className="flex-1 font-mono text-sm font-semibold text-ink hover:underline"
              >
                {s.reference}
              </Link>
              <span className="text-[12px] text-muted">
                {CARRIERS[s.carrier]?.label ?? s.carrier}
              </span>
              <Chip variant={s.status === 'DELIVERED' ? 'status-ok' : 'status-warn'}>
                {SHIPMENT_STATUS_LABEL[s.status]}
              </Chip>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Aucune expédition rattachée à ce bon de commande.</p>
      )}

      {publicToken && (
        <div className="mt-3 rounded-sm border border-border bg-surface p-3">
          <p className="text-[13px] text-ink">
            Lien de suivi client — <strong>affiché une seule fois</strong> :
          </p>
          <code className="mt-1 block break-all font-mono text-[11px] text-muted">
            /logistique/suivi/{publicToken.reference}?t={publicToken.token}
          </code>
        </div>
      )}

      {open ? (
        <div className="mt-4 space-y-3 rounded-sm border border-border p-3">
          <div>
            <label className={labelCls}>Transporteur</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value as ShipmentCarrier)}
              className={inputCls}
            >
              {SHIPMENT_CARRIERS.map((c) => (
                <option key={c} value={c}>
                  {CARRIERS[c].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Numéro de suivi</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Optionnel — ajoutable plus tard"
              className={inputCls}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => void create()}
              disabled={busy}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? 'Création…' : 'Créer'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink hover:bg-surface"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 rounded-sm border border-border px-3 py-1.5 text-[13px] text-ink hover:bg-surface"
        >
          Créer une expédition
        </button>
      )}
    </div>
  )
}
