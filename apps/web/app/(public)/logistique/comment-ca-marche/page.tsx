import type { Metadata } from 'next'
import Link from 'next/link'
import {
  LOGISTIQUE_STEPS,
  TRANSPORT_STAGES,
  MODE_COPY,
  PUBLIC_MODES,
  LOGISTIQUE_LEVERS,
  canonicalFor,
} from '@/lib/logistique-content'

export const metadata: Metadata = {
  title: 'Comment ça marche — Import de pièces détachées à Abidjan',
  description:
    'Quatre étapes pour faire venir une pièce détachée à Abidjan : estimation immédiate, devis ferme, acheminement, suivi de bout en bout. Sourcing, transit, douane, livraison.',
  alternates: { canonical: canonicalFor('/comment-ca-marche') },
}

export default function LogistiqueHowPage() {
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 lg:px-8 lg:py-20">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
            Parcours
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl text-white lg:text-[44px]">
            Quatre étapes, un seul interlocuteur, de la photo au véhicule redémarré.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/65">
            Le formulaire prend deux minutes et ne demande pas de compte. Vous voyez le coût total —
            y compris l&apos;immobilisation — avant de vous engager. Le devis confirmé suit par
            WhatsApp, généralement sous deux heures ouvrées.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {LOGISTIQUE_STEPS.map((s, i) => (
            <li key={s.title} className="relative border-t-2 border-ink pt-5">
              <span className="tabular absolute -top-3 left-0 bg-surface pr-2 font-mono text-[13px] text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-[18px] font-semibold text-ink">{s.title}</h2>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Suivi de transport
          </div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[36px]">
            Où en est la pièce, du sourcing à la livraison.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            Six étapes, mises à jour manuellement par notre équipe à chaque changement. Pas de
            suivi automatique qui raconte n&apos;importe quoi : on préfère un statut rare mais juste.
          </p>
          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TRANSPORT_STAGES.map((stage, i) => (
              <li
                key={stage.key}
                className="relative rounded-md border border-border bg-surface p-5"
              >
                <div className="flex items-baseline gap-2">
                  <span className="tabular font-mono text-[12px] text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-[16px] font-semibold text-ink">{stage.label}</h3>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{stage.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Périmètre
        </div>
        <h2 className="mt-3 text-3xl text-ink lg:text-[36px]">
          Ce que nous prenons en charge, de bout en bout.
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LOGISTIQUE_LEVERS.map((l) => (
            <div key={l.title} className="border-t-2 border-ink pt-4">
              <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
                {l.line}
              </div>
              <h3 className="mt-2 text-[17px] font-semibold text-ink">{l.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
            Modes d&apos;acheminement
          </div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[36px]">
            Cinq façons de faire venir la pièce, comparées sur la même grille.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PUBLIC_MODES.map((mode) => {
              const copy = MODE_COPY[mode]
              return (
                <article key={mode} className="rounded-md border border-border bg-surface p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[17px] font-semibold text-ink">{copy.publicLabel}</h3>
                    <span className="tabular whitespace-nowrap font-mono text-[13px] text-accent">
                      {copy.delay}
                    </span>
                  </div>
                  <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{copy.useCase}</p>
                  <p className="mt-3 border-t border-border pt-3 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-2">
                    {copy.basis}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 text-center lg:px-8 lg:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl text-white lg:text-[36px]">
            Prêt à chiffrer votre pièce ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            Estimation immédiate, sans compte, en deux minutes. Le devis confirmé suit par
            WhatsApp, généralement sous deux heures ouvrées.
          </p>
          <Link
            href="/logistique/devis"
            className="mt-7 inline-block rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Démarrer une demande
          </Link>
        </div>
      </section>
    </>
  )
}
