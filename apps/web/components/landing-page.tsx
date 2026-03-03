'use client'

import { BrowseContent } from './browse-content'
import { AboutSection } from './sections/about-section'
import { HowItWorksSection } from './sections/how-it-works-section'
import { ContactSection } from './sections/contact-section'

const NAV_LINKS = [
  { href: '#a-propos', label: 'À Propos' },
  { href: '#comment-ca-marche', label: 'Comment ça marche' },
  { href: '#contact', label: 'Contact' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <img
              src="/logo-pieces-light.svg"
              alt="PIÈCES.CI"
              className="h-12 w-auto"
            />
          </a>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 transition-colors hover:text-[#1976D2]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <a
            href="/login"
            className="rounded-lg bg-[#1976D2] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1565C0]"
          >
            Connexion
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-[#FAFAFA] px-6 pb-16 pt-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h1 className="mb-4 text-3xl font-bold text-[#1A1A1A] lg:text-4xl">
              Trouvez vos pièces auto d&apos;occasion à Abidjan
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600">
              La première marketplace de pièces automobiles d&apos;occasion en
              Côte d&apos;Ivoire. Recherche par photo, VIN ou nom de pièce.
            </p>
          </div>

          {/* Browse content card */}
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <BrowseContent variant="desktop" />
          </div>
        </div>
      </section>

      {/* Sections */}
      <AboutSection />
      <HowItWorksSection />
      <ContactSection />

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:justify-between">
          <img
            src="/logo-pieces-light.svg"
            alt="PIÈCES.CI"
            className="h-8 w-auto"
          />
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Pièces.ci — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  )
}
