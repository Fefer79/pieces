import { VitrineShell, VitrineCtaLink } from '@/components/vitrine/VitrineShell'
import { LOGISTIQUE_NAV, LOGISTIQUE_FOOTER_NOTE } from '@/lib/logistique-content'

// Chrome de la vitrine logistique.pieces.ci, partagé par la landing, le
// calculateur, la FAQ et le parcours de cotation. Structure commune :
// components/vitrine/VitrineShell.tsx (règle « pas de Supabase » incluse).
export default function LogistiqueLayout({ children }: { children: React.ReactNode }) {
  return (
    <VitrineShell
      homeHref="/logistique"
      section="Logistique"
      whatsappMessage="Bonjour, je voudrais une cotation pour livrer des pièces."
      nav={LOGISTIQUE_NAV}
      cta={<VitrineCtaLink href="/logistique/devis">Demander une cotation</VitrineCtaLink>}
      footerNote={LOGISTIQUE_FOOTER_NOTE}
    >
      {children}
    </VitrineShell>
  )
}
