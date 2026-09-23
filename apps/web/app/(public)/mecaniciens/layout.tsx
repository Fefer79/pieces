import Link from 'next/link'

// Chrome de la vitrine mecanicien.pieces.ci — même structure que
// entreprises/layout.tsx (topbar + footer navy), section propre à l'annuaire.
export default function MecaniciensLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-ink text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link href="/mecaniciens" className="font-display text-2xl leading-none">
            Pièces<span className="text-accent">.</span>
          </Link>
          <span className="border-l border-white/15 pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
            Mécaniciens
          </span>
          <nav className="ml-auto flex items-center gap-6">
            <Link
              href="/mecaniciens/comment-ca-marche"
              className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
            >
              Comment ça marche
            </Link>
            <Link
              href="/mecaniciens/inscription"
              className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Inscrire mon atelier
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-ink py-12 text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-6 px-4 lg:px-8">
          <Link href="/mecaniciens" className="font-display text-2xl leading-none text-white">
            Pièces<span className="text-accent">.</span>
          </Link>
          <nav className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <a href="https://pieces.ci" className="hover:text-white">
              pieces.ci
            </a>
            <Link href="/mecaniciens/comment-ca-marche" className="hover:text-white">
              Comment ça marche
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </nav>
          <p className="w-full border-t border-white/15 pt-5 text-xs leading-relaxed">
            Annuaire ouvert : les fiches sont publiées par les mécaniciens eux-mêmes et
            modérées a posteriori par l&apos;équipe Pièces.
          </p>
        </div>
      </footer>
    </div>
  )
}
