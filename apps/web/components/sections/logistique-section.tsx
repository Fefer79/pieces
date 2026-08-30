import Link from 'next/link'
import { MODE_COPY } from '@/lib/logistique-content'

// Section « la pièce n'est pas disponible » de l'accueil — la porte d'entrée
// vers logistique.pieces.ci. Elle remplace, côté desktop comme mobile, l'ancienne
// carte promo « Ré-usinés » : le vrai trou dans le parcours n'est pas le prix du
// neuf, c'est l'absence pure et simple de la pièce à Abidjan.
//
// Les délais viennent de MODE_COPY (lib/logistique-content.ts) — source unique,
// jamais recopiés en dur ici. Le reçu est un exemple de cadrage, pas un tarif.

// Trois façons de faire venir la pièce. L'achat local n'y figure plus : cette
// section s'adresse justement à ceux pour qui aucun vendeur d'Abidjan ne l'a.
const MODES = ['AIR_NOW', 'AIR_STANDARD', 'SEA_LCL'] as const

const RECEIPT_LINES: Array<{ label: string; amount: number; dominant?: boolean }> = [
  { label: 'Prix de la pièce', amount: 310000 },
  { label: 'Acheminement aérien', amount: 96000 },
  { label: 'Douane et taxes', amount: 74500, dominant: true },
  { label: 'Frais d’envoi Pièces (10 %)', amount: 31000 },
]

const RECEIPT_TOTAL = RECEIPT_LINES.reduce((sum, line) => sum + line.amount, 0)

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} F`

export function LogistiqueSection() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-14 lg:py-16">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
          Quand la pièce n&apos;est pas disponible
        </div>
        <h2 className="mt-3 max-w-[22ch] text-3xl text-ink lg:text-[34px]">
          Aucun vendeur ne l&apos;a ? On la fait venir.
        </h2>
        <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-muted">
          Le catalogue couvre ce qui existe à Abidjan. Pour le reste, Pièces devient votre
          logisticien : nous sourçons la pièce à l&apos;étranger et vous annonçons le coût rendu,
          poste par poste — douane et livraison comprises.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="flex flex-col gap-4">
            {MODES.map((mode) => {
              const copy = MODE_COPY[mode]
              return (
                <article key={mode} className="rounded-md border border-border bg-surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[19px] text-ink">{copy.publicLabel}</h3>
                    <span className="tabular whitespace-nowrap font-mono text-[13px] text-accent">
                      {copy.delay}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{copy.useCase}</p>
                </article>
              )
            })}
          </div>

          {/* Composant « Reçu » — la signature de la vitrine logistique (DESIGN.md :
              le détail du prix est explicite avant tout engagement). */}
          <div className="overflow-hidden rounded-md border border-border bg-card shadow-md">
            <div className="bg-ink px-6 py-4 text-white">
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-white/60">
                Exemple d&apos;estimation
              </div>
              <div className="mt-1 font-display text-[22px]">Turbo — Hyundai H1, aérien</div>
            </div>
            <div className="px-6 py-5">
              {RECEIPT_LINES.map((line) => (
                <div key={line.label} className="flex items-baseline gap-2.5 py-1.5 text-sm">
                  <span className={line.dominant ? 'font-semibold text-ink' : ''}>{line.label}</span>
                  <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-border" />
                  <span
                    className={`tabular whitespace-nowrap font-mono ${
                      line.dominant ? 'font-semibold text-accent' : ''
                    }`}
                  >
                    {fcfa(line.amount)}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-baseline gap-2 border-t-2 border-ink pt-3.5">
                <span className="text-[15px] font-bold">Coût rendu</span>
                <span className="tabular ml-auto font-mono text-[22px] text-ink">
                  {fcfa(RECEIPT_TOTAL)}
                </span>
              </div>
              <p className="mt-4 rounded-md bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                Estimation de cadrage, confirmée par un devis avant toute commande. Les délais
                annoncés ne sont pas des engagements contractuels.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/logistique/devis"
            className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Demander une cotation
          </Link>
          <Link
            href="/logistique"
            className="rounded-md border border-border-strong px-6 py-3 text-[15px] font-semibold text-ink transition-colors hover:border-ink"
          >
            Découvrir Pièces Logistique
          </Link>
        </div>
      </div>
    </section>
  )
}
