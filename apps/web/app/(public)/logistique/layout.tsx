import Link from 'next/link'
import { LOGISTIQUE_NAV, LOGISTIQUE_FOOTER_NOTE } from '@/lib/logistique-content'

// Chrome de la vitrine logistique.pieces.ci : topbar + footer navy partagés par
// la landing, le calculateur, la FAQ et le parcours de cotation. Le navy
// structure, l'orange reste réservé au CTA (DESIGN.md — Redesign 2026-06).
//
// ⚠ Aucun composant de cet arbre ne doit importer @/lib/supabase,
// @/lib/auth-context ni un client *-api.ts : la vitrine ne doit jamais
// instancier de client Supabase (voir lib/cookie-domain.ts, ticker de refresh).
export default function LogistiqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-ink text-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 lg:px-8">
          <Link href="/logistique" className="font-display text-2xl leading-none">
            Pièces<span className="text-accent">.</span>
          </Link>
          <span className="border-l border-white/15 pl-3 font-mono text-[10px] font-medium uppercase tracking-[0.12em] text-white/60">
            Logistique
          </span>
          <nav className="ml-auto flex items-center gap-6">
            {LOGISTIQUE_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="hidden text-sm font-medium text-white/70 hover:text-white md:block"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/logistique/devis"
              className="rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Demander une cotation
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-ink py-12 text-white/60">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-6 px-4 lg:px-8">
          <Link href="/logistique" className="font-display text-2xl leading-none text-white">
            Pièces<span className="text-accent">.</span>
          </Link>
          <nav className="ml-auto flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <a href="https://pieces.ci" className="hover:text-white">
              pieces.ci
            </a>
            {LOGISTIQUE_NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
            <Link href="/contact" className="hover:text-white">
              Contact
            </Link>
          </nav>
          <p className="w-full border-t border-white/15 pt-5 text-xs leading-relaxed">
            {LOGISTIQUE_FOOTER_NOTE}
          </p>
        </div>
      </footer>
    </div>
  )
}
