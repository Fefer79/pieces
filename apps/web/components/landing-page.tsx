'use client'

import { BrowseContent } from './browse-content'
import { useAuth } from '@/lib/auth-context'
import { useSelectedVehicle } from '@/lib/selected-vehicle'

const NAV_LINKS = [
  { href: '/info#a-propos', label: 'À Propos' },
  { href: '/info#comment-ca-marche', label: 'Comment ça marche' },
  { href: '/info#contact', label: 'Contact' },
]

export function LandingPage() {
  const { isAuthenticated } = useAuth()
  const { vehicle, clearVehicle } = useSelectedVehicle()

  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-6 px-6 py-3">
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

          <div className="flex flex-1 items-center justify-end gap-3">
            {/* Vehicle pill */}
            {vehicle && (
              <div className="hidden items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs md:flex">
                <span className="text-muted">Véhicule :</span>
                <span className="font-medium text-ink">
                  {vehicle.brand} · {vehicle.model}
                  {vehicle.year ? ` · ${vehicle.year}` : ''}
                </span>
                <button
                  type="button"
                  onClick={clearVehicle}
                  className="text-muted-2 transition-colors hover:text-ink"
                  aria-label="Supprimer le véhicule"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
            )}

            {/* CTA */}
            <a
              href={isAuthenticated ? '/profile' : '/login'}
              className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {isAuthenticated ? 'Mon compte' : 'Connexion'}
            </a>
          </div>
        </div>
      </header>

      {/* Browse surface */}
      <section className="px-6 pb-16 pt-8">
        <div className="mx-auto max-w-[1280px]">
          <BrowseContent variant="desktop" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <span className="font-display text-2xl text-ink">
                Pièces<span className="text-accent">.</span>
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                La marketplace de pièces détachées automobiles en Côte d&apos;Ivoire. Prix transparents, multi-vendeurs, livraison au garage.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Plateforme
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="/browse" className="text-ink transition-colors hover:text-accent">Catalogue</a></li>
                <li><a href="/info#comment-ca-marche" className="text-ink transition-colors hover:text-accent">Comment ça marche</a></li>
                <li><a href="/enterprise" className="text-ink transition-colors hover:text-accent">Entreprises & flottes</a></li>
                <li><a href="/info#a-propos" className="text-ink transition-colors hover:text-accent">À propos</a></li>
              </ul>
            </div>

            {/* Vendeurs & légal */}
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Vendeurs
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="/seller/register" className="text-ink transition-colors hover:text-accent">Devenir vendeur</a></li>
                <li><a href="/seller/dashboard" className="text-ink transition-colors hover:text-accent">Espace vendeur</a></li>
                <li><a href="/info#cgv" className="text-ink transition-colors hover:text-accent">CGV</a></li>
                <li><a href="/info#confidentialite" className="text-ink transition-colors hover:text-accent">Confidentialité</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Contact
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li className="text-muted">Abidjan, Côte d&apos;Ivoire</li>
                <li>
                  <a href="https://wa.me/2250709021708" target="_blank" rel="noopener noreferrer" className="text-ink transition-colors hover:text-accent">
                    WhatsApp · +225 07 09 02 17 08
                  </a>
                </li>
                <li>
                  <a href="mailto:contact@pieces.ci" className="text-ink transition-colors hover:text-accent">
                    contact@pieces.ci
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 md:flex-row">
            <p className="text-xs text-muted">
              &copy; {new Date().getFullYear()} Pièces.ci — Tous droits réservés
            </p>
            <p className="text-xs text-muted-2">
              Fait à Abidjan
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
