/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export const metadata = {
  title: 'Manuel gestionnaire de flotte — Pièces',
  description:
    'Le guide complet du gestionnaire de flotte sur Pièces : entreprise, équipe, véhicules, chauffeurs, relevés journaliers, KPIs de rentabilité, entretien et commandes.',
}

const SECTIONS = [
  { id: 'role', label: 'Votre rôle' },
  { id: 'entreprise', label: '1 — Entreprise & équipe' },
  { id: 'flotte', label: '2 — Enregistrer la flotte' },
  { id: 'editer-vehicule', label: '3 — Modifier un véhicule' },
  { id: 'chauffeurs', label: '4 — Onboarder un chauffeur' },
  { id: 'affectation', label: '5 — Affecter un véhicule' },
  { id: 'releves', label: '6 — Relevés journaliers' },
  { id: 'kpis', label: '7 — KPIs & rentabilité' },
  { id: 'incidents', label: '8 — Incidents & conduite' },
  { id: 'entretien', label: '9 — Entretien' },
  { id: 'commandes', label: '10 — Commander des pièces' },
  { id: 'faq', label: 'FAQ' },
]

export default function ManagerGuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-12 border-b border-border pb-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Manuel — Gestionnaire de flotte
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Piloter votre flotte et vos chauffeurs
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Le manuel complet du gestionnaire : enregistrer vos véhicules, onboarder
          vos chauffeurs, suivre le chiffre d'affaires journalier, mesurer la
          rentabilité de chaque véhicule et chaque chauffeur, et commander vos
          pièces — le tout depuis un seul tableau de bord.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/enterprise/dashboard" className="rounded-md bg-ink-2 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink">
            Ouvrir mon tableau de bord
          </Link>
          <Link href="/entreprises/guide/chauffeur" className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface">
            Manuel chauffeur →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[210px_1fr]">
        <nav className="hidden lg:block">
          <div className="sticky top-8">
            <p className="mb-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Sommaire</p>
            <ul className="space-y-2 border-l border-border pl-4">
              {SECTIONS.map((s) => (
                <li key={s.id}><a href={`#${s.id}`} className="text-sm text-muted transition-colors hover:text-ink">{s.label}</a></li>
              ))}
            </ul>
          </div>
        </nav>

        <main className="space-y-16">
          <Section id="role" title="Votre rôle de gestionnaire">
            <p>
              En tant que <strong>propriétaire (OWNER)</strong> ou <strong>gestionnaire (MANAGER)</strong>,
              vous administrez toute la flotte : véhicules, chauffeurs, entretien, commandes et
              facturation. Les rôles <strong>mécanicien</strong> et <strong>comptable</strong> ont des
              accès restreints. Vos chauffeurs, eux, ont un espace dédié et limité (voir le
              {' '}<Link href="/entreprises/guide/chauffeur" className="text-ink-2 underline">manuel chauffeur</Link>).
            </p>
            <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Bullet title="Visibilité totale" body="CA journalier, dépenses, km, incidents et coût pièces — par véhicule et par chauffeur." />
              <Bullet title="Rentabilité réelle" body="Pièces savait déjà ce que coûte un véhicule ; vous voyez désormais ce qu'il rapporte." />
              <Bullet title="Zéro papier" body="Les chauffeurs saisissent leur relevé depuis leur téléphone, vous consolidez en un coup d'œil." />
            </div>
          </Section>

          <Section id="entreprise" title="1 — Entreprise & équipe">
            <p>
              Après votre première connexion, créez votre entreprise depuis{' '}
              <Code>/enterprise/dashboard</Code>. Vous en devenez automatiquement le propriétaire.
              Invitez ensuite votre équipe (gestionnaires, mécaniciens, comptables) par numéro de
              téléphone depuis la section <strong>Membres</strong>.
            </p>
            <Tip><strong>Note :</strong> les chauffeurs ne sont PAS des membres de l'équipe. On les
              ajoute séparément dans <strong>Chauffeurs</strong> (section 4) — ils n'ont pas accès au
              tableau de bord, seulement à leur espace personnel.</Tip>
          </Section>

          <Section id="flotte" title="2 — Enregistrer la flotte">
            <p>Ouvrez <strong>Véhicules → Ajouter un véhicule</strong>. Deux façons de remplir :</p>
            <Steps steps={[
              'Par VIN : saisissez le numéro à 17 caractères de la carte grise et cliquez « Décoder » — marque, modèle et année se remplissent automatiquement.',
              'Par menus : choisissez Marque → Modèle → Année → Motorisation dans les listes déroulantes du catalogue.',
              'Complétez l\'immatriculation, le kilométrage, l\'usage (transport, chantier, livraison…) et un groupe optionnel.',
              'Enregistrez. Pour une grande flotte, utilisez l\'import CSV en masse.',
            ]} />
            <Tip>Choisir la <strong>motorisation</strong> améliore la précision des pièces compatibles
              proposées plus tard lors des commandes.</Tip>
          </Section>

          <Section id="editer-vehicule" title="3 — Modifier un véhicule">
            <p>
              Sur la fiche d'un véhicule, le bouton <strong>Modifier</strong> permet de corriger
              l'immatriculation, la motorisation, l'usage ou le groupe. Le kilométrage se met à jour
              en un clic depuis la même fiche, et alimente les échéances d'entretien.
            </p>
          </Section>

          <Section id="chauffeurs" title="4 — Onboarder un chauffeur">
            <p>
              Allez dans <strong>Chauffeurs → Onboarder</strong>. Renseignez le nom, le{' '}
              <strong>numéro de téléphone</strong> (format +225…), et optionnellement le permis.
              Le chauffeur apparaît avec le badge <em>« Compte non activé »</em>.
            </p>
            <Steps steps={[
              'Le chauffeur active lui-même son compte : il se connecte à pieces.ci avec le numéro que vous avez saisi (code OTP par SMS).',
              'Dès sa première connexion, son compte est automatiquement rattaché à la fiche que vous avez créée et le badge passe à « activé ».',
              'Il accède alors à son espace personnel pour saisir ses relevés. Il ne voit que ses propres données.',
            ]} />
            <Tip><strong>Important :</strong> le numéro de téléphone doit être exactement celui que le
              chauffeur utilisera pour se connecter — c'est la clé du rattachement automatique.</Tip>
          </Section>

          <Section id="affectation" title="5 — Affecter un véhicule">
            <p>
              Sur la fiche d'un chauffeur, section <strong>Véhicule affecté</strong>, choisissez un
              véhicule dans la liste. L'historique des affectations est conservé : quand vous changez
              de véhicule, l'ancienne affectation est clôturée et une nouvelle ouverte. Sélectionnez
              <strong> « Non affecté »</strong> pour désaffecter.
            </p>
            <p>Le véhicule affecté devient le véhicule par défaut des relevés journaliers du chauffeur.</p>
          </Section>

          <Section id="releves" title="6 — Relevés journaliers">
            <p>
              C'est le cœur du suivi de rentabilité. Chaque jour, un relevé enregistre pour un
              chauffeur :
            </p>
            <Steps steps={[
              'Chiffre d\'affaires du jour (recettes encaissées).',
              'Carburant (dépense gasoil/essence).',
              'Autres dépenses (péage, lavage, petites réparations…).',
              'Kilomètres parcourus.',
            ]} />
            <p>
              <strong>Deux modes de saisie :</strong> le chauffeur saisit lui-même depuis son espace
              (recommandé), ou vous saisissez à sa place via <strong>Relevés journaliers → Ajouter</strong>
              sur sa fiche. Un seul relevé par jour et par chauffeur (toute nouvelle saisie du même jour
              met à jour l'existant).
            </p>
          </Section>

          <Section id="kpis" title="7 — KPIs & rentabilité">
            <p>
              En haut de chaque fiche chauffeur, le bloc <strong>Performance</strong> (30 derniers
              jours par défaut) calcule :
            </p>
            <div className="my-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Bullet title="CA total / CA net" body="CA net = CA − carburant − autres dépenses." />
              <Bullet title="CA par jour" body="CA total ÷ nombre de jours travaillés (jours avec relevé)." />
              <Bullet title="CA par km" body="Productivité du kilomètre parcouru." />
              <Bullet title="Rentabilité" body="CA − carburant − dépenses − pièces du véhicule − coût des incidents. Vert si positive, rouge sinon." />
            </div>
            <p>
              La <strong>rentabilité</strong> est le chiffre clé : elle relie les recettes du chauffeur
              au coût réel d'entretien du véhicule qu'il conduit (commandes de pièces payées sur la
              période) et aux incidents. C'est ce qui permet de repérer un chauffeur très productif…
              ou un véhicule qui coûte plus qu'il ne rapporte.
            </p>
          </Section>

          <Section id="incidents" title="8 — Incidents & conduite">
            <p>
              Depuis la fiche chauffeur, <strong>Incidents → Signaler</strong> permet de consigner un
              accident, une infraction, une panne ou une plainte, avec une gravité (faible / moyenne /
              élevée) et un coût estimé. Ces coûts entrent dans le calcul de rentabilité et donnent une
              lecture objective de l'impact de la conduite sur le véhicule.
            </p>
          </Section>

          <Section id="entretien" title="9 — Entretien">
            <p>
              Programmez les entretiens récurrents (vidange, filtres, plaquettes, distribution…) avec
              un intervalle en kilomètres. Pièces calcule automatiquement les échéances à partir du
              kilométrage et vous alerte. Rattachez chaque véhicule à un <strong>centre de
              maintenance</strong> pour organiser les livraisons sur site.
            </p>
          </Section>

          <Section id="commandes" title="10 — Commander des pièces">
            <p>
              Recherchez une pièce (contextualisée par véhicule), comparez les fournisseurs et les
              conditions (Neuf, Occasion importée, Ré-usiné, Aftermarket, OEM), puis commandez en
              Mobile Money. Le décompte des prix (pièce / main-d'œuvre / livraison / frais) est toujours
              affiché avant paiement. Téléchargez un <strong>devis PDF</strong> pour validation interne,
              et retrouvez toutes les dépenses dans le tableau de bord et l'export comptable.
            </p>
          </Section>

          <Section id="faq" title="FAQ">
            <Faq q="Un chauffeur peut-il voir les données d'un autre ?" a="Non. Chaque chauffeur ne voit que son profil, son véhicule affecté et ses propres relevés." />
            <Faq q="Que se passe-t-il si le chauffeur ne saisit pas son relevé ?" a="Vous pouvez le saisir à sa place depuis sa fiche. Les jours sans relevé ne comptent pas dans la moyenne « CA par jour »." />
            <Faq q="Puis-je changer le véhicule d'un chauffeur ?" a="Oui, à tout moment. L'historique d'affectation est conservé et les anciens relevés gardent le véhicule de l'époque." />
            <Faq q="La rentabilité inclut-elle le coût des pièces ?" a="Oui : elle déduit les commandes de pièces payées sur la période pour le(s) véhicule(s) conduit(s) par le chauffeur, ainsi que le coût estimé des incidents." />
          </Section>

          <div className="rounded-md border border-border bg-card p-6">
            <p className="font-display text-lg text-ink">Vos chauffeurs ont aussi leur manuel</p>
            <p className="mt-1 text-sm text-muted">Partagez-leur le guide dédié pour activer leur compte et saisir leur relevé du jour.</p>
            <Link href="/entreprises/guide/chauffeur" className="mt-3 inline-block rounded-md bg-ink-2 px-4 py-2 text-sm font-semibold text-white hover:bg-ink">
              Ouvrir le manuel chauffeur →
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}

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
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-4 rounded-md border-l-4 border-aftermarket-fg bg-aftermarket-bg p-4 text-sm text-aftermarket-fg">
      {children}
    </div>
  )
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-sm bg-surface px-1.5 py-0.5 text-sm">{children}</code>
}
function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-t border-border py-4 first:border-t-0">
      <p className="font-display text-base text-ink">{q}</p>
      <p className="mt-1 text-sm text-muted">{a}</p>
    </div>
  )
}
