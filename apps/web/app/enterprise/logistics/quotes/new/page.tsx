import { Suspense } from 'react'
import { FleetDevisProvider, FleetWizard } from './fleet-devis-context'

export const metadata = {
  title: 'Nouvelle cotation d\'import — Flotte',
  robots: { index: false, follow: false },
}

export default function NewFleetQuotePage() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Nouvelle cotation
        </div>
        <h1 className="mt-1 font-display text-3xl text-ink">Demander un import pour un véhicule</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Le VIN, la marque et le modèle du véhicule sont repris du parc de la flotte — il vous
          reste à décrire la pièce et à confirmer le contact.
        </p>
      </div>

      <Suspense fallback={<div className="text-sm text-muted">Chargement…</div>}>
        <FleetDevisProvider>
          <FleetWizard />
        </FleetDevisProvider>
      </Suspense>
    </div>
  )
}
