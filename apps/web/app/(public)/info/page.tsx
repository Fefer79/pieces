'use client'

import { AboutSection } from '@/components/sections/about-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { ContactSection } from '@/components/sections/contact-section'
import { BottomNav } from '@/components/bottom-nav'
import { UniverseBar } from '@/components/universe-bar'
import { SiteFooter } from '@/components/site-footer'

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

      <UniverseBar />

      <AboutSection />
      <HowItWorksSection />
      <ContactSection />

      <SiteFooter />
      <BottomNav />
    </div>
  )
}
