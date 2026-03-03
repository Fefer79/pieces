const STEPS = [
  {
    number: '1',
    title: 'Identifiez la pièce',
    description:
      'Prenez une photo, scannez le VIN ou recherchez par nom. Notre IA identifie la pièce automatiquement.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
        <path fillRule="evenodd" d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.2.32.558.523.95.523h.3c1.796 0 3.241 1.51 3.241 3.3v7.2c0 1.79-1.445 3.3-3.241 3.3H5.241C3.445 20.1 2 18.59 2 16.8V9.6c0-1.79 1.445-3.3 3.241-3.3h.3c.392 0 .75-.203.95-.523l.821-1.317a2.616 2.616 0 012.332-1.39zM12 10.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '2',
    title: 'Le mécanicien commande',
    description:
      'Votre mécanicien crée la commande et vous envoie un lien de paiement sécurisé.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M7.5 6v.75H5.513c-.96 0-1.764.724-1.865 1.679l-1.263 12A1.875 1.875 0 004.25 22.5h15.5a1.875 1.875 0 001.865-2.071l-1.263-12a1.875 1.875 0 00-1.865-1.679H16.5V6a4.5 4.5 0 10-9 0zM12 3a3 3 0 00-3 3v.75h6V6a3 3 0 00-3-3zm-3 8.25a3 3 0 106 0v.75a.75.75 0 01-1.5 0v-.75a1.5 1.5 0 00-3 0v.75a.75.75 0 01-1.5 0v-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '3',
    title: 'Paiement sécurisé',
    description:
      'Le propriétaire paie via CinetPay. L\'argent est gardé en escrow jusqu\'à la livraison.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    number: '4',
    title: 'Livraison confirmée',
    description:
      'La pièce est livrée et vérifiée. Le vendeur reçoit le paiement une fois la livraison confirmée.',
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
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-10 text-center text-2xl font-bold text-[#1A1A1A] lg:text-3xl">
          Comment ça marche
        </h2>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <div key={step.number} className="flex flex-col items-center text-center">
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1976D2] text-white">
                {step.icon}
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-[#1A1A1A]">
                  {step.number}
                </span>
              </div>
              <h3 className="mb-2 font-semibold text-[#1A1A1A]">{step.title}</h3>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
