import Link from 'next/link'
import { VitrineShell, type VitrineNavItem } from '@/components/vitrine/VitrineShell'

// Chrome de la vitrine mecanicien.pieces.ci. Structure commune :
// components/vitrine/VitrineShell.tsx ; seul le CTA (menu « Participer ») est propre
// à l'annuaire.
const MECANICIENS_NAV: readonly VitrineNavItem[] = [
  { label: 'Comment ça marche', href: '/mecaniciens/comment-ca-marche' },
]

function ParticiperMenu() {
  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md bg-accent px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover [&::-webkit-details-marker]:hidden">
        Participer
        <span className="transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-72 rounded-md border border-border bg-card p-1.5 text-ink shadow-lg">
        <Link
          href="/mecaniciens/inscription"
          className="block rounded px-3 py-2 text-sm font-medium hover:bg-surface"
        >
          Inscrire mon atelier
          <span className="block text-xs font-normal text-muted">
            Je suis mécanicien, je publie ma fiche
          </span>
        </Link>
        <Link
          href="/mecaniciens/proposer"
          className="block rounded px-3 py-2 text-sm font-medium hover:bg-surface"
        >
          Proposer un mécanicien
          <span className="block text-xs font-normal text-muted">
            Un atelier que je connais n&apos;est pas encore dans l&apos;annuaire
          </span>
        </Link>
        <Link
          href="/mecaniciens/recommander"
          className="block rounded px-3 py-2 text-sm font-medium hover:bg-surface"
        >
          Recommander un atelier
          <span className="block text-xs font-normal text-muted">
            Noter et partager mon expérience avec un atelier de l&apos;annuaire
          </span>
        </Link>
      </div>
    </details>
  )
}

export default function MecaniciensLayout({ children }: { children: React.ReactNode }) {
  return (
    <VitrineShell
      homeHref="/mecaniciens"
      section="Mécaniciens"
      whatsappMessage="Bonjour, je suis garagiste / mécanicien et je voudrais en savoir plus sur Pièces."
      nav={MECANICIENS_NAV}
      cta={<ParticiperMenu />}
      footerNote={
        <>
          Annuaire ouvert : les fiches sont publiées par les mécaniciens eux-mêmes et
          modérées a posteriori par l&apos;équipe Pièces.
        </>
      }
    >
      {children}
    </VitrineShell>
  )
}
