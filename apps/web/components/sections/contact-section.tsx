// Contact — aligné sur les tokens DESIGN.md en même temps que la refonte
// « À propos » / « Comment ça marche » (l'ancienne version utilisait des cartes
// vert/bleu Tailwind brutes, dépareillées du reste de la page).

const WA_NUMBER = '2250706846268'

export function ContactSection() {
  return (
    <section id="contact" className="border-y border-border bg-card px-6 py-14 lg:py-16">
      <div className="mx-auto grid max-w-[1152px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Contact
          </div>
          <h2 className="mt-3 max-w-[22ch] text-3xl text-ink lg:text-[34px]">
            Un doute sur une pièce ? Écrivez-nous.
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-muted">
            Compatibilité, choix entre neuf et occasion importée, délai d&apos;import : la réponse
            est gratuite et sans engagement, avant même que vous commandiez.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={`https://wa.me/${WA_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-accent px-6 py-3 text-center text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            WhatsApp · +225 07 06 84 62 68
          </a>
          <a
            href="mailto:contact@pieces.ci"
            className="rounded-md border border-border-strong px-6 py-3 text-center text-[15px] font-semibold text-ink transition-colors hover:border-ink"
          >
            contact@pieces.ci
          </a>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            Abidjan, Côte d&apos;Ivoire · du lundi au samedi
          </p>
        </div>
      </div>
    </section>
  )
}
