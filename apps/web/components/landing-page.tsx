'use client'

import type { ReactNode } from 'react'
import { BrowseContent } from './browse-content'
import { BrowseHeader } from './browse-header'
import { UniverseBar } from './universe-bar'
import { SiteFooter } from './site-footer'
import { LogistiqueSection } from './sections/logistique-section'
import { FleetSection } from './sections/fleet-section'
import { MecaniciensSection } from './sections/mecaniciens-section'

export function LandingPage({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FFFFFF]">
      <BrowseHeader />

      {/* Barre « 3 univers » — marketplace / flotte / logistique */}
      <UniverseBar active="marketplace" />

      {children}

      {/* Browse surface */}
      <section className="px-6 pb-16 pt-8">
        <div className="mx-auto max-w-[1280px]">
          <BrowseContent variant="desktop" />
        </div>
      </section>

      {/* Les autres univers, développés en bas de page */}
      <LogistiqueSection />
      <FleetSection />
      <MecaniciensSection />

      <SiteFooter />
    </div>
  )
}
