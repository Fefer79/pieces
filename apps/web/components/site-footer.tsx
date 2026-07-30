import Link from 'next/link'

// Footer public partagé (accueil + /info). Cinq colonnes : la marque, puis un
// bloc par univers (marketplace / flotte / logistique) et le contact — c'est le
// seul endroit du site où les trois domaines sont listés exhaustivement.

const WA_NUMBER = '2250706846268'

type FooterLink = { href: string; label: string; external?: boolean }

const COLUMNS: Array<{ title: string; links: FooterLink[] }> = [
  {
    title: 'Marketplace',
    links: [
      { href: '/browse', label: 'Catalogue' },
      { href: '/info#comment-ca-marche', label: 'Comment ça marche' },
      { href: '/info#a-propos', label: 'À propos' },
      { href: '/seller/register', label: 'Devenir vendeur' },
    ],
  },
  {
    title: 'Flotte',
    links: [
      { href: '/entreprises', label: 'Offre entreprises' },
      { href: '/entreprises/calculateur-roi', label: 'Calculateur ROI' },
      { href: '/entreprises/guide', label: 'Guide flotte' },
      { href: '/enterprise', label: 'Mon espace flotte' },
    ],
  },
  {
    title: 'Logistique',
    links: [
      { href: '/logistique', label: "Le service d'import" },
      { href: '/logistique/devis', label: 'Demander une cotation' },
      { href: '/logistique/calculateur', label: 'Calculateur coût rendu' },
      { href: '/logistique/flottes-vtc', label: 'Flottes VTC' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-[1280px] px-6 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.1fr]">
          <div>
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Trois services, une seule adresse : acheter la pièce, piloter la flotte, importer ce
              qui manque. Abidjan, Côte d&apos;Ivoire.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-ink transition-colors hover:text-accent">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Contact
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="text-muted">Abidjan, Côte d&apos;Ivoire</li>
              <li>
                <a
                  href={`https://wa.me/${WA_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ink transition-colors hover:text-accent"
                >
                  WhatsApp · +225 07 06 84 62 68
                </a>
              </li>
              <li>
                <a
                  href="mailto:contact@pieces.ci"
                  className="text-ink transition-colors hover:text-accent"
                >
                  contact@pieces.ci
                </a>
              </li>
              <li>
                <Link href="/cgu" className="text-ink transition-colors hover:text-accent">
                  CGV · Confidentialité
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} Pièces.ci — Tous droits réservés
          </p>
          <p className="text-xs text-muted-2">Fait à Abidjan</p>
        </div>
      </div>
    </footer>
  )
}
