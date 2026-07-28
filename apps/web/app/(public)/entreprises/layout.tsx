import Link from 'next/link'

// Chrome de la vitrine flotte.pieces.ci : topbar + footer navy partagés par
// la landing, le calculateur ROI et le guide. Le navy structure, l'orange
// reste réservé au CTA (voir DESIGN.md — Redesign 2026-06).
export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-ink text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link href="/entreprises" className="font-display text-2xl leading-none">
            Pièces<span className="text-accent">.</span>
          </Link>
          <span className="border-l border-white/15 pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
            Entreprises
          </span>
          <nav className="ml-auto flex items-center gap-6">
            <Link
              href="/entreprises/calculateur-roi"
              className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
            >
              Calculateur ROI
            </Link>
            <Link
              href="/entreprises/guide"
              className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
            >
              Guide
            </Link>
            <Link
              href="/enterprise/dashboard"
              className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Créer mon compte
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-ink py-12 text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-6 px-4 lg:px-8">
          <Link href="/entreprises" className="font-display text-2xl leading-none text-white">
            Pièces<span className="text-accent">.</span>
          </Link>
          <nav className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <a href="https://pieces.ci" className="hover:text-white">
              pieces.ci
            </a>
            <Link href="/entreprises/calculateur-roi" className="hover:text-white">
              Calculateur ROI
            </Link>
            <Link href="/entreprises/guide" className="hover:text-white">
              Guide d&apos;utilisation
            </Link>
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </nav>
          <p className="w-full border-t border-white/15 pt-5 text-xs leading-relaxed">
            Activation des abonnements en phase pilote (semestre 1 2026) — activation
            manuelle par l&apos;équipe Pièces après inscription. Paiement automatisé et
            calculateur ROI public à venir.
          </p>
        </div>
      </footer>
    </div>
  )
}
