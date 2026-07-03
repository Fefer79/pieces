import type { Metadata } from 'next'
import { LegalShell, LegalSection } from '@/components/legal-shell'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Pièces',
  description:
    'Comment Pièces collecte, utilise et protège vos données personnelles, et les droits dont vous disposez.',
}

export default function ConfidentialitePage() {
  return (
    <LegalShell
      eyebrow="Protection des données"
      title="Politique de confidentialité"
      intro="Pièces s’engage à protéger vos données personnelles. Cette politique explique quelles informations nous collectons, pourquoi, avec qui nous les partageons, et les droits dont vous disposez. Dernière mise à jour : juillet 2026."
    >
      <LegalSection title="1. Responsable du traitement">
        <p>
          Le responsable du traitement est Pièces.ci, marketplace de pièces détachées automobiles
          basée à Abidjan, Côte d’Ivoire. Pour toute question relative à vos données, contactez-nous
          à{' '}
          <a href="mailto:contact@pieces.ci" className="text-ink-2 underline hover:text-accent">
            contact@pieces.ci
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Données que nous collectons">
        <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>
              <strong className="text-ink">Identité et contact</strong> : nom, adresse email, numéro
              de téléphone.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>
              <strong className="text-ink">Compte</strong> : identifiant de connexion, rôle
              (mécanicien, propriétaire, vendeur, livreur, entreprise), et — si vous vous connectez
              avec Google, Facebook ou WhatsApp — les informations minimales partagées par ces
              services (nom, email, photo de profil, ou numéro de téléphone).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>
              <strong className="text-ink">Commandes et livraisons</strong> : pièces recherchées,
              commandes, adresses de livraison, historique.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>
              <strong className="text-ink">Photos</strong> : images de pièces que vous téléversez
              pour identification ou mise en vente.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>
              <strong className="text-ink">Données techniques</strong> : informations de connexion
              et cookies strictement nécessaires à l’authentification et à la sécurité.
            </span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Pourquoi nous les utilisons">
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Créer et sécuriser votre compte, et vous identifier à chaque connexion.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Traiter vos commandes, paiements et livraisons.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Vous contacter au sujet de vos commandes (WhatsApp, email, SMS).</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Identifier automatiquement des pièces à partir de vos photos.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span>Prévenir la fraude et respecter nos obligations légales.</span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Partage avec des prestataires">
        <p>
          Nous ne vendons jamais vos données. Nous faisons appel à des prestataires techniques qui
          les traitent pour notre compte, uniquement dans le cadre du service :
        </p>
        <ul className="space-y-2">
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span><strong className="text-ink">Supabase</strong> — authentification et base de données.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span><strong className="text-ink">CinetPay</strong> — traitement sécurisé des paiements.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span><strong className="text-ink">Cloudflare</strong> — hébergement et stockage des images.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-accent" aria-hidden="true">→</span>
            <span><strong className="text-ink">Meta (WhatsApp), Google, Facebook</strong> — connexion et messagerie, selon les options que vous utilisez.</span>
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Durée de conservation">
        <p>
          Nous conservons vos données tant que votre compte est actif, puis pendant la durée
          nécessaire au respect de nos obligations légales et comptables. Vous pouvez demander la
          suppression de votre compte à tout moment.
        </p>
      </LegalSection>

      <LegalSection title="6. Vos droits">
        <p>
          Conformément à la loi ivoirienne n°2013-450 relative à la protection des données à
          caractère personnel, vous disposez d’un droit d’accès, de rectification, d’opposition et de
          suppression de vos données. Vous pouvez exercer ces droits depuis votre profil (« Gérer mes
          données ») ou en écrivant à{' '}
          <a href="mailto:contact@pieces.ci" className="text-ink-2 underline hover:text-accent">
            contact@pieces.ci
          </a>
          . Si vous vous êtes connecté via Google ou Facebook, vous pouvez également révoquer l’accès
          de Pièces depuis les paramètres de sécurité de ces comptes.
        </p>
      </LegalSection>

      <LegalSection title="7. Sécurité">
        <p>
          Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos
          données : chiffrement des connexions, contrôle d’accès et hébergement sécurisé. Aucun
          système n’étant infaillible, nous vous invitons à choisir un mot de passe robuste et à ne
          pas le partager.
        </p>
      </LegalSection>

      <LegalSection title="8. Modifications">
        <p>
          Nous pouvons mettre à jour cette politique. Toute modification importante sera signalée sur
          cette page, avec une date de mise à jour actualisée.
        </p>
      </LegalSection>
    </LegalShell>
  )
}
