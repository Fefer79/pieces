'use client'

import { LandingPage } from '@/components/landing-page'
import { BrowseContent } from '@/components/browse-content'
import { MobileDrawer } from '@/components/mobile-drawer'
import { BottomNav } from '@/components/bottom-nav'
import { PromoCarousel, type PromoSlide } from '@/components/ui/promo-carousel'
import { CategoryCarousel, type CategoryTile } from '@/components/ui/category-carousel'

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

// Catégories universelles : achetables sans connaître précisément le véhicule
// (sélection par dimension, viscosité, standard). Les catégories véhicule-spécifiques
// (freinage, moteur, distribution, etc.) ne sont accessibles qu'après sélection
// du véhicule via le flow /search.
const CATEGORY_TILES: CategoryTile[] = [
  { id: 'pneus', title: 'Pneus', href: '/catalogue?category=Pneus', emoji: '🛞', gradient: 'linear-gradient(135deg,#2C2C2C 0%,#0F0F0F 100%)' },
  { id: 'huiles', title: 'Huiles & lubrifiants', href: '/catalogue?category=Huiles%20%26%20lubrifiants', emoji: '🛢️', gradient: 'linear-gradient(135deg,#3A2F1F 0%,#1F1813 100%)' },
  { id: 'batteries', title: 'Batteries', href: '/catalogue?category=Batteries', emoji: '🔋', gradient: 'linear-gradient(135deg,#B7873A 0%,#8C6325 100%)' },
  { id: 'ampoules', title: 'Ampoules & éclairage', href: '/catalogue?category=Ampoules%20%26%20%C3%A9clairage', emoji: '💡', gradient: 'linear-gradient(135deg,#1F2937 0%,#0B1220 100%)' },
  { id: 'essuie-glaces', title: 'Essuie-glaces', href: '/catalogue?category=Essuie-glaces', emoji: '🌧️', gradient: 'linear-gradient(135deg,#3A8FB7 0%,#1F6A8C 100%)' },
  { id: 'liquides', title: 'Liquides & fluides', href: '/catalogue?category=Liquides%20%26%20fluides', emoji: '🧪', gradient: 'linear-gradient(135deg,#2F6F4F 0%,#1F4D38 100%)' },
  { id: 'accessoires-habitacle', title: 'Accessoires habitacle', href: '/catalogue?category=Accessoires%20habitacle', emoji: '🚗', gradient: 'linear-gradient(135deg,#5A4A8A 0%,#3D316B 100%)' },
  { id: 'entretien', title: 'Entretien & nettoyage', href: '/catalogue?category=Entretien%20%26%20nettoyage', emoji: '✨', gradient: 'linear-gradient(135deg,#D9764A 0%,#C25E2E 100%)' },
]

export default function BrowsePage() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block">
        <LandingPage>
          <div className="mx-auto max-w-[1280px] px-6 pt-8">
            <PromoCarousel slides={PROMO_SLIDES} />
          </div>
          <div className="mx-auto max-w-[1280px] px-6 pt-10">
            <CategoryCarousel tiles={CATEGORY_TILES} />
          </div>
        </LandingPage>
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

        {/* Mobile category carousel */}
        <div className="px-4 pb-4">
          <CategoryCarousel tiles={CATEGORY_TILES} />
        </div>

        {/* Browse content */}
        <BrowseContent variant="mobile" />

        {/* Bottom nav */}
        <BottomNav />
      </div>
    </>
  )
}
