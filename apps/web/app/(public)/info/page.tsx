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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </a>
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
      <BottomNav />
    </div>
  )
}
