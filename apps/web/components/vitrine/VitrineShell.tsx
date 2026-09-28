import Link from 'next/link'

// Le middleware réécrit les sous-domaines de façon transparente
// (mecanicien.pieces.ci → /mecaniciens) : un <Link> relatif reste donc sur la
// vitrine. Pour sortir vers la marketplace il faut une URL absolue.
export const MARKETPLACE_URL = 'https://pieces.ci'
export const MARKETPLACE_HOME_URL = `${MARKETPLACE_URL}/browse`

export interface VitrineNavItem {
  label: string
  href: string
}

interface VitrineShellProps {
  /** Racine de la vitrine (ex. « /mecaniciens ») : cible du libellé de section. */
  homeHref: string
  /** Libellé de section affiché à côté du logo (ex. « Mécaniciens »). */
  section: string
  /** Liens de navigation, repris dans le header (desktop) et le footer. */
  nav: readonly VitrineNavItem[]
  /** CTA du header (bouton orange, ou menu déroulant). */
  cta: React.ReactNode
  /** Mention légale / contexte en bas du footer. */
  footerNote: React.ReactNode
  children: React.ReactNode
}

// Chrome commun aux vitrines (mecanicien / logistique / flotte) : topbar +
// footer navy. Le navy structure, l'orange reste réservé au CTA (DESIGN.md —
// Redesign 2026-06).
//
// ⚠ Aucun composant de cet arbre ne doit importer @/lib/supabase,
// @/lib/auth-context ni un client *-api.ts : la vitrine ne doit jamais
// instancier de client Supabase (voir lib/cookie-domain.ts, ticker de refresh).
export function VitrineShell({
  homeHref,
  section,
  nav,
  cta,
  footerNote,
  children,
}: VitrineShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-ink text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-8">
          <a
            href={MARKETPLACE_HOME_URL}
            aria-label="Pièces — accueil"
            className="font-display text-2xl leading-none"
          >
            Pièces<span className="text-accent">.</span>
          </a>
          <Link
            href={homeHref}
            className="border-l border-white/15 pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/60 hover:text-white"
          >
            {section}
          </Link>
          <nav className="ml-auto flex items-center gap-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
              >
                {item.label}
              </Link>
            ))}
            {cta}
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-ink py-12 text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-6 px-4 lg:px-8">
          <a
            href={MARKETPLACE_HOME_URL}
            aria-label="Pièces — accueil"
            className="font-display text-2xl leading-none text-white"
          >
            Pièces<span className="text-accent">.</span>
          </a>
          <nav className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <a href={MARKETPLACE_URL} className="hover:text-white">
              pieces.ci
            </a>
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </nav>
          <p className="w-full border-t border-white/15 pt-5 text-xs leading-relaxed">
            {footerNote}
          </p>
        </div>
      </footer>
    </div>
  )
}

interface VitrineCtaLinkProps {
  href: string
  children: React.ReactNode
}

// Bouton orange du header — seul élément orange du chrome.
export function VitrineCtaLink({ href, children }: VitrineCtaLinkProps) {
  return (
    <Link
      href={href}
      className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
    >
      {children}
    </Link>
  )
}
