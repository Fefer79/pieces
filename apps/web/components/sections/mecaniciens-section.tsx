import Link from 'next/link'

// Section « Services » de l'accueil achat — la porte d'entrée vers l'annuaire
// mécaniciens (mecanicien.pieces.ci). Même famille que LogistiqueSection et
// FleetSection : un univers connexe présenté au bas de la page d'accueil.

const CARDS = [
  {
    href: '/mecaniciens/carte',
    label: 'Carte des mécaniciens',
    description: 'Repérez les ateliers géolocalisés près de chez vous, commune par commune.',
  },
  {
    href: '/mecaniciens/proposer',
    label: 'Proposer un mécanicien',
    description: "Un atelier fiable qui n'est pas encore dans l'annuaire ? Proposez-le.",
  },
  {
    href: '/mecaniciens/comment-ca-marche',
    label: 'Comment ça marche',
    description: "Recherche, inscription, avis, propositions — le fonctionnement du service.",
  },
] as const

export function MecaniciensSection() {
  return (
    <section className="border-y border-border bg-surface">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:py-16">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          Services · Annuaire mécaniciens
        </div>
        <h2 className="mt-3 max-w-[24ch] text-3xl text-ink lg:text-[34px]">
          Besoin d&apos;un mécanicien de confiance ?
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-muted">
          Un annuaire ouvert d&apos;ateliers en Côte d&apos;Ivoire, inscrits par eux-mêmes et
          recommandés par leurs clients — indépendant du catalogue de pièces.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-md border border-border bg-card p-5 transition-all hover:border-border-strong hover:shadow-sm"
            >
              <h3 className="text-[16px] font-semibold text-ink">{card.label}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{card.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
