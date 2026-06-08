/* eslint-disable @next/next/no-img-element */
import Link from 'next/link'

export const metadata = {
  title: 'Guide Entreprises — Pièces',
  description:
    'Comment gérer votre flotte de véhicules avec Pièces : inscription, garage digital, commandes, devis PDF et tableau de bord.',
}

const SECTIONS = [
  { id: 'pourquoi', label: 'Pourquoi Pièces' },
  { id: 'creer-entreprise', label: '1 — Créer votre entreprise' },
  { id: 'inviter-equipe', label: '2 — Inviter votre équipe' },
  { id: 'enregistrer-flotte', label: '3 — Enregistrer votre flotte' },
  { id: 'import-csv', label: '4 — Importer en masse (Excel ou CSV)' },
  { id: 'fiche-vehicule', label: '5 — Fiche véhicule' },
  { id: 'rechercher', label: '6 — Rechercher des pièces' },
  { id: 'commander', label: '7 — Commander pour un véhicule' },
  { id: 'devis-pdf', label: '8 — Télécharger un devis PDF' },
  { id: 'dashboard', label: '9 — Tableau de bord' },
  { id: 'faq', label: 'FAQ' },
]

export default function EnterpriseGuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      {/* Header */}
      <header className="mb-12 border-b border-border pb-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Guide entreprises
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Pièces pour les gestionnaires de flotte
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Tout ce qu&apos;il faut savoir pour gérer la maintenance de votre parc
          véhicules sur Pièces : du premier compte à l&apos;export comptable.
          Conçu pour les transporteurs, BTP, mines et entreprises ivoiriennes.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-ink-2 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink"
          >
            Créer mon compte
          </Link>
          <a
            href="#creer-entreprise"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Commencer le guide
          </a>
        </div>

        {/* Manuels approfondis */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/entreprises/guide/gestionnaire"
            className="rounded-md border border-border bg-card p-4 hover:border-border-strong"
          >
            <p className="font-display text-base text-ink">Manuel gestionnaire de flotte →</p>
            <p className="mt-1 text-sm text-muted">Véhicules, chauffeurs, relevés journaliers, KPIs de rentabilité, incidents.</p>
          </Link>
          <Link
            href="/entreprises/guide/chauffeur"
            className="rounded-md border border-border bg-card p-4 hover:border-border-strong"
          >
            <p className="font-display text-base text-ink">Manuel chauffeur de flotte →</p>
            <p className="mt-1 text-sm text-muted">Activer son compte, son véhicule, saisir le relevé du jour, son historique.</p>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[200px_1fr]">
        {/* Sticky TOC */}
        <nav className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Sommaire
            </p>
            <ul className="space-y-2 border-l border-border pl-4">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Content */}
        <main className="space-y-16">
          {/* Pourquoi */}
          <Section id="pourquoi" title="Pourquoi Pièces pour votre flotte ?">
            <p>
              En Côte d&apos;Ivoire, gérer la maintenance d&apos;une flotte rime
              souvent avec cahier papier, achats informels et opacité sur les
              prix. Pièces digitalise la chaîne : <strong>une seule plateforme</strong>{' '}
              pour identifier la pièce, comparer les fournisseurs, commander
              en Mobile Money, et suivre les dépenses par véhicule.
            </p>
            <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Bullet
                title="Garage digital"
                body="Enregistrez votre flotte une fois — toutes les recherches sont contextualisées par véhicule."
              />
              <Bullet
                title="Prix transparents"
                body="OEM, Aftermarket (Bosch, Valeo) ou Compatible : comparez les options pour chaque pièce."
              />
              <Bullet
                title="Suivi des dépenses"
                body="Tableau de bord par véhicule, top 5 des plus coûteux, export comptable CSV."
              />
            </div>
          </Section>

          {/* 1 — Créer entreprise */}
          <Section id="creer-entreprise" title="1 — Créer votre entreprise">
            <p>
              Après votre première connexion, accédez à{' '}
              <code className="rounded-sm bg-surface px-1.5 py-0.5 text-sm">/enterprise/dashboard</code>{' '}
              et créez votre entreprise. Vous en devenez automatiquement le{' '}
              <strong>propriétaire (OWNER)</strong>.
            </p>
            <Steps
              steps={[
                'Renseignez le nom de l\'entreprise (obligatoire).',
                'Choisissez la commune dans la liste des 13 communes du District d\'Abidjan.',
                'Optionnel : ajoutez une adresse précise (quartier, rue, repère).',
                'Optionnel : cliquez sur « Préciser la position sur la carte » pour placer un repère GPS exact.',
                'Optionnel : ajoutez votre numéro RCCM si vous l\'avez.',
                'Validez — vous êtes prêt à enregistrer votre flotte.',
              ]}
            />
            <Screenshot
              src="/guide/01-create-enterprise.svg"
              caption="Formulaire de création d'entreprise avec sélection de commune et picker GPS optionnel"
            />
            <Tip>
              <strong>Astuce :</strong> le GPS exact n&apos;est pas obligatoire,
              mais il facilite la livraison sur site pour les chantiers BTP ou
              les sites distants.
            </Tip>
          </Section>

          {/* 2 — Inviter l'équipe */}
          <Section id="inviter-equipe" title="2 — Inviter votre équipe">
            <p>
              Pièces gère <strong>4 rôles distincts</strong> pour adapter les
              permissions à chaque collaborateur.
            </p>
            <div className="my-4 overflow-hidden rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Rôle</th>
                    <th className="px-4 py-2 text-left">Permissions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-ink">Propriétaire (OWNER)</td>
                    <td className="px-4 py-3 text-muted">Accès total. Peut transférer la propriété, supprimer l&apos;entreprise.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-ink">Manager</td>
                    <td className="px-4 py-3 text-muted">Gère véhicules, commandes, membres. Pas de transfert de propriété.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-ink">Mécanicien</td>
                    <td className="px-4 py-3 text-muted">Recherche et identifie les pièces, met à jour les kilomètres, propose des commandes.</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-ink">Comptable</td>
                    <td className="px-4 py-3 text-muted">Lecture seule + exports financiers (CSV des commandes).</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <Steps
              steps={[
                'Allez dans « Membres » depuis la sidebar entreprise.',
                'Cliquez sur « Inviter un membre ».',
                'Renseignez le téléphone (+225...) OU l\'email de la personne.',
                'Choisissez son rôle.',
                'L\'invité doit déjà avoir un compte Pièces — sinon il devra s\'inscrire d\'abord.',
              ]}
            />
            <Screenshot
              src="/guide/02-invite-member.svg"
              caption="Modale d'invitation : téléphone ou email + rôle"
            />
          </Section>

          {/* 3 — Enregistrer la flotte */}
          <Section id="enregistrer-flotte" title="3 — Enregistrer votre flotte">
            <p>
              Chaque véhicule peut être enregistré individuellement ou en masse
              via CSV. Pour chaque véhicule, vous pouvez stocker :
            </p>
            <ul className="my-4 list-inside list-disc space-y-1 text-muted">
              <li>Marque, modèle, année <em>(obligatoires)</em></li>
              <li>Immatriculation, VIN, motorisation</li>
              <li>Kilométrage (avec mise à jour automatique de la date)</li>
              <li>Type d&apos;usage : Transport, Chantier, Livraison, Direction, Autre</li>
              <li>Groupe (ex : « Yopougon », « Direction », « Chantier Bouaké »)</li>
            </ul>
            <Steps
              steps={[
                'Allez dans « Véhicules ».',
                'Cliquez sur « Ajouter » pour la saisie manuelle.',
                'Remplissez le formulaire — seuls marque, modèle, année sont obligatoires.',
                'Le véhicule apparaît immédiatement dans la liste avec filtres par groupe et usage.',
              ]}
            />
            <Screenshot
              src="/guide/03-add-vehicle.svg"
              caption="Modale d'ajout : marque, modèle, année + champs optionnels regroupés"
            />
          </Section>

          {/* 4 — Import Excel / CSV */}
          <Section id="import-csv" title="4 — Importer en masse (Excel ou CSV)">
            <p>
              Pour les flottes de plus de 20 véhicules, l&apos;import en masse est
              le moyen le plus rapide. Le plus simple : téléchargez notre{' '}
              <strong>modèle Excel d&apos;onboarding</strong>, remplissez les onglets
              « Véhicules » et « Chauffeurs », puis importez-le depuis le tableau de
              bord. Vous pouvez aussi importer un fichier CSV — les en-têtes sont
              acceptés en <strong>français ou en anglais</strong>.
            </p>
            <Steps
              steps={[
                'Téléchargez le modèle Excel depuis la page d\'import (bouton « Télécharger le modèle »).',
                'Renseignez vos chauffeurs dans l\'onglet « Chauffeurs », puis importez-les en premier.',
                'Renseignez vos véhicules dans l\'onglet « Véhicules » et importez-les ensuite.',
                'Renseignez la colonne « Chauffeur attitré » pour affecter automatiquement chaque véhicule à son chauffeur.',
              ]}
            />
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              Format CSV (alternative)
            </p>
            <pre className="my-3 overflow-x-auto rounded-md bg-surface p-4 text-xs text-ink">
{`marque,modele,annee,immatriculation,kilometrage,usage,groupe,chauffeur
Toyota,Hilux,2018,AB-1234-CI,145000,CHANTIER,Yopougon,Koffi Yao
Renault,Master,2020,EF-9012-CI,68000,LIVRAISON,Treichville,Awa Traoré
Mercedes,Sprinter,2019,GH-3456-CI,92000,TRANSPORT,Treichville,`}
            </pre>
            <p className="text-sm text-muted">
              Colonnes obligatoires : <code>marque</code>, <code>modele</code>,{' '}
              <code>annee</code>. Toutes les autres sont optionnelles. La colonne{' '}
              <code>chauffeur</code> affecte le véhicule au chauffeur portant ce nom
              (importez vos chauffeurs d&apos;abord). Les lignes invalides sont
              rapportées ligne par ligne — les lignes valides sont créées normalement.
            </p>
            <Screenshot
              src="/guide/04-csv-import.svg"
              caption="Page d'import avec téléchargement du modèle Excel et compte-rendu des erreurs"
            />
            <Tip>
              <strong>Format VIN :</strong> 17 caractères alphanumériques (sans I, O, Q).
              Si le VIN ne respecte pas ce format, la ligne est rejetée avec
              un message clair.
            </Tip>
          </Section>

          {/* 5 — Fiche véhicule */}
          <Section id="fiche-vehicule" title="5 — Fiche véhicule + historique">
            <p>
              Chaque véhicule a sa propre fiche avec toutes les commandes
              passées et leur coût cumulé. Idéal pour décider d&apos;une
              revente ou identifier un véhicule qui coûte trop cher.
            </p>
            <Steps
              steps={[
                'Cliquez sur n\'importe quel véhicule dans la liste.',
                'La fiche s\'ouvre avec les infos complètes + l\'historique des 50 dernières commandes.',
                'Le total dépensé s\'affiche en haut de l\'historique.',
                'Mettez à jour le kilométrage avec le champ rapide — la date est enregistrée automatiquement.',
              ]}
            />
            <Screenshot
              src="/guide/05-vehicle-detail.svg"
              caption="Fiche véhicule : infos, kilométrage modifiable, historique des commandes"
            />
            <Tip>
              <strong>Pour les mécaniciens :</strong> mettez à jour le
              kilométrage à chaque passage. Cela alimentera les futures
              alertes de maintenance préventive.
            </Tip>
          </Section>

          {/* 6 — Rechercher */}
          <Section id="rechercher" title="6 — Rechercher des pièces">
            <p>
              Quatre modes de recherche selon l&apos;info disponible :
            </p>
            <div className="my-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <Bullet title="Par marque, modèle, année" body="Le parcours par défaut quand vous connaissez le véhicule." />
              <Bullet title="Par photo (IA)" body="Photographiez la pièce usée, l'IA propose les équivalences." />
              <Bullet title="Par référence OEM" body="Si vous avez déjà la ref constructeur." />
              <Bullet title="Par VIN" body="17 caractères — précision maximale, élimine les erreurs de compatibilité." />
            </div>
            <p>
              Pour chaque pièce identifiée, vous voyez les options disponibles
              avec leur origine :
            </p>
            <div className="my-4 flex flex-wrap gap-2">
              <Chip variant="oem">OEM</Chip>
              <Chip variant="aftermarket">Aftermarket</Chip>
              <Chip variant="plain">Compatible</Chip>
            </div>
            <ul className="space-y-2 text-sm text-muted">
              <li><strong className="text-ink">OEM</strong> : pièce d&apos;origine constructeur. Le plus cher, garantie maximale.</li>
              <li><strong className="text-ink">Aftermarket</strong> : équipementier reconnu (Bosch, Valeo, Monroe…). Rapport qualité-prix optimal.</li>
              <li><strong className="text-ink">Compatible</strong> : pièce générique. Moins chère, qualité variable selon le fournisseur.</li>
            </ul>
            <Screenshot
              src="/guide/06-catalog-chips.svg"
              caption="Cartes pièces avec chips condition (Neuf/Occasion) + origine (OEM/Aftermarket/Compatible)"
            />
          </Section>

          {/* 7 — Commander */}
          <Section id="commander" title="7 — Commander pour un véhicule">
            <p>
              Quand vous commandez via Pièces, vous pouvez lier la commande à
              un véhicule précis de votre flotte. Cela alimente automatiquement
              le tableau de bord et permet le suivi des dépenses par véhicule.
            </p>
            <Steps
              steps={[
                'Sélectionnez les pièces à commander (panier multi-fournisseurs supporté).',
                'Choisissez le véhicule destinataire dans votre garage digital.',
                'La commande génère un shareToken sécurisé.',
                'Mode de paiement : Orange Money, MTN MoMo, Wave, virement bancaire, ou paiement à la livraison (max 75 000 FCFA).',
                'Suivi en temps réel : Confirmée → En préparation → Expédiée → Livrée.',
              ]}
            />
            <Screenshot
              src="/guide/07-order-create.svg"
              caption="Panier + sélection véhicule + mode de paiement Mobile Money"
            />
          </Section>

          {/* 8 — Devis PDF */}
          <Section id="devis-pdf" title="8 — Télécharger un devis PDF">
            <p>
              Pour faire valider une commande par votre direction avant
              paiement, téléchargez un <strong>devis PDF professionnel</strong>{' '}
              en un clic. Il inclut :
            </p>
            <ul className="my-4 list-inside list-disc space-y-1 text-muted">
              <li>Vos coordonnées entreprise (nom, commune, RCCM si renseigné)</li>
              <li>Le véhicule concerné (marque, modèle, plaque, VIN)</li>
              <li>Le détail par pièce : référence, fournisseur, prix unitaire</li>
              <li>Le découpage des coûts : pièces, main d&apos;œuvre, livraison, total en FCFA</li>
              <li>Validité 7 jours par défaut</li>
            </ul>
            <Steps
              steps={[
                'Allez dans « Commandes » depuis la sidebar entreprise.',
                'Trouvez la commande dans la liste (filtrez par statut si besoin).',
                'Cliquez sur « PDF » dans la colonne « Devis ».',
                'Le fichier se télécharge automatiquement, prêt à transmettre par email ou WhatsApp.',
              ]}
            />
            <Screenshot
              src="/guide/08-devis-pdf.svg"
              caption="Exemple de devis PDF généré : header Pièces, bloc client, véhicule, tableau articles, totaux"
            />
          </Section>

          {/* 9 — Dashboard */}
          <Section id="dashboard" title="9 — Tableau de bord">
            <p>
              Le tableau de bord agrège en temps réel les indicateurs clés de
              votre flotte.
            </p>
            <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Bullet title="4 cartes statistiques" body="Véhicules · Membres · Commandes actives · Dépenses du mois (en FCFA)." />
              <Bullet title="Top 5 véhicules par coût" body="Identifie les véhicules les plus coûteux — utile pour la décision de remplacement." />
              <Bullet title="Export CSV comptable" body="Toutes les commandes au format CSV pour votre DAF (Excel, Sage, Odoo)." />
              <Bullet title="Filtre temporel" body="Les dépenses du mois sont calculées depuis le 1er du mois en cours." />
            </div>
            <Screenshot
              src="/guide/09-dashboard.svg"
              caption="Dashboard avec 4 stats + tableau top véhicules + bouton export"
            />
            <Tip>
              <strong>Conseil DAF :</strong> exportez le CSV en début de mois
              pour rapprochement comptable. Les colonnes incluent : ID commande,
              dates, statut, méthode de paiement, véhicule, plaque, montants.
            </Tip>
          </Section>

          {/* FAQ */}
          <Section id="faq" title="FAQ">
            <Faq
              q="Combien de véhicules puis-je enregistrer ?"
              a="Aucune limite pour les comptes entreprise. Pour les flottes de plus de 50 véhicules, contactez-nous pour une activation premium."
            />
            <Faq
              q="Mes données sont-elles partagées avec les fournisseurs ?"
              a="Non. Seul le ticket de commande est transmis au fournisseur concerné (références, quantités, adresse de livraison). Votre flotte, vos coûts et vos membres restent privés."
            />
            <Faq
              q="Puis-je utiliser Pièces sans connexion stable ?"
              a="Pour l'instant, une connexion est requise. Une version offline pour les chantiers BTP et mines est en cours de développement."
            />
            <Faq
              q="Quels modes de paiement sont acceptés ?"
              a="Orange Money, MTN MoMo, Wave et virement bancaire. Paiement à la livraison disponible jusqu'à 75 000 FCFA pour les premiers clients."
            />
            <Faq
              q="Comment obtenir une facture ?"
              a="Une facture officielle est générée automatiquement après chaque paiement confirmé. Téléchargeable depuis l'historique des commandes."
            />
            <Faq
              q="Le devis a-t-il une validité légale ?"
              a="Le devis est valable 7 jours à compter de la date d'émission. Pour des engagements long terme, contactez-nous pour un devis personnalisé."
            />
          </Section>

          {/* CTA footer */}
          <section className="rounded-md border border-occasion-fg/20 bg-occasion-bg p-8 text-center">
            <h2 className="font-display text-2xl text-occasion-fg">Prêt à digitaliser votre maintenance ?</h2>
            <p className="mt-2 text-sm text-occasion-fg/85">
              Créez votre compte entreprise en 2 minutes — sans engagement.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-md bg-ink-2 px-6 py-3 text-sm font-semibold text-white hover:bg-ink"
            >
              Démarrer maintenant
            </Link>
          </section>
        </main>
      </div>
    </div>
  )
}

