import type { Metadata } from 'next'
import Link from 'next/link'
import { canonicalFor, MERCI_COPY } from '@/lib/logistique-content'

export const metadata: Metadata = {
  title: 'Demande enregistrée — Logistique Pièces',
  description: 'Votre demande de cotation logistique a été reçue.',
  robots: { index: false, follow: false },
  alternates: { canonical: canonicalFor('/devis/merci') },
}

export default function MerciPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>
}) {
  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 lg:px-8 lg:py-20">
      <div className="rounded-md border border-border bg-card p-8 lg:p-10">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-success-fg">
          {MERCI_COPY.title}
        </div>
        <h1 className="mt-3 text-3xl text-ink lg:text-[36px]">Votre demande est entre nos mains.</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted">{MERCI_COPY.lead}</p>

        <RefLine searchParams={searchParams} />

        <ol className="mt-7 space-y-3 border-t border-border pt-6 text-[14px] leading-relaxed text-ink">
          {MERCI_COPY.next.map((line, i) => (
            <li key={line} className="flex gap-3">
              <span className="tabular mt-0.5 font-mono text-[12px] text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ol>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/logistique/devis"
            className="rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Soumettre une autre demande
          </Link>
          <Link
            href="/logistique/faq"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-[14px] font-semibold text-ink hover:bg-surface"
          >
            Lire la FAQ
          </Link>
        </div>
      </div>
    </section>
  )
}

async function RefLine({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams
  if (!ref) return null
  return (
    <div className="mt-6 flex items-baseline gap-2 rounded-md border border-border-strong bg-surface px-4 py-3">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-muted">
        Référence
      </span>
      <span className="tabular ml-auto font-mono text-[20px] font-semibold text-ink">{ref}</span>
    </div>
  )
}
