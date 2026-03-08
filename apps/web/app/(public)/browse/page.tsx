'use client'

import { LandingPage } from '@/components/landing-page'
import { BrowseContent } from '@/components/browse-content'
import { MobileDrawer } from '@/components/mobile-drawer'
import { BottomNav } from '@/components/bottom-nav'
import { AboutSection } from '@/components/sections/about-section'
import { HowItWorksSection } from '@/components/sections/how-it-works-section'
import { ContactSection } from '@/components/sections/contact-section'

export default function BrowsePage() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <LandingPage />
      </div>

      {/* Mobile */}
      <div className="flex min-h-dvh flex-col lg:hidden">
        {/* Header */}
        <header className="flex items-center justify-between bg-[#FDFBF7] px-4 pb-2 pt-4">
          <div className="flex flex-col">
            <span className="font-[family-name:Gloock,serif] text-3xl text-[#1A1714]">
              Pièces<span className="text-[#D4880F]">.</span>
            </span>
            <span className="text-xs tracking-wide text-[#1A1714]/60">
              Pièces détachées automobiles
            </span>
          </div>
          <MobileDrawer />
        </header>

        {/* Badges */}
        <div className="flex items-center justify-center gap-2 bg-[#FDFBF7] px-4 pb-3">
          <span className="rounded-md bg-[#D4880F] px-2.5 py-1 text-xs font-bold text-white">
            NEUF·OEM
          </span>
          <span className="text-xs text-[#1A1714]/40">&amp;</span>
          <span className="rounded-md border border-[#D4880F] px-2.5 py-1 text-xs font-bold text-[#D4880F]">
            OCCASION
          </span>
          <span className="text-xs text-[#1A1714]/40">&amp;</span>
          <span className="rounded-md border border-[#E1DAC9] px-2.5 py-1 text-xs text-[#1A1714]/60">
            AFTERMARKET
          </span>
        </div>

        {/* Browse content */}
        <BrowseContent variant="mobile" />

        {/* Sections */}
        <AboutSection />
        <HowItWorksSection />
        <ContactSection />

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </>
  )
}
