import type { Metadata } from 'next'
import { canonicalFor } from '@/lib/logistique-content'
import { Calculateur } from './calculateur'

export const metadata: Metadata = {
  title: 'Calculateur d\'immobilisation — Combien vous coûte un véhicule à l\'arrêt ?',
  description:
    'Calculez le coût d\'arrêt d\'un véhicule de flotte : journée perdue, durée d\'immobilisation, options d\'acheminement. Estimation en FCFA, sans compte.',
  alternates: { canonical: canonicalFor('/calculateur') },
}

export default function LogistiqueCalculateurPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-8 lg:py-16">
      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
        Calculateur
      </div>
      <h1 className="mt-3 text-3xl text-ink lg:text-[40px]">
        Combien vous coûte un véhicule à l&apos;arrêt ?
      </h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
        Le chiffre que personne ne met dans la balance au moment d&apos;arbitrer entre « attendre »
        et « payer plus vite ». Ajustez les paramètres à votre exploitation — le résultat n&apos;a de
        valeur que si le paramètre est le vôtre.
      </p>
      <Calculateur />
    </section>
  )
}