// ---- Reusable bits ------------------------------------------------------

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8">
      <h2 className="mb-4 font-display text-2xl text-ink lg:text-3xl">{title}</h2>
      <div className="space-y-3 text-base text-muted">{children}</div>
    </section>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="my-4 space-y-2 text-base">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="font-mono text-[11px] font-semibold tabular text-ink-2">{String(i + 1).padStart(2, '0')}</span>
          <span className="text-muted">{step}</span>
        </li>
      ))}
    </ol>
  )
}

function Bullet({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-4">
      <p className="font-display text-base text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
    </div>
  )
}

function Screenshot({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="my-6">
      <div className="overflow-hidden rounded-md border border-border bg-surface">
        <img src={src} alt={caption} className="w-full" />
      </div>
      <figcaption className="mt-2 text-center font-mono text-[11px] text-muted">{caption}</figcaption>
    </figure>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border-l-4 border-aftermarket-fg bg-aftermarket-bg p-4 text-sm text-aftermarket-fg">
      {children}
    </div>
  )
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-md border border-border bg-card p-4">
      <summary className="cursor-pointer font-semibold text-ink">{q}</summary>
      <p className="mt-2 text-sm text-muted">{a}</p>
    </details>
  )
}

function Chip({ variant, children }: { variant: 'oem' | 'aftermarket' | 'plain'; children: React.ReactNode }) {
  const classes = {
    oem: 'bg-oem-bg text-oem-fg',
    aftermarket: 'bg-aftermarket-bg text-aftermarket-fg',
    plain: 'bg-surface text-muted border border-border',
  }[variant]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.04em] ${classes}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  )
}
