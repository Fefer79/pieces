'use client'

import { LandingPage } from '@/components/landing-page'
import { BrowseContent } from '@/components/browse-content'
import { MobileDrawer } from '@/components/mobile-drawer'
import { BottomNav } from '@/components/bottom-nav'
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
    title: 'La marketplace de pièces auto en Côte d\u2019Ivoire',
    description: 'Prix transparents · Multi-vendeurs · Livraison au garage.',
    cta: { label: 'Explorer le catalogue', href: '/catalogue' },
    secondaryCta: { label: 'Comment ça marche', href: '/info' },
    art: <PromoArt src="/promo/transparence.webp" alt="Marché de pièces auto à Abidjan" />,
    theme: 'navy',
  },
  {
    id: 'transparence',
    eyebrow: 'La transparence d\u2019abord',
    title: 'Le juste prix des pièces, sans intermédiaires.',
    description:
      'Neuves, occasions importées, ré-usinées \u2014 chaque annonce affiche le détail du prix. Vous payez ce que ça vaut, pas ce qu\u2019on décide pour vous.',
    cta: { label: 'Explorer le catalogue', href: '/catalogue' },
    secondaryCta: { label: 'Comment ça marche', href: '/info' },
    art: <PromoArt src="/promo/intro.webp" alt="Mains de mécanicien tenant une clé à molette" />,
    theme: 'cream',
  },
  {
    id: 'reusine',
    eyebrow: 'Promo du mois \u00b7 Ré-usiné certifié',
    title: 'Alternateurs ré-usinés, -40% vs neuf.',
    description:
      'Testés en atelier, garantie 3 mois, performance d\u2019origine. Pour Toyota, Hyundai, Nissan, Peugeot. Livraison 24-48h à Abidjan.',
    cta: { label: 'Voir les alternateurs \u2192', href: '#alternateurs' },
    art: <PromoArt src="/promo/reusine.webp" alt="Alternateur ré-usiné sur un établi" />,
    theme: 'orange',
  },
  {
    id: 'flotte',
    eyebrow: 'Entreprises · Gestion de flotte',
    title: 'Vous êtes une entreprise ? Vous avez une flotte ?',
    description:
      'Tarifs négociés, facturation centralisée, suivi d’entretien par véhicule, compte gestionnaire dédié et livraison prioritaire à votre garage partenaire. Enregistrez votre flotte et simplifiez la maintenance.',
    cta: { label: 'Enregistrer ma flotte', href: '/enterprise/register' },
    secondaryCta: { label: 'Nos services entreprise', href: '/enterprise' },
    art: <PromoArt src="/promo/flotte.webp" alt="Flotte de véhicules utilitaires" />,
    theme: 'cream',
  },
  {
    id: 'conseil',
    eyebrow: 'Nouveau \u00b7 Service Conseil IA + expert',
    title: 'Un doute ? Demandez-nous.',
    description:
      'Un assistant répond 24h/24 aux questions de compatibilité et choix. Cas complexe ? Un expert prend le relais sous 30 minutes. Gratuit avant achat.',
    cta: { label: 'Démarrer une conversation', href: '#conseil' },
    art: <PromoArt src="/promo/conseil.webp" alt="Technicien ivoirien consultant son smartphone" />,
    theme: 'navy',
  },
]

export default function BrowsePage() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="mx-auto max-w-[1280px] px-6 pt-8">
          <PromoCarousel slides={PROMO_SLIDES} />
        </div>
        <LandingPage />
      </div>

      {/* Mobile */}
      <div className="flex min-h-dvh flex-col lg:hidden">
        {/* Header */}
        <header className="flex items-center justify-between bg-card px-4 pb-2 pt-4">
          <div className="flex flex-col">
            <span className="font-display text-3xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
            <span className="text-xs tracking-wide text-muted">
              Pièces détachées automobiles
            </span>
          </div>
          <MobileDrawer />
        </header>

        {/* Mobile carousel */}
        <div className="px-4 pb-4">
          <PromoCarousel slides={PROMO_SLIDES} />
        </div>

        {/* Browse content */}
        <BrowseContent variant="mobile" />

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </>
  )
}
