import Link from 'next/link'

// Barre « 4 univers » — rend explicite dès le premier écran que Pièces couvre
// trois services distincts, chacun servi sur son propre domaine :
//   pieces.ci            → la marketplace (ce fichier vit sur /browse)
//   mecanicien.pieces.ci → /mecaniciens   (réécriture middleware.ts)
//   flotte.pieces.ci     → /entreprises   (réécriture middleware.ts)
//   logistique.pieces.ci → /logistique    (réécriture middleware.ts)
// Les href restent relatifs : ils fonctionnent tels quels sur pieces.ci, et le
// middleware les résout sur les sous-domaines.

export type Universe = 'marketplace' | 'garages' | 'flotte' | 'logistique'

const UNIVERSES: Array<{
  key: Universe
  href: string
  label: string
  desc: string
  domain: string
}> = [
  {
    key: 'marketplace',
    href: '/browse',
    label: 'Marketplace',
    desc: 'Trouver et acheter une pièce disponible à Abidjan',
    domain: 'pieces.ci',
  },
  {
    key: 'garages',
    href: '/mecaniciens',
    label: 'Garages',
    desc: 'Trouver un mécanicien de confiance près de chez vous',
    domain: 'mecanicien.pieces.ci',
  },
  {
    key: 'flotte',
    href: '/entreprises',
    label: 'Flotte',
    desc: 'Piloter les dépenses pièces de plusieurs véhicules',
    domain: 'flotte.pieces.ci',
  },
  {
    key: 'logistique',
    href: '/logistique',
    label: 'Logistique',
    desc: "Faire venir la pièce qui n'existe pas sur place",
    domain: 'logistique.pieces.ci',
  },
]

export function UniverseBar({ active }: { active?: Universe }) {
  return (
    <nav aria-label="Nos services" className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-[1280px] grid-cols-4 overflow-hidden px-0 lg:px-6">
        {UNIVERSES.map((u) => {
          const isActive = u.key === active
          return (
            <Link
              key={u.key}
              href={u.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center gap-0.5 border-b-2 border-r border-r-border px-1 py-3 text-center last:border-r-0 sm:items-start sm:px-3 sm:text-left transition-colors hover:bg-surface lg:px-5 lg:py-3.5 ${
                isActive ? 'border-b-accent bg-surface' : 'border-b-transparent'
              }`}
            >
              <span className="max-w-full text-[12px] font-semibold tracking-tight text-ink min-[380px]:text-[13px] sm:text-[14px] sm:tracking-normal lg:text-[15px]">{u.label}</span>
              <span className="hidden text-[12.5px] leading-snug text-muted sm:block">{u.desc}</span>
              <span className="hidden font-mono text-[10.5px] tracking-[0.04em] text-muted-2 md:block">
                {u.domain}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
