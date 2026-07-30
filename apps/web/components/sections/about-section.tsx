import Link from 'next/link'
import { Chip } from '@/components/ui/chip'

// « À propos » — refonte 2026-07 : passage aux tokens DESIGN.md (l'ancienne
// version utilisait des gris/bleus Tailwind bruts) et intégration des trois
// univers (marketplace / flotte / logistique) plutôt que des trois rôles.

const PILIERS = [
  {
    eyebrow: 'Le problème',
    title: 'Personne ne connaît le vrai prix',
    body: "Entre le propriétaire du véhicule et le vendeur s'empilent des intermédiaires dont la marge n'apparaît nulle part. Deux personnes achètent la même pièce au double du prix l'une de l'autre, le même jour, dans la même rue.",
  },
  {
    eyebrow: 'Ce que nous faisons',
    title: "Le prix et l'état, écrits noir sur blanc",
    body: "Chaque annonce affiche sa condition — neuf, occasion importée, ré-usiné, aftermarket, OEM — et le détail complet du prix avant le paiement : part vendeur, livraison, frais de plateforme. Aucun montant n'apparaît après coup.",
  },
  {
    eyebrow: 'Comment nous gagnons',
    title: "Une commission annoncée, rien d'autre",
    body: "Nous prenons une commission visible sur chaque transaction, et un abonnement pour les flottes qui veulent piloter leurs coûts. Pas de marge caviardée dans le prix de la pièce : c'est notre seul modèle.",
  },
]

const SERVICES = [
  {
    badge: 'Marketplace',
    title: 'Acheter une pièce',
    body: "Des milliers d'annonces de vendeurs d'Abidjan, filtrées par compatibilité avec votre véhicule. Paiement sécurisé, livraison au garage, garantie sur la pièce intermédiée.",
    href: '/browse',
    cta: 'Ouvrir le catalogue',
  },
  {
    badge: 'Flotte',
    title: 'Piloter un parc de véhicules',
    body: 'Tableau de bord des coûts véhicule par véhicule, alertes d’entretien prédictives, stock tampon automatique et facture consolidée. Pour les entreprises, VTC et loueurs.',
    href: '/entreprises',
    cta: "Voir l'offre flotte",
  },
  {
    badge: 'Logistique',
    title: "Faire venir l'introuvable",
    body: "Quand aucun vendeur n'a la pièce, nous la sourçons à l'étranger : aérien, maritime groupé ou achat local. Le coût rendu à Abidjan est annoncé poste par poste, douane comprise.",
    href: '/logistique',
    cta: 'Découvrir la logistique',
  },
]

const PRICE_LINES: Array<{ label: string; amount: number }> = [
  { label: 'Pièce — part vendeur', amount: 28000 },
  { label: 'Main d’œuvre garage', amount: 12000 },
  { label: 'Livraison Abidjan', amount: 2500 },
  { label: 'Frais Pièces', amount: 1400 },
]

const PRICE_TOTAL = PRICE_LINES.reduce((sum, line) => sum + line.amount, 0)

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} F`

function UniverseBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border-strong px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
      {children}
    </span>
  )
}

export function AboutSection() {
  return (
    <>
      <section id="a-propos" className="bg-surface px-6 py-14 lg:py-16">
        <div className="mx-auto max-w-[1152px]">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            À propos
          </div>
          <h1 className="mt-3.5 max-w-[20ch] text-[34px] text-ink lg:text-[44px]">
            Pièces optimise les dépenses auto de tout le monde.
          </h1>
          <p className="mt-4 max-w-[70ch] text-[16px] leading-relaxed text-muted lg:text-[17px]">
            À Abidjan, le prix d&apos;une pièce dépend surtout de qui vous êtes et de qui vous
            connaissez. Nous avons construit l&apos;inverse : un marché où chaque annonce montre sa
            condition et le détail de son prix, où le devis d&apos;import est chiffré poste par
            poste, et où une flotte voit enfin où part son argent.
          </p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {PILIERS.map((p) => (
              <div key={p.title} className="border-t-2 border-ink pt-4">
                <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
                  {p.eyebrow}
                </div>
                <h3 className="mt-2 text-[20px] text-ink">{p.title}</h3>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Les trois univers — même contenu que la barre de navigation, développé */}
      <section className="border-y border-border bg-card px-6 py-14 lg:py-16">
        <div className="mx-auto max-w-[1152px]">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Nos trois services
          </div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[34px]">
            Une pièce, trois façons de l&apos;obtenir.
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-muted">
            Le même compte, le même catalogue et la même exigence de transparence — selon que la
            pièce est disponible, que vous gérez un parc, ou qu&apos;il faut aller la chercher à
            l&apos;étranger.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {SERVICES.map((s) => (
              <article
                key={s.title}
                className="flex flex-col rounded-md border border-border bg-surface p-5"
              >
                <UniverseBadge>{s.badge}</UniverseBadge>
                <h3 className="mt-3.5 text-[19px] text-ink">{s.title}</h3>
                <p className="mt-2.5 flex-1 text-[14px] leading-relaxed text-muted">{s.body}</p>
                <Link
                  href={s.href}
                  className="mt-4 text-[13.5px] font-semibold text-accent transition-colors hover:text-accent-hover"
                >
                  {s.cta} →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* La transparence, concrètement — l'USP rendue vérifiable (DESIGN.md) */}
      <section className="bg-ink px-6 py-14 text-white lg:py-16">
        <div className="mx-auto grid max-w-[1152px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
              Notre règle
            </div>
            <h2 className="mt-3 max-w-[22ch] text-3xl text-white lg:text-[34px]">
              Vous voyez le prix complet avant de payer.
            </h2>
            <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-white/65">
              Sur chaque commande, le détail est affiché avant le bouton de paiement. Si un montant
              n&apos;est pas dans ce décompte, il ne vous sera pas demandé.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Chip variant="neuf">Neuf</Chip>
              <Chip variant="occasion">Occasion importée</Chip>
              <Chip variant="reusine">Ré-usiné</Chip>
              <Chip variant="aftermarket">Aftermarket</Chip>
              <Chip variant="oem" className="!bg-white/15 !text-white">
                OEM
              </Chip>
            </div>
            <p className="mt-3.5 font-mono text-[11px] uppercase tracking-[0.1em] text-white/45">
              La condition est affichée sur chaque annonce, jamais enterrée dans le texte
            </p>
          </div>

          <div className="rounded-md border border-white/20 px-7 py-6">
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-white/55">
              Exemple de récapitulatif
            </div>
            <div className="mt-2.5">
              {PRICE_LINES.map((line) => (
                <div
                  key={line.label}
                  className="flex items-baseline gap-2.5 py-1.5 text-[14.5px] text-white/85"
                >
                  <span>{line.label}</span>
                  <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-white/25" />
                  <span className="tabular whitespace-nowrap font-mono">{fcfa(line.amount)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3.5 flex items-baseline gap-2 border-t-2 border-white/30 pt-3.5">
              <span className="text-[15px] font-bold">Total à payer</span>
              <span className="tabular ml-auto font-mono text-[24px]">{fcfa(PRICE_TOTAL)}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
