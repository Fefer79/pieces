import Link from 'next/link'

/**
 * Standalone chrome for public legal / transparency pages
 * (privacy policy, terms, OAuth consent disclosure).
 * Branded header + footer, no AppShell, reachable without authentication.
 */
export function LegalShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string
  title: string
  intro?: string
  children: React.ReactNode
}) {
  const year = 2026

  return (
    <div className="min-h-screen bg-white pb-16">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[880px] items-center justify-between px-6 py-3">
          <Link href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-6">
        <section className="border-b border-border py-12">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">{title}</h1>
          {intro && (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">{intro}</p>
          )}
        </section>

        <div className="py-10">{children}</div>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[880px] flex-col items-center justify-between gap-3 px-6 py-8 md:flex-row">
          <span className="font-display text-xl text-ink">
            Pièces<span className="text-accent">.</span>
          </span>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
            <Link href="/confidentialite" className="transition-colors hover:text-accent">
              Confidentialité
            </Link>
            <Link href="/cgu" className="transition-colors hover:text-accent">
              CGU
            </Link>
            <span>&copy; {year} Pièces.ci — Abidjan, Côte d’Ivoire</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** A titled section within a legal page. */
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-8 first:border-t-0 first:pt-0">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <div className="mt-4 space-y-3 text-base leading-relaxed text-muted">{children}</div>
    </section>
  )
}
