import { VitrineShell, VitrineCtaLink, type VitrineNavItem } from '@/components/vitrine/VitrineShell'

// Chrome de la vitrine flotte.pieces.ci, partagé par la landing, le calculateur
// ROI et le guide. Structure commune : components/vitrine/VitrineShell.tsx.
const ENTREPRISES_NAV: readonly VitrineNavItem[] = [
  { label: 'Calculateur ROI', href: '/entreprises/calculateur-roi' },
  { label: 'Guide', href: '/entreprises/guide' },
]

export default function EntreprisesLayout({ children }: { children: React.ReactNode }) {
  return (
    <VitrineShell
      homeHref="/entreprises"
      section="Entreprises"
      nav={ENTREPRISES_NAV}
      cta={<VitrineCtaLink href="/enterprise/dashboard">Créer mon compte</VitrineCtaLink>}
      footerNote={
        <>
          Activation des abonnements en phase pilote (semestre 1 2026) — activation
          manuelle par l&apos;équipe Pièces après inscription. Paiement automatisé et
          calculateur ROI public à venir.
        </>
      }
    >
      {children}
    </VitrineShell>
  )
}
