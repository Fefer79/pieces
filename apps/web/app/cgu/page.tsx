import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal-shell'

export const metadata: Metadata = {
  title: "Conditions générales d’utilisation — Pièces",
  description:
    'Les règles d’utilisation de la marketplace Pièces : compte, commandes, paiements, responsabilités et litiges.',
}

export default function CGUPage() {
  return (
    <LegalShell
      eyebrow="Conditions"
      title="Conditions générales d’utilisation"
      intro="Les présentes conditions régissent l’utilisation de la plateforme Pièces. En créant un compte, vous les acceptez. Dernière mise à jour : juillet 2026."
    >
      <LegalSection title="1. Présentation du service">
        <p>
          Pièces est une marketplace mettant en relation des mécaniciens, propriétaires de véhicules,
          vendeurs de pièces détachées et livreurs en Côte d’Ivoire. Pièces facilite la recherche, la
          commande et la livraison de pièces, ainsi que le paiement sécurisé, mais n’est pas le
          vendeur des pièces proposées par les vendeurs tiers.
        </p>
      </LegalSection>

      <LegalSection title="2. Compte et connexion">
        <p>
          Vous pouvez créer un compte par email et mot de passe, ou vous connecter avec Google,
          Facebook ou WhatsApp. Vous êtes responsable de l’exactitude de vos informations et de la
          confidentialité de vos identifiants. Un compte est personnel ; toute activité réalisée
          depuis votre compte est réputée être la vôtre.
        </p>
      </LegalSection>

      <LegalSection title="3. Commandes et paiement">
        <p>
          Les prix sont affichés en FCFA, avec un détail transparent (prix vendeur, main-d’œuvre,
          livraison, frais de plateforme) avant validation. Les paiements sont traités via notre
          prestataire CinetPay selon un modèle de séquestre : les fonds sont sécurisés jusqu’à la
          confirmation de la livraison. Aucun frais caché n’est appliqué.
        </p>
      </LegalSection>

      <LegalSection title="4. Livraison">
        <p>
          Les délais de livraison sont communiqués à titre indicatif et dépendent de la disponibilité
          des pièces et des vendeurs. Nous nous efforçons d’assurer une livraison rapide au garage ou
          à l’adresse indiquée.
        </p>
      </LegalSection>

      <LegalSection title="5. Obligations des utilisateurs">
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Fournir des informations exactes sur les pièces, les véhicules et les commandes.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Ne pas publier de contenu illicite, trompeur ou contrefait.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Ne pas contourner le système de paiement ni détourner la plateforme de son usage.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Respecter les autres utilisateurs et la réglementation en vigueur.</span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Rôle et responsabilité de Pièces">
        <p>
          Pièces agit en tant qu’intermédiaire technique. La qualité, la conformité et l’état des
          pièces (neuf, occasion importée, ré-usiné, aftermarket, OEM) relèvent des vendeurs. Pièces
          met à disposition un système de litiges et de garanties pour protéger les acheteurs, mais ne
          saurait être tenue responsable des dommages indirects résultant de l’usage de pièces
          fournies par des tiers.
        </p>
      </LegalSection>

      <LegalSection title="7. Litiges et retours">
        <p>
          En cas de problème sur une commande (pièce non conforme, non livrée, endommagée), vous
          pouvez ouvrir un litige depuis votre espace commandes. Pièces examine chaque cas et peut,
          selon les circonstances, procéder au remboursement via le séquestre.
        </p>
      </LegalSection>

      <LegalSection title="8. Propriété intellectuelle">
        <p>
          La marque, le logo, l’interface et les contenus produits par Pièces sont protégés. Toute
          reproduction non autorisée est interdite. Les contenus que vous téléversez (photos,
          descriptions) restent les vôtres, mais vous accordez à Pièces une licence d’usage limitée
          pour les afficher dans le cadre du service.
        </p>
      </LegalSection>

      <LegalSection title="9. Résiliation">
        <p>
          Vous pouvez fermer votre compte à tout moment. Pièces peut suspendre ou résilier un compte
          en cas de manquement aux présentes conditions ou d’usage frauduleux.
        </p>
      </LegalSection>

      <LegalSection title="10. Droit applicable">
        <p>
          Les présentes conditions sont régies par le droit ivoirien. Tout litige non résolu à
          l’amiable relève de la compétence des tribunaux d’Abidjan. Pour toute question, écrivez à{' '}
          <a href="mailto:contact@pieces.ci" className="text-ink-2 underline hover:text-accent">
            contact@pieces.ci
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}
