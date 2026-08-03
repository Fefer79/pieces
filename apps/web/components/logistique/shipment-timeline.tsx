import { Chip, type ChipVariant } from '@/components/ui/chip'

// Frise d'expédition côté CLIENT.
//
// Règles produit (lib/logistique-content.ts) : aucun coût n'apparaît ici, et le
// transitaire partenaire n'est jamais nommé — l'API renvoie déjà un
// `carrierLabel` anonymisé et n'expose le numéro de suivi que pour DHL/FedEx/UPS
// (cf. toPublicShipment, apps/api/src/modules/sourcing/shipment.service.ts).

export interface PublicShipment {
  reference: string
  status: string
  carrierLabel: string
  trackingNumber: string | null
  trackingUrl: string | null
  etaAt: string | null
  departedAt: string | null
  customsClearedAt: string | null
  arrivedAt: string | null
  deliveredAt: string | null
  events: Array<{
    id: string
    toStatus: string | null
    label: string
    location: string | null
    occurredAt: string
  }>
}

/** Formulations orientées client — miroir des `publicLabel` de constants/carriers.ts. */
const STEPS: Array<{ key: string; label: string }> = [
  { key: 'SOURCING', label: 'Recherche de la pièce' },
  { key: 'COLLECTED', label: 'Pièce récupérée chez le fournisseur' },
  { key: 'IN_TRANSIT', label: 'En route vers Abidjan' },
  { key: 'CUSTOMS', label: 'Formalités douanières à Abidjan' },
  { key: 'LOCAL_DELIVERY', label: 'En cours de livraison' },
  { key: 'DELIVERED', label: 'Livrée' },
]

const STATUS_CHIP: Record<string, ChipVariant> = {
  SOURCING: 'plain',
  COLLECTED: 'oem',
  IN_TRANSIT: 'status-warn',
  CUSTOMS: 'status-warn',
  LOCAL_DELIVERY: 'oem',
  DELIVERED: 'status-ok',
  CANCELLED: 'status-err',
}

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : null

export function ShipmentTimeline({ shipment }: { shipment: PublicShipment }) {
  const currentIndex = STEPS.findIndex((s) => s.key === shipment.status)
  const cancelled = shipment.status === 'CANCELLED'

  // Date atteinte pour chaque étape, prise sur le premier événement l'ayant marquée.
  const reachedAt = new Map<string, string>()
  for (const event of shipment.events) {
    if (event.toStatus && !reachedAt.has(event.toStatus)) {
      reachedAt.set(event.toStatus, event.occurredAt)
    }
  }

  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Votre expédition
        </h2>
        <Chip variant={STATUS_CHIP[shipment.status] ?? 'plain'}>
          {cancelled ? 'Annulée' : (STEPS[currentIndex]?.label ?? shipment.status)}
        </Chip>
        <span className="ml-auto font-mono text-[12px] text-muted-2">{shipment.reference}</span>
      </div>

      <ol className="space-y-2.5">
        {STEPS.map((step, i) => {
          const done = !cancelled && currentIndex >= 0 && i <= currentIndex
          const at = fmtDate(reachedAt.get(step.key) ?? null)
          return (
            <li key={step.key} className="flex items-start gap-3">
              <span
                aria-hidden
                className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                  done ? 'bg-success-fg' : 'bg-border-strong'
                }`}
              />
              <div className="min-w-0 flex-1">
                <div className={`text-[13.5px] ${done ? 'text-ink' : 'text-muted-2'}`}>
                  {step.label}
                </div>
                {at && <div className="font-mono text-[11.5px] text-muted-2">{at}</div>}
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 border-t border-border pt-3 text-[12.5px] text-muted">
        <p>
          Acheminement assuré par {shipment.carrierLabel}.
          {shipment.etaAt && <> Arrivée estimée le {fmtDate(shipment.etaAt)}.</>}
        </p>
        {shipment.trackingUrl && shipment.trackingNumber && (
          <p className="mt-1">
            Suivi transporteur :{' '}
            <a
              href={shipment.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-ink underline underline-offset-2"
            >
              {shipment.trackingNumber}
            </a>
          </p>
        )}
        <p className="mt-1">Les dates sont des estimations, pas un engagement contractuel.</p>
      </div>
    </div>
  )
}
