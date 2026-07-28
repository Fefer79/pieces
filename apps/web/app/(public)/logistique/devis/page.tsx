import type { Metadata } from 'next'
import { Suspense } from 'react'
import { canonicalFor, LEAD_FORM_COPY } from '@/lib/logistique-content'
import { DevisPublicClient } from './devis-public-client'

export const metadata: Metadata = {
  title: 'Demander une cotation — Import de pièces détachées à Abidjan',
  description:
    'Décrivez la pièce, le véhicule et vos coordonnées. Estimation immédiate, sans compte, en deux minutes. Devis confirmé par WhatsApp sous deux heures ouvrées.',
  alternates: { canonical: canonicalFor('/devis') },
}

export default function DevisPage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8 lg:py-12">
      <div className="mb-6">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Estimation en deux minutes
        </div>
        <h1 className="mt-2 text-3xl text-ink lg:text-[36px]">Décrivez la pièce à importer.</h1>
        <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">
          Le nom de la pièce suffit pour démarrer. Plus vous ajoutez de preuves (VIN, photos, carte
          grise), plus le devis confirmé sera précis. Sans compte, sans engagement.
        </p>
      </div>

      <Suspense fallback={<WizardFallback />}>
        <DevisPublicClient />
      </Suspense>
    </section>
  )
}

function WizardFallback() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="h-10 rounded-md bg-card" />
        <div className="h-72 rounded-md border border-border bg-card" />
      </div>
      <aside className="space-y-4">
        <div className="h-40 rounded-md border border-border bg-card" />
        <div className="h-72 rounded-md border border-border bg-card" />
      </aside>
    </div>
  )
}
