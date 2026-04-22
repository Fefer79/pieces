'use client'

import { AboutSection } from '@/components/sections/about-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { ContactSection } from '@/components/sections/contact-section'
import { BottomNav } from '@/components/bottom-nav'

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-white pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-3">
          <a href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#a-propos" className="text-sm font-medium text-muted transition-colors hover:text-accent">À Propos</a>
            <a href="#comment-ca-marche" className="text-sm font-medium text-muted transition-colors hover:text-accent">Comment ça marche</a>
            <a href="#contact" className="text-sm font-medium text-muted transition-colors hover:text-accent">Contact</a>
          </nav>
          <a
            href="/"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Rechercher
          </a>
        </div>
      </header>

      <AboutSection />
      <HowItWorksSection />
      <ContactSection />

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div className="md:col-span-1">
              <span className="font-display text-2xl text-ink">
                Pièces<span className="text-accent">.</span>
              </span>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                La marketplace de pièces détachées automobiles en Côte d&apos;Ivoire. Prix transparents, multi-vendeurs, livraison au garage.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Plateforme</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="/browse" className="text-ink transition-colors hover:text-accent">Catalogue</a></li>
                <li><a href="#comment-ca-marche" className="text-ink transition-colors hover:text-accent">Comment ça marche</a></li>
                <li><a href="/enterprise" className="text-ink transition-colors hover:text-accent">Entreprises & flottes</a></li>
                <li><a href="#a-propos" className="text-ink transition-colors hover:text-accent">À propos</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Vendeurs</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li><a href="/seller/register" className="text-ink transition-colors hover:text-accent">Devenir vendeur</a></li>
                <li><a href="/seller/dashboard" className="text-ink transition-colors hover:text-accent">Espace vendeur</a></li>
                <li><a href="#cgv" className="text-ink transition-colors hover:text-accent">CGV</a></li>
                <li><a href="#confidentialite" className="text-ink transition-colors hover:text-accent">Confidentialité</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Contact</h3>
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
            <p className="text-xs text-muted-2">Fait à Abidjan</p>
          </div>
        </div>
      </footer>
      <BottomNav />
    </div>
  )
}
