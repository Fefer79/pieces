const STEPS = [
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

export function HowItWorksSection() {
  return (
    <section id="comment-ca-marche" className="bg-[#FAFAFA] px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-4xl lg:max-w-6xl">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1A1A1A] lg:text-3xl">
          Comment ça marche
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[#002366] text-white">
                {step.icon}
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#1A1A1A]">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 min-h-[3rem] font-semibold text-[#1A1A1A]">{step.title}</h3>
              <p className="min-h-[4.5rem] text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
