import type { Metadata } from 'next'
import Link from 'next/link'
import { LOGISTIQUE_FAQ, canonicalFor } from '@/lib/logistique-content'

export const metadata: Metadata = {
  title: 'FAQ — Logistique pièces détachées en Côte d\'Ivoire',
  description:
    'Questions fréquentes sur l\'import de pièces détachées automobiles à Abidjan : délais, douane, véhicules, paiement, garanties. Estimation immédiate sans compte.',
  alternates: { canonical: canonicalFor('/faq') },
}

export default function LogistiqueFaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LOGISTIQUE_FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto w-full max-w-3xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
          Foire aux questions
        </div>
        <h1 className="mt-3 text-3xl text-ink lg:text-[40px]">Avant de demander une cotation.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">
          Tout ce qu&apos;on nous demande le plus souvent. Si la vôtre n&apos;y est pas, écrivez-nous
          — la réponse finira ici.
        </p>

        <div className="mt-10 space-y-3">
          {LOGISTIQUE_FAQ.map((f, i) => (
            <details
              key={f.q}
              className="group rounded-md border border-border bg-card p-5 open:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
            >
              <summary className="flex cursor-pointer list-none items-start gap-3">
                <span className="tabular mt-0.5 font-mono text-[12px] text-accent">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-[15px] font-semibold text-ink">{f.q}</span>
                <span
                  aria-hidden="true"
                  className="mt-0.5 text-muted transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pl-7 text-[14.5px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-12 rounded-md border border-border bg-surface p-6 text-center">
          <p className="text-[14.5px] leading-relaxed text-muted">
            Une question qui n&apos;est pas là ? Décrivez la pièce en deux lignes et nous vous
            répondons sous deux heures ouvrées.
          </p>
          <Link
            href="/logistique/devis"
            className="mt-4 inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Démarrer une demande
          </Link>
        </div>
      </section>
    </>
  )
}
