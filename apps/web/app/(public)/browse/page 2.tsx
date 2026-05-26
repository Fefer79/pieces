'use client'

import { LandingPage } from '@/components/landing-page'
import { BrowseContent } from '@/components/browse-content'
import { MobileDrawer } from '@/components/mobile-drawer'
import { BottomNav } from '@/components/bottom-nav'

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
        <header className="flex items-center justify-between bg-[#FFFFFF] px-4 pb-2 pt-4">
          <div className="flex flex-col">
            <span className="font-[family-name:Gloock,serif] text-3xl text-[#00113a]">
              Pièces<span className="text-[#ff6b00]">.</span>
            </span>
            <span className="text-xs tracking-wide text-[#00113a]/60">
              Pièces détachées automobiles
            </span>
          </div>
          <MobileDrawer />
        </header>

        {/* Badges */}
        <div className="flex items-center justify-center gap-2 bg-[#FFFFFF] px-4 pb-3">
          <span className="rounded-md bg-[#002366] px-2.5 py-1 text-xs font-bold text-white">
            NEUF·OEM
          </span>
          <span className="text-xs text-[#00113a]/40">&amp;</span>
          <span className="rounded-md border-2 border-[#002366] px-2.5 py-1 text-xs font-bold text-[#002366]">
            OCCASION
          </span>
          <span className="text-xs text-[#00113a]/40">&amp;</span>
          <span className="rounded-md border border-[#002366]/30 px-2.5 py-1 text-xs text-[#002366]/60">
            AFTERMARKET
          </span>
        </div>

        {/* Browse content */}
        <BrowseContent variant="mobile" />

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </>
  )
}
