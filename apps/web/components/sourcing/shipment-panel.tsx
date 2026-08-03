'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  shipmentFetch,
  SHIPMENT_STATUS_LABELS,
  CARRIER_LABELS,
  type Paginated,
  type ShipmentDetail,
  type ShipmentRow,
  type ShipmentCarrier,
} from '@/lib/sourcing-api'
import { SHIPMENT_STATUS_CHIP } from '@/lib/sourcing-utils'
import { Chip } from '@/components/ui/chip'

const CARRIERS = Object.keys(CARRIER_LABELS) as ShipmentCarrier[]

/**
 * Bloc « Expédition » d'un bon de commande. Crée l'expédition et affiche le
 * lien de suivi client — le jeton n'étant renvoyé qu'à la création, on le
 * conserve en mémoire le temps de le copier.
 */
export function ShipmentPanel({
  purchaseOrderId,
  quoteRequestId,
  mode,
}: {
  purchaseOrderId: string
  quoteRequestId?: string | null
  mode?: string
}) {
  const [shipments, setShipments] = useState<ShipmentRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [carrier, setCarrier] = useState<ShipmentCarrier>('TRANSITAIRE')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [publicLink, setPublicLink] = useState<string | null>(null)

  const load = useCallback(() => {
    shipmentFetch<Paginated<ShipmentRow>>(`/?pageSize=25`).then((res) => {
      if (res.ok) {
        setShipments(res.data.items.filter((s) => s.purchaseOrder?.id === purchaseOrderId))
      }
    })
  }, [purchaseOrderId])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    setBusy(true)
    const res = await shipmentFetch<ShipmentDetail>('/', {
      method: 'POST',
      body: JSON.stringify({
        purchaseOrderId,
        ...(quoteRequestId ? { quoteRequestId } : {}),
        carrier,
        ...(trackingNumber.trim() && { trackingNumber: trackingNumber.trim() }),
        ...(mode ? { mode } : {}),
      }),
    })
    setBusy(false)
    if (!res.ok) return setError(res.message)
    setError(null)
    setTrackingNumber('')
    if (res.data.publicToken) {
      setPublicLink(
        `https://logistique.pieces.ci/suivi/${res.data.reference}?t=${res.data.publicToken}`,
      )
    }
    load()
  }

  const inputCls = 'rounded-sm border border-border-strong bg-card px-3 py-2 text-sm text-ink'

  return (
    <div className="space-y-3">
      {shipments.length > 0 ? (
        <ul className="space-y-2">
          {shipments.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-border p-3"
            >
              <div>
                <Link
                  href={`/admin/expeditions/${s.id}`}
                  className="font-mono text-[13px] underline underline-offset-2"
                >
                  {s.reference}
                </Link>
                <div className="text-[11.5px] text-muted">
                  {CARRIER_LABELS[s.carrier]}
                  {s.trackingNumber && <> · {s.trackingNumber}</>}
                </div>
              </div>
              <Chip variant={SHIPMENT_STATUS_CHIP[s.status]}>{SHIPMENT_STATUS_LABELS[s.status]}</Chip>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <select
            value={carrier}
            onChange={(e) => setCarrier(e.target.value as ShipmentCarrier)}
            className={inputCls}
            aria-label="Transporteur"
          >
            {CARRIERS.map((c) => (
              <option key={c} value={c}>
                {CARRIER_LABELS[c]}
              </option>
            ))}
          </select>
          <input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            placeholder="N° de suivi (facultatif)"
            className={`min-w-[180px] flex-1 ${inputCls}`}
          />
          <button
            type="button"
            disabled={busy}
            onClick={create}
            className="rounded-sm bg-ink px-3 py-2 text-[13px] text-card disabled:opacity-40"
          >
            Créer l’expédition
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-error-fg/30 bg-error-bg/40 p-3 text-[13px] text-error-fg">
          {error}
        </div>
      )}

      {publicLink && (
        <div className="rounded-md border border-success-fg/30 bg-success-bg/40 p-3 text-[13px] text-success-fg">
          <p className="mb-1 font-medium">Lien de suivi client — affiché une seule fois :</p>
          <code className="block break-all font-mono text-[12px]">{publicLink}</code>
        </div>
      )}
    </div>
  )
}
