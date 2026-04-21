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

      {/* Browse surface */}
      <section className="px-6 pb-16 pt-8">
        <div className="mx-auto max-w-[1280px]">
          <BrowseContent variant="desktop" />
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
