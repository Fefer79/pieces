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
        <header className="flex items-center justify-between bg-[#FAFAFA] px-4 pb-2 pt-4">
          <img
            src="/logo-pieces-light.svg"
            alt="PIÈCES.CI"
            className="h-20 w-auto"
          />
          <MobileDrawer />
        </header>

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
