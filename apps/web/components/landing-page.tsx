'use client'

import { BrowseContent } from './browse-content'
import { useAuth } from '@/lib/auth-context'

const NAV_LINKS = [
  { href: '/info#a-propos', label: 'À Propos' },
  { href: '/info#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/info#contact', label: 'Contact' },
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </a>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted transition-colors hover:text-accent"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <a
            href={isAuthenticated ? '/profile' : '/login'}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {isAuthenticated ? 'Mon compte' : 'Connexion'}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-card px-6 pb-16 pt-12">
        <div className="mx-auto max-w-6xl">
          {/* Hero heading */}
          <div className="mb-10 text-center">
            <h1 className="mb-2 font-display text-3xl text-ink lg:text-4xl">
              Pièces détachées automobiles
            </h1>
            <p className="mx-auto mb-4 max-w-2xl text-base text-muted">
              La première marketplace de pièces auto en Côte d&apos;Ivoire.
              Prix transparents · Multi-vendeurs · Livraison au garage.
            </p>
            {/* Badges */}
            <div className="flex items-center justify-center gap-3">
              <span className="rounded-sm bg-ink-2 px-3 py-1.5 text-sm font-semibold text-white">
                NEUF·OEM
              </span>
              <span className="text-sm text-muted-2">&amp;</span>
              <span className="rounded-sm border-2 border-ink-2 px-3 py-1.5 text-sm font-semibold text-ink-2">
                OCCASION
              </span>
              <span className="text-sm text-muted-2">&amp;</span>
              <span className="rounded-sm border border-border-strong px-3 py-1.5 text-sm text-muted">
                AFTERMARKET
              </span>
            </div>
          </div>

          {/* Browse content card */}
          <div className="mx-auto max-w-3xl overflow-hidden rounded-lg border border-border bg-card shadow-sm">
            <BrowseContent variant="desktop" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="font-display text-xl text-ink">
            Pièces<span className="text-accent">.</span>
          </span>
          <p className="text-sm text-muted">
            &copy; {new Date().getFullYear()} Pièces.ci — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  )
}
