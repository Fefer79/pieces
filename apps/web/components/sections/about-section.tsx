export function AboutSection() {
  return (
    <section id="a-propos" className="bg-white px-4 py-16 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-2xl font-bold text-[#1A1A1A] lg:text-3xl">
          À Propos
        </h2>

        <p className="mb-8 text-center text-gray-600 lg:text-lg">
          <strong>Pièces.ci</strong> est la première marketplace de pièces auto
          d&apos;occasion en Côte d&apos;Ivoire. Nous connectons mécaniciens,
          propriétaires de véhicules et vendeurs de pièces à Abidjan.
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#1976D2]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Mécaniciens</h3>
            <p className="text-sm text-gray-600">
              Trouvez rapidement la bonne pièce grâce à la recherche par photo,
              VIN ou nom.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#1976D2]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Propriétaires</h3>
            <p className="text-sm text-gray-600">
              Payez en toute sécurité via notre système d&apos;escrow. Votre
              argent est protégé.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-[#FAFAFA] p-6 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-[#1976D2]">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                <path d="M5.223 2.25c-.497 0-.974.198-1.325.55l-1.3 1.298A3.75 3.75 0 007.5 9.75c.627.47 1.406.75 2.25.75.844 0 1.624-.28 2.25-.75.626.47 1.406.75 2.25.75.844 0 1.623-.28 2.25-.75a3.75 3.75 0 004.902-5.652l-1.3-1.299a1.875 1.875 0 00-1.325-.549H5.223z" />
                <path fillRule="evenodd" d="M3 20.25v-8.755c1.42.674 3.08.674 4.5 0A5.234 5.234 0 009.75 12c.804 0 1.568-.182 2.25-.506a5.234 5.234 0 002.25.506c.804 0 1.567-.182 2.25-.506 1.42.674 3.08.674 4.5 0v8.755h.75a.75.75 0 010 1.5H2.25a.75.75 0 010-1.5H3zm3 0h4.5v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V20.25H19.5v-7.513a6.174 6.174 0 01-2.25-.39 6.174 6.174 0 01-2.25.396c-.822 0-1.6-.187-2.25-.504a6.174 6.174 0 01-2.25.504 6.174 6.174 0 01-2.25-.396 6.174 6.174 0 01-2.25.39v7.513z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="mb-2 font-semibold text-[#1A1A1A]">Vendeurs</h3>
            <p className="text-sm text-gray-600">
              Publiez votre catalogue et recevez des commandes directement sur
              la plateforme.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
