import Link from 'next/link'

export default function CommentCaMarchePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-14 lg:px-8">
      <h1 className="mb-6 font-display text-4xl text-ink">Comment ça marche</h1>

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Pour trouver un mécanicien</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            Parcourez l&apos;annuaire par commune ou activez la géolocalisation pour voir les
            ateliers les plus proches. Chaque fiche affiche les spécialités déclarées et, quand
            ils existent, la note et le nombre d&apos;avis laissés par d&apos;autres clients.
            Appelez directement depuis la fiche.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Pour inscrire son atelier</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            L&apos;inscription est gratuite et publiée immédiatement — pas de dossier à
            constituer. Renseignez votre nom, votre téléphone, votre commune et vos spécialités.
            L&apos;équipe Pièces peut suspendre une fiche signalée à tort ou frauduleuse.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-ink">Sur les avis</h2>
          <p className="text-[15px] leading-relaxed text-muted">
            Tout utilisateur avec un compte vérifié peut laisser un avis sur un mécanicien, même
            si l&apos;intervention n&apos;est pas passée par Pièces — la plupart des réparations
            se négocient directement avec l&apos;atelier.
          </p>
        </section>
      </div>

      <Link href="/mecaniciens" className="mt-10 inline-block text-sm font-semibold text-accent hover:underline">
        ← Retour à l&apos;annuaire
      </Link>
    </main>
  )
}
