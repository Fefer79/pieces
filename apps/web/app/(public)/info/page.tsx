'use client'

import { AboutSection } from '@/components/sections/about-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { ContactSection } from '@/components/sections/contact-section'
import { BottomNav } from '@/components/bottom-nav'

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-white pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E1DAC9]/50 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="/" className="flex-shrink-0">
            <span className="font-[family-name:Gloock,serif] text-2xl text-[#00113a]">
              Pièces<span className="text-[#ff6b00]">.</span>
            </span>
          </a>
          <a
            href="/"
            className="rounded-[14px] bg-[#ff6b00] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#B8760D]"
          >
            Rechercher
          </a>
        </div>
      </header>

      <AboutSection />
      <HowItWorksSection />
      <ContactSection />

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
      <BottomNav />
    </div>
  )
}
