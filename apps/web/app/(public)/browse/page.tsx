'use client'

import { useState } from 'react'
import { useSelectedVehicle } from '@/lib/selected-vehicle'
import { LandingPage } from '@/components/landing-page'
import { BrowseContent } from '@/components/browse-content'
import { MobileDrawer } from '@/components/mobile-drawer'
import { BottomNav } from '@/components/bottom-nav'
import { UniverseBar } from '@/components/universe-bar'
import { LogistiqueSection } from '@/components/sections/logistique-section'
import { FleetSection } from '@/components/sections/fleet-section'
import { PromoCarousel, type PromoSlide } from '@/components/ui/promo-carousel'

function PromoArt({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className="h-full w-full rounded-md object-cover" />
  )
}

const PROMO_SLIDES: PromoSlide[] = [
  {
    id: 'intro',
    eyebrow: 'Pièces.ci',
    title: 'La marketplace des vendeurs de pièces détachées en Côte d\u2019Ivoire',
    description: 'Prix transparents · Multi-vendeurs · Livraison au garage.',
    cta: { label: 'Comment ça marche', href: '/info' },
    art: <PromoArt src="/promo/transparence.webp" alt="Marché de pièces auto à Abidjan" />,
    theme: 'navy',
  },
  {
    id: 'transparence',
    eyebrow: 'La transparence d\u2019abord',
    title: 'Le juste prix des pièces, sans intermédiaires.',
    description:
      'Neuves, occasions importées, ré-usinées \u2014 chaque annonce affiche le détail du prix. Vous payez ce que ça vaut, pas ce qu\u2019on décide pour vous.',
    cta: { label: 'Comment ça marche', href: '/info' },
    art: <PromoArt src="/promo/intro.webp" alt="Mains de mécanicien tenant une clé à molette" />,
    theme: 'cream',
  },
  {
    id: 'flotte',
    eyebrow: 'Entreprises · Gestion de flotte',
    title: 'Vous êtes une entreprise ? Vous avez une flotte ?',
    description:
      'Tableau de bord multi-véhicules, détection des véhicules « gouffres », alertes prédictives WhatsApp, stock tampon auto, factures DGI consolidées, livraison express. Pilotez votre flotte, réduisez vos coûts.',
    cta: { label: 'Enregistrer ma flotte', href: '/enterprise/register' },
    secondaryCta: { label: 'Nos services entreprise', href: '/entreprises' },
    art: <PromoArt src="/promo/flotte.webp" alt="Flotte de véhicules utilitaires" />,
    theme: 'cream',
  },
  {
    id: 'logistique',
    eyebrow: 'Logistique d\u2019import \u00b7 logistique.pieces.ci',
    title: 'La pièce n\u2019existe pas à Abidjan ? On va la chercher.',
    description:
      'Aérien 3 à 7 jours, maritime groupé ou achat local. Le coût rendu est annoncé poste par poste \u2014 pièce, acheminement, douane, livraison. Estimation immédiate, sans compte.',
    cta: { label: 'Demander une cotation', href: '/logistique/devis' },
    secondaryCta: { label: 'Comment ça marche', href: '/logistique' },
    art: <PromoArt src="/promo/reusine.webp" alt="Pièce détachée emballée pour expédition" />,
    theme: 'orange',
  },
  {
    id: 'conseil',
    eyebrow: 'Nouveau \u00b7 Service Conseil IA + expert',
    title: 'Un doute ? Demandez-nous.',
    description:
      'Un assistant répond 24h/24 aux questions de compatibilité et choix. Cas complexe ? Un expert prend le relais sous 30 minutes. Gratuit avant achat.',
    cta: { label: 'Démarrer une conversation', href: '/contact' },
    art: <PromoArt src="/promo/conseil.webp" alt="Technicien ivoirien consultant son smartphone" />,
    theme: 'navy',
  },
]

export default function BrowsePage() {
  const { vehicle } = useSelectedVehicle()
  // Carrousel promo replié sur mobile dès qu'un véhicule est sélectionné,
  // pour laisser la place au catalogue des pièces compatibles.
  const [promoOpen, setPromoOpen] = useState(false)

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <LandingPage>
          <div className="mx-auto max-w-[1280px] px-6 pt-8">
            <PromoCarousel slides={PROMO_SLIDES} />
          </div>
        </LandingPage>
      </div>

      {/* Mobile */}
      <div className="flex min-h-dvh flex-col pb-[calc(env(safe-area-inset-bottom)+5rem)] lg:hidden">
        {/* Header */}
        <header className="flex items-center justify-between bg-card px-4 pb-2 pt-4">
          <a href="/" className="flex flex-col">
            <span className="font-display text-3xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">
              Pièces détachées automobiles
            </span>
          </a>
          <MobileDrawer />
        </header>

        {/* Mobile contacts */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-border bg-card px-4 py-2 text-xs">
          <a
            href="mailto:contact@pieces.ci"
            className="text-ink transition-colors hover:text-accent"
          >
            contact@pieces.ci
          </a>
          <span className="text-muted-2" aria-hidden>·</span>
          <a
            href="https://wa.me/2250706846268"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink transition-colors hover:text-accent"
          >
            (225) 07 06 84 62 68
          </a>
        </div>

        {/* Barre « 3 univers » — marketplace / flotte / logistique */}
        <UniverseBar active="marketplace" />

        {/* Mobile carousel — replié quand un véhicule est sélectionné */}
        {vehicle ? (
          <div className="px-4 pb-4">
            <button
              type="button"
              onClick={() => setPromoOpen(!promoOpen)}
              aria-expanded={promoOpen}
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-left transition-colors hover:border-border-strong"
              style={{ minHeight: 48 }}
            >
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                Offres & annonces
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className={`h-5 w-5 flex-shrink-0 text-muted transition-transform duration-200 ${promoOpen ? 'rotate-180' : ''}`}
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            {promoOpen && (
              <div className="mt-3">
                <PromoCarousel slides={PROMO_SLIDES} />
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 pb-4">
            <PromoCarousel slides={PROMO_SLIDES} />
          </div>
        )}

        {/* Browse content (sélection véhicule + recherche + catégories) */}
        <BrowseContent variant="mobile" />

        {/* Les deux autres univers — remplace l'ancienne carte discrète d'import */}
        <div className="mt-6">
          <LogistiqueSection />
          <FleetSection />
        </div>

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </>
  )
}
