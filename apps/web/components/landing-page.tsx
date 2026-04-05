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
      <header className="sticky top-0 z-40 border-b border-[#E1DAC9]/50 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          {/* Logo */}
          <a href="/" className="flex-shrink-0">
            <span className="font-[family-name:Gloock,serif] text-2xl text-[#00113a]">
              Pièces<span className="text-[#ff6b00]">.</span>
            </span>
          </a>

          {/* Nav links */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#00113a]/60 transition-colors hover:text-[#ff6b00]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <a
            href={isAuthenticated ? '/profile' : '/login'}
            className="rounded-[14px] bg-[#ff6b00] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B8760D]"
          >
            {isAuthenticated ? 'Mon compte' : 'Connexion'}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#FFFFFF] px-6 pb-16 pt-12">
        <div className="mx-auto max-w-6xl">
          {/* Hero heading */}
          <div className="mb-10 text-center">
            <h1 className="mb-2 font-[family-name:Gloock,serif] text-3xl text-[#00113a] lg:text-4xl">
              Pièces détachées automobiles
            </h1>
            <p className="mx-auto mb-4 max-w-2xl text-base text-[#00113a]/60">
              La première marketplace de pièces auto en Côte d&apos;Ivoire.
              Prix transparents · Multi-vendeurs · Livraison au garage.
            </p>
            {/* Badges */}
            <div className="flex items-center justify-center gap-3">
              <span className="rounded-md bg-[#002366] px-3 py-1.5 text-sm font-bold text-white">
                NEUF·OEM
              </span>
              <span className="text-sm text-[#00113a]/40">&amp;</span>
              <span className="rounded-md border-2 border-[#002366] px-3 py-1.5 text-sm font-bold text-[#002366]">
                OCCASION
              </span>
              <span className="text-sm text-[#00113a]/40">&amp;</span>
              <span className="rounded-md border border-[#002366]/30 px-3 py-1.5 text-sm text-[#002366]/60">
                AFTERMARKET
              </span>
            </div>
          </div>

          {/* Browse content card */}
          <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-[#E1DAC9]/50 bg-white shadow-sm">
            <BrowseContent variant="desktop" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E1DAC9]/50 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 md:flex-row md:justify-between">
          <span className="font-[family-name:Gloock,serif] text-xl text-[#00113a]">
            Pièces<span className="text-[#ff6b00]">.</span>
          </span>
          <p className="text-sm text-[#00113a]/50">
            &copy; {new Date().getFullYear()} Pièces.ci — Tous droits réservés
          </p>
        </div>
      </footer>
    </div>
  )
}
