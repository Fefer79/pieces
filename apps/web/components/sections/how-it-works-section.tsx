import Link from 'next/link'

type Step = {
  number: string
  title: string
  description: string
  icon: React.ReactNode
}

// Parcours prioritaire : entreprises & flottes (cf. /entreprises — Flotte Pro / Pro +)
const ENTERPRISE_STEPS: Step[] = [
  {
    number: '1',
    title: 'Enregistrez votre flotte',
    description:
      'Importez vos véhicules en CSV ou un par un. Chaque véhicule a sa fiche : kilométrage, historique et coûts.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625zM12.75 9.75a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9.75z" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Pilotez depuis le tableau de bord',
    description:
      'Suivez le coût de chaque véhicule, repérez les « gouffres » et recevez des alertes prédictives sur WhatsApp.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M18.375 2.25c-1.035 0-1.875.84-1.875 1.875v15.75c0 1.035.84 1.875 1.875 1.875h.75c1.035 0 1.875-.84 1.875-1.875V4.125c0-1.036-.84-1.875-1.875-1.875h-.75zM9.75 8.625c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-.75a1.875 1.875 0 01-1.875-1.875V8.625zM3 13.125c0-1.036.84-1.875 1.875-1.875h.75c1.036 0 1.875.84 1.875 1.875v6.75c0 1.035-.84 1.875-1.875 1.875h-.75A1.875 1.875 0 013 19.875v-6.75z" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Commandez et réapprovisionnez',
    description:
      'Comparez les fournisseurs et laissez le stock tampon se réapprovisionner seul. Vos pièces critiques sont toujours là.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.057-4.035.75.75 0 00-.53-.918z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '4',
    title: 'Facturation et livraison',
    description:
      'Une facture DGI consolidée en fin de mois, et la livraison express avec SLA jusqu’à votre garage.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm5.97 9.66a.75.75 0 10-1.19-.91l-2.66 3.48-.99-.99a.75.75 0 00-1.06 1.06l1.6 1.6a.75.75 0 001.124-.08l3.226-4.22z" clipRule="evenodd" />
        <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
      </svg>
    ),
  },
]

// Parcours particulier / mécanicien
const USER_STEPS: Step[] = [
  {
    number: '1',
    title: 'Le mécanicien démonte la pièce',
    description:
      'Le mécanicien identifie et démonte la pièce à remplacer. Il prend une photo ou vous l\'envoie si vous n\'êtes pas sur place.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'La photo arrive sur Pièces',
    description:
      'La photo est envoyée sur Pièces. Nous vous proposons les options disponibles chez les vendeurs.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
        <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.2.32.558.523.95.523h.3c1.796 0 3.241 1.51 3.241 3.3v7.2c0 1.79-1.445 3.3-3.241 3.3H5.241C3.445 20.1 2 18.59 2 16.8V9.6c0-1.79 1.445-3.3 3.241-3.3h.3c.392 0 .75-.203.95-.523l.821-1.317a2.616 2.616 0 012.332-1.39zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Choisissez au meilleur prix',
    description:
      'L\'acheteur compare les offres et choisit la pièce qui correspond le mieux à son besoin et son budget.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '4',
    title: 'Livraison au garage',
    description:
      'La pièce est livrée directement au mécanicien. Il peut commencer la réparation dès réception.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25zM13.5 15h-12v2.625C1.5 18.66 2.34 19.5 3.375 19.5H5.25a3.75 3.75 0 117.5 0h1.875c1.035 0 1.875-.84 1.875-1.875V15z" />
        <path d="M8.25 19.5a2.25 2.25 0 10-4.5 0 2.25 2.25 0 004.5 0zM15.75 6.75a.75.75 0 00-.75.75v11.25c0 .087.015.17.042.248a3 3 0 015.958.464c.853-.175 1.522-.935 1.464-1.883a18.659 18.659 0 00-3.732-10.104 1.837 1.837 0 00-1.47-.725H15.75z" />
        <path d="M19.5 19.5a2.25 2.25 0 10-4.5 0 2.25 2.25 0 004.5 0z" />
      </svg>
    ),
  },
]

function StepGrid({ steps, badgeClass }: { steps: Step[]; badgeClass: string }) {
  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      {steps.map((step) => (
        <div key={step.number} className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#002366] text-white">
            {step.icon}
            <span
              className={`absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${badgeClass}`}
            >
              {step.number}
            </span>
          </div>
          <h3 className="mb-2 min-h-[3rem] font-semibold text-[#1A1A1A]">{step.title}</h3>
          <p className="min-h-[4.5rem] text-sm text-gray-600">{step.description}</p>
        </div>
      ))}
    </div>
  )
}

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="bg-[#FAFAFA] px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-4xl lg:max-w-6xl">
        <h2 className="mb-12 text-center text-2xl font-bold text-[#1A1A1A] lg:text-3xl">
          Comment ça marche
        </h2>

        {/* Entreprises & flottes — en priorité */}
        <div className="mb-14">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="rounded-full bg-accent/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
              Entreprises &amp; flottes
            </span>
            <p className="text-sm text-gray-600">
              Gérez l’entretien de toute votre flotte depuis un seul tableau de bord.
            </p>
          </div>

          <StepGrid steps={ENTERPRISE_STEPS} badgeClass="bg-accent text-white" />

          <div className="mt-7 text-center">
            <Link
              href="/entreprises"
              className="inline-flex items-center gap-1 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Découvrir nos services entreprises →
            </Link>
          </div>
        </div>

        {/* Particuliers & mécaniciens */}
        <div className="border-t border-border pt-12">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <span className="rounded-full bg-gray-200 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-gray-600">
              Particuliers &amp; mécaniciens
            </span>
            <p className="text-sm text-gray-600">
              Une pièce à remplacer ? Une photo suffit pour la trouver au meilleur prix.
            </p>
          </div>

          <StepGrid steps={USER_STEPS} badgeClass="bg-amber-400 text-[#1A1A1A]" />
        </div>
      </div>
    </section>
  )
}
