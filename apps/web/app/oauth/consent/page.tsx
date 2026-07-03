import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Connexion & consentement — Pièces',
  description:
    "Ce que Pièces consulte lorsque vous vous connectez avec Google, Facebook ou WhatsApp, et comment vos données sont utilisées.",
}

/** Third-party sign-in providers Pièces integrates, and the data each shares. */
const PROVIDERS = [
  {
    name: 'Google',
    accents: 'text-[#4285F4]',
    data: ['Votre nom', 'Votre adresse email', 'Votre photo de profil (facultatif)'],
  },
  {
    name: 'Facebook',
    accents: 'text-[#1877F2]',
    data: ['Votre nom', 'Votre adresse email', 'Votre photo de profil (facultatif)'],
  },
  {
    name: 'WhatsApp',
    accents: 'text-[#128C7E]',
    data: ['Votre numéro de téléphone (que vous nous envoyez vous-même)'],
  },
]

const USES = [
  'Créer et sécuriser votre compte Pièces',
  'Vous identifier à chaque connexion, sans mot de passe à retenir',
  'Vous contacter au sujet de vos commandes et livraisons',
]

const NEVER = [
  'Nous ne publions jamais rien en votre nom',
  'Nous n’accédons pas à vos contacts, messages ou publications',
  'Nous ne vendons pas vos données personnelles à des tiers',
]

export default function OAuthConsentPage() {
  const year = 2026

  return (
    <div className="min-h-screen bg-white pb-16">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[880px] items-center justify-between px-6 py-3">
          <Link href="/" className="flex-shrink-0">
            <span className="font-display text-2xl text-ink">
              Pièces<span className="text-accent">.</span>
            </span>
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[880px] px-6">
        {/* Hero */}
        <section className="border-b border-border py-12">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Connexion & consentement
          </p>
          <h1 className="mt-2 font-display text-4xl leading-tight text-ink">
            Ce que Pièces consulte quand vous vous connectez
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Pièces est la marketplace de pièces détachées automobiles en Côte d’Ivoire. Lorsque vous
            choisissez de vous connecter avec Google, Facebook ou WhatsApp, ces services partagent un
            minimum d’informations avec nous, uniquement pour créer votre compte et sécuriser votre
            connexion. Vous gardez le contrôle à tout moment.
          </p>
        </section>

        {/* What each provider shares */}
        <section className="py-12">
          <h2 className="font-display text-2xl text-ink">Les informations partagées</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PROVIDERS.map((provider) => (
              <div key={provider.name} className="rounded-md border border-border bg-card p-5">
                <h3 className={`font-display text-lg ${provider.accents}`}>{provider.name}</h3>
                <ul className="mt-3 space-y-2">
                  {provider.data.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink">
                      <span className="mt-0.5 text-accent" aria-hidden="true">
                        →
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* How we use it */}
        <section className="border-t border-border py-12">
          <h2 className="font-display text-2xl text-ink">Comment nous les utilisons</h2>
          <ul className="mt-6 space-y-3">
            {USES.map((use) => (
              <li key={use} className="flex gap-3 text-base leading-relaxed text-ink">
                <span className="mt-1 text-accent" aria-hidden="true">
                  →
                </span>
                <span>{use}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What we never do */}
        <section className="rounded-md border border-border bg-surface p-6 md:p-8">
          <h2 className="font-display text-2xl text-ink">Ce que nous ne faisons jamais</h2>
          <ul className="mt-6 space-y-3">
            {NEVER.map((item) => (
              <li key={item} className="flex gap-3 text-base leading-relaxed text-ink">
                <span className="mt-1 text-accent" aria-hidden="true">
                  ✕
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Control / revoke */}
        <section className="py-12">
          <h2 className="font-display text-2xl text-ink">Vous gardez le contrôle</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            Vous pouvez révoquer l’accès de Pièces à tout moment depuis les paramètres de sécurité de
            votre compte Google ou Facebook, ou demander la suppression de vos données directement
            depuis votre profil Pièces. Pour toute question relative à vos données, écrivez-nous à{' '}
            <a href="mailto:contact@pieces.ci" className="text-ink-2 underline hover:text-accent">
              contact@pieces.ci
            </a>
            .
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/profile/data"
              className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              Gérer mes données
            </Link>
            <Link
              href="/confidentialite"
              className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface"
            >
              Politique de confidentialité
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[880px] flex-col items-center justify-between gap-3 px-6 py-8 md:flex-row">
          <span className="font-display text-xl text-ink">
            Pièces<span className="text-accent">.</span>
          </span>
          <p className="text-xs text-muted">
            &copy; {year} Pièces.ci — Abidjan, Côte d’Ivoire
          </p>
        </div>
      </footer>
    </div>
  )
}
