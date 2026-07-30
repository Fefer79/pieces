import Link from 'next/link'

// Barre « 3 univers » — rend explicite dès le premier écran que Pièces couvre
// trois services distincts, chacun servi sur son propre domaine :
//   pieces.ci            → la marketplace (ce fichier vit sur /browse)
//   flotte.pieces.ci     → /entreprises   (réécriture middleware.ts)
//   logistique.pieces.ci → /logistique    (réécriture middleware.ts)
// Les href restent relatifs : ils fonctionnent tels quels sur pieces.ci, et le
// middleware les résout sur les sous-domaines.

export type Universe = 'marketplace' | 'flotte' | 'logistique'

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
    <nav aria-label="Nos trois services" className="border-b border-border bg-card">
      <div className="mx-auto grid max-w-[1280px] grid-cols-3 px-0 lg:px-6">
        {UNIVERSES.map((u) => {
          const isActive = u.key === active
          return (
            <Link
              key={u.key}
              href={u.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col gap-0.5 border-b-2 border-r border-r-border px-3 py-3 last:border-r-0 transition-colors hover:bg-surface lg:px-5 lg:py-3.5 ${
                isActive ? 'border-b-accent bg-surface' : 'border-b-transparent'
              }`}
            >
              <span className="text-[14px] font-semibold text-ink lg:text-[15px]">{u.label}</span>
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
