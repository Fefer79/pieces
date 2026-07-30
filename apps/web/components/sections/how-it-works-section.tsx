import Link from 'next/link'

// « Comment ça marche » — refonte 2026-07 : trois parcours (un par univers)
// au lieu de deux (entreprises / particuliers). Le parcours logistique était
// absent alors que c'est le seul recours quand la pièce n'existe pas à Abidjan.

type Step = { title: string; body: string }

type Parcours = {
  badge: string
  title: string
  intro: string
  href: string
  cta: string
  steps: [Step, Step, Step, Step]
}

const PARCOURS: Parcours[] = [
  {
    badge: 'Marketplace',
    title: "J'ai une pièce à remplacer",
    intro:
      "Le parcours standard, du diagnostic au garage jusqu'à la livraison. Une photo suffit pour démarrer.",
    href: '/browse',
    cta: 'Chercher ma pièce',
    steps: [
      {
        title: 'Le mécanicien démonte',
        body: "Il identifie la pièce défectueuse et la photographie — ou vous l'envoie si vous n'êtes pas sur place.",
      },
      {
        title: 'Pièces trouve les offres',
        body: 'Photo, référence OEM ou code VIN : nous remontons les annonces réellement compatibles avec votre véhicule.',
      },
      {
        title: 'Vous choisissez et payez',
        body: "Condition et prix détaillé pour chaque offre. Le propriétaire du véhicule peut payer depuis son téléphone, où qu'il soit.",
      },
      {
        title: 'Livraison au garage',
        body: "La pièce arrive chez le mécanicien. L'argent n'est versé au vendeur qu'après confirmation de réception.",
      },
    ],
  },
  {
    badge: 'Flotte',
    title: 'Je gère plusieurs véhicules',
    intro:
      "L'entretien d'un parc se pilote comme un budget, pas comme une suite d'urgences.",
    href: '/entreprises',
    cta: "Voir l'offre flotte",
    steps: [
      {
        title: 'Enregistrez la flotte',
        body: 'Import CSV ou saisie véhicule par véhicule. Chaque fiche porte son kilométrage, son historique et ses coûts.',
      },
      {
        title: 'Pilotez les coûts',
        body: 'Coût au kilomètre, dépense par catégorie, détection des véhicules « gouffres », alertes prédictives sur WhatsApp.',
      },
      {
        title: 'Commandez et réapprovisionnez',
        body: 'Comparez les fournisseurs sur une même grille, et laissez le stock tampon se reconstituer sur vos pièces critiques.',
      },
      {
        title: 'Facturez et recevez',
        body: "Une facture consolidée en fin de mois, et une livraison express au garage pour limiter l'immobilisation.",
      },
    ],
  },
  {
    badge: 'Logistique',
    title: "La pièce n'existe pas ici",
    intro:
      'Rare, récente, ou simplement absente du marché local : nous allons la chercher pour vous.',
    href: '/logistique/devis',
    cta: 'Demander une cotation',
    steps: [
      {
        title: 'Décrivez la pièce',
        body: 'Photo, référence ou simple description, avec votre véhicule. Sans compte, en deux minutes.',
      },
      {
        title: 'Estimation immédiate',
        body: 'Le coût rendu à Abidjan s’affiche tout de suite, poste par poste, avec le niveau de fiabilité du chiffre.',
      },
      {
        title: 'Devis confirmé',
        body: "Nous vérifions la disponibilité réelle et revenons avec un devis ferme et le mode d'acheminement retenu.",
      },
      {
        title: "Suivi jusqu'à la livraison",
        body: 'Un seul interlocuteur pour l’achat, le transport, la douane et la livraison. Vous suivez l’avancement par référence.',
      },
    ],
  },
]

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="bg-surface px-6 py-14 lg:py-16">
      <div className="mx-auto max-w-[1152px]">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Comment ça marche
        </div>
        <h2 className="mt-3 text-3xl text-ink lg:text-[34px]">
          Trois parcours, selon votre situation.
        </h2>

        <div className="mt-7">
          {PARCOURS.map((p) => (
            <div
              key={p.badge}
              className="grid gap-8 border-t border-border py-10 lg:grid-cols-[260px_1fr] lg:gap-10"
            >
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                  {p.badge}
                </span>
                <h3 className="mt-2.5 text-[24px] text-ink lg:text-[26px]">{p.title}</h3>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{p.intro}</p>
                <Link
                  href={p.href}
                  className="mt-4 inline-block text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {p.cta} →
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {p.steps.map((step, i) => (
                  <div key={step.title} className="relative border-t-2 border-border pt-5">
                    <span className="tabular absolute -top-3 left-0 bg-surface pr-2 font-mono text-[13px] text-accent">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h4 className="font-display text-[18px] leading-tight text-ink">{step.title}</h4>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{step.body}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
