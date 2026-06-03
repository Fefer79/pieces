/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link'

export const metadata = {
  title: 'Manuel chauffeur de flotte — Pièces',
  description:
    'Le guide du chauffeur sur Pièces : activer votre compte, retrouver votre véhicule, saisir votre relevé du jour (chiffre d\'affaires, carburant, km) et suivre votre historique.',
}

const SECTIONS = [
  { id: 'bienvenue', label: 'Bienvenue' },
  { id: 'activer', label: '1 — Activer mon compte' },
  { id: 'espace', label: '2 — Mon espace' },
  { id: 'vehicule', label: '3 — Mon véhicule' },
  { id: 'releve', label: '4 — Mon relevé du jour' },
  { id: 'historique', label: '5 — Mon historique' },
  { id: 'astuces', label: 'Bonnes pratiques' },
  { id: 'faq', label: 'FAQ' },
]

export default function DriverGuidePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 lg:px-8 lg:py-12">
      <header className="mb-12 border-b border-border pb-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Manuel — Chauffeur de flotte
        </div>
        <h1 className="mt-2 font-display text-4xl text-ink lg:text-5xl">
          Votre espace chauffeur, pas à pas
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted">
          Activez votre compte, retrouvez le véhicule qui vous est confié, et enregistrez chaque jour
          votre recette et vos dépenses en quelques secondes depuis votre téléphone. Simple, et ça
          aide toute l'équipe à mieux gérer la flotte.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/driver" className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover">
            Ouvrir mon espace
          </Link>
          <Link href="/login" className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface">
            Me connecter
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
          <Section id="bienvenue" title="Bienvenue">
            <p>
              Vous conduisez un véhicule pour une entreprise inscrite sur Pièces. Votre gestionnaire
              vous a créé une fiche chauffeur. Ce manuel vous explique comment activer votre compte et
              utiliser votre espace au quotidien. <strong>Vous ne voyez que vos propres
              informations</strong> — votre recette, votre véhicule, votre historique.
            </p>
          </Section>

          <Section id="activer" title="1 — Activer mon compte">
            <p>
              Votre compte s'active tout seul, sans inscription compliquée :
            </p>
            <Steps steps={[
              'Allez sur pieces.ci et connectez-vous avec le numéro de téléphone que votre gestionnaire a enregistré.',
              'Vous recevez un code par SMS — saisissez-le pour vous connecter.',
              'À la première connexion, votre compte est automatiquement relié à votre fiche chauffeur.',
              'Votre espace chauffeur apparaît : c\'est prêt.',
            ]} />
            <Tip><strong>Le bon numéro :</strong> utilisez exactement le numéro communiqué à votre
              gestionnaire. Si la connexion ne relie pas votre espace, vérifiez ce numéro avec lui.</Tip>
          </Section>

          <Section id="espace" title="2 — Mon espace">
            <p>
              Une fois connecté, ouvrez <Code>/driver</Code> (ou « Mon espace » dans le menu en bas de
              l'écran). Vous y trouvez votre nom, votre entreprise, votre véhicule affecté, le formulaire
              du relevé du jour et vos derniers relevés.
            </p>
          </Section>

          <Section id="vehicule" title="3 — Mon véhicule">
            <p>
              La carte <strong>« Mon véhicule »</strong> affiche le véhicule qui vous est actuellement
              confié (marque, modèle, immatriculation). Si rien n'apparaît, c'est qu'aucun véhicule ne
              vous est affecté pour le moment — demandez à votre gestionnaire.
            </p>
          </Section>

          <Section id="releve" title="4 — Mon relevé du jour">
            <p>
              C'est l'essentiel : chaque jour, renseignez ces quatre champs puis appuyez sur
              <strong> Enregistrer le relevé</strong>.
            </p>
            <Steps steps={[
              'Chiffre d\'affaires : la recette que vous avez encaissée aujourd\'hui (en FCFA).',
              'Carburant : ce que vous avez dépensé en gasoil/essence.',
              'Autres dépenses : péage, lavage, petites dépenses du jour.',
              'Km parcourus : le nombre de kilomètres roulés (facultatif mais utile).',
            ]} />
            <p>
              Vous pouvez revenir sur le relevé du jour autant de fois que nécessaire : la dernière
              saisie remplace la précédente. Un message vert confirme l'enregistrement.
            </p>
            <Tip><strong>Astuce :</strong> saisissez votre relevé en fin de journée, quand les chiffres
              sont frais. Ça prend moins d'une minute.</Tip>
          </Section>

          <Section id="historique" title="5 — Mon historique">
            <p>
              Sous le formulaire, <strong>« Mes derniers relevés »</strong> liste vos journées passées
              avec, pour chacune, la recette et le <em>net</em> (recette − carburant − dépenses). C'est
              votre carnet de bord personnel, toujours à portée de main.
            </p>
          </Section>

          <Section id="astuces" title="Bonnes pratiques">
            <div className="my-2 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Bullet title="Chaque jour" body="Un relevé quotidien donne des chiffres fiables. Mieux vaut un chiffre approché que rien." />
              <Bullet title="Notez les pannes" body="Signalez à votre gestionnaire toute panne ou incident : il pourra le consigner." />
              <Bullet title="Vérifiez le véhicule" body="Si le véhicule affiché n'est pas le bon, prévenez votre gestionnaire." />
            </div>
          </Section>

          <Section id="faq" title="FAQ">
            <Faq q="J'ai changé de téléphone, comment je me connecte ?" a="Connectez-vous avec le même numéro de téléphone qu'avant. Si le numéro a changé, demandez à votre gestionnaire de le mettre à jour sur votre fiche." />
            <Faq q="Je me suis trompé dans un chiffre, je fais quoi ?" a="Ressaisissez le relevé du jour : la nouvelle valeur remplace l'ancienne. Pour un jour passé, demandez à votre gestionnaire." />
            <Faq q="Les autres chauffeurs voient-ils ma recette ?" a="Non. Seul vous et votre gestionnaire voyez vos relevés." />
            <Faq q="Aucun véhicule ne s'affiche, est-ce normal ?" a="Cela signifie qu'aucun véhicule ne vous est affecté pour l'instant. Votre gestionnaire peut vous en affecter un à tout moment." />
          </Section>

          <div className="rounded-md border border-border bg-card p-6">
            <p className="font-display text-lg text-ink">Prêt à enregistrer votre journée ?</p>
            <p className="mt-1 text-sm text-muted">Ouvrez votre espace et saisissez votre relevé du jour.</p>
            <Link href="/driver" className="mt-3 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
              Ouvrir mon espace →
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
