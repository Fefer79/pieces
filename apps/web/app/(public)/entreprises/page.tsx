import Link from 'next/link'
import { FLEET_PLANS, FLEET_COMPARISON, COST_LEVERS, DELIVERY_PROMISE } from '@/lib/fleet-plans'

export const metadata = {
  title: 'Pièces Entreprises — Optimisez les coûts de votre flotte',
  description:
    'La plateforme qui réduit les coûts d\'exploitation de votre flotte en Côte d\'Ivoire : achats au meilleur prix, pilotage des coûts, entretien préventif, livraison express. Gratuit, Flotte Pro 5 000 F, Flotte Pro + 10 000 F par véhicule / mois.',
}

export default function EntreprisesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-16">
      {/* Hero */}
      <header className="border-b border-border pb-10">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Pièces Entreprises
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink lg:text-5xl">
          Optimisez les coûts d&apos;exploitation de votre flotte.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          Pièces réunit sur une seule plateforme l&apos;achat de pièces au meilleur
          prix sur{' '}
          <a
            href="https://pieces.ci"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            pieces.ci
          </a>
          , le pilotage des coûts véhicule par véhicule, l&apos;entretien
          préventif et la livraison express. Résultat : moins de surcoûts, moins de
          pannes, moins d&apos;immobilisation. Pour les flottes de 5 véhicules ou plus
          en Côte d&apos;Ivoire dans tous les domaines : transport, VTC, BTP, mines,
          location et services.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/enterprise/dashboard"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            Démarrer l&apos;essai 30 jours
          </Link>
          <Link
            href="/entreprises/calculateur-roi"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Calculer votre ROI
          </Link>
          <Link
            href="/entreprises/guide"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Lire le guide d&apos;utilisation
          </Link>
        </div>
      </header>

      {/* Cost levers */}
      <section className="mt-12">
        <h2 className="font-display text-3xl text-ink">Quatre leviers d&apos;économies</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Chaque fonctionnalité de Pièces existe pour faire baisser une ligne de
          votre budget d&apos;exploitation.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {COST_LEVERS.map((l) => (
            <div key={l.title} className="rounded-xl border border-border bg-card p-5">
              <div className="font-display text-lg text-ink">{l.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{l.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tier cards */}
      {/*
        Subgrid layout: the section owns 6 row tracks (label, tagline, price,
        priceNote, advantages[1fr], CTA) and each card spans all of them via
        `grid-rows-subgrid`. Every row therefore takes the tallest content
        across the three cards, so prices / notes / advantages / CTAs stay
        aligned at any width — no fragile min-height guesses. Collapses to a
        plain stacked flex column below `md`.
      */}
      <section className="mt-16 grid gap-y-10 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto_1fr_auto] md:gap-x-5 md:gap-y-0">
        {FLEET_PLANS.map((t) => (
          <article
            key={t.key}
            className={
              (t.highlight
                ? 'border-2 border-accent shadow-sm'
                : 'border border-border') +
              ' relative flex flex-col rounded-xl bg-card p-6 md:row-span-6 md:grid md:grid-rows-subgrid'
            }
          >
            {t.highlight && t.badge ? (
              <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent/10 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent">
                {t.badge}
              </span>
            ) : null}

            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {t.label}
            </div>
            <div className="mt-1 font-display text-2xl leading-snug text-ink">
              {t.tagline}
            </div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-3xl text-ink">{t.price}</span>
              {t.key !== 'FREE' && <span className="text-sm text-muted">FCFA</span>}
            </div>
            <div className="mt-1 text-xs text-muted">{t.priceNote}</div>

            <ul className="mb-7 mt-6 space-y-2.5 text-sm text-ink">
              {t.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="mt-1 text-accent">✓</span>
                  <span className="leading-snug">{h}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/login"
              className={
                t.highlight
                  ? 'mt-auto block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover'
                  : 'mt-auto block rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface'
              }
            >
              {t.cta}
            </Link>
          </article>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-muted">
        Prix flat par véhicule, mensuel d&apos;avance. Paiement annuel = 2 mois
        offerts. Toutes les entreprises démarrent avec 30 jours d&apos;essai gratuit,
        d&apos;office.
      </p>

      {/* Comparison */}
      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">Tableau comparatif détaillé</h2>
        <p className="mt-2 text-sm text-muted">
          <strong>Flotte Pro +</strong> inclut tout Flotte Pro et ajoute la
          livraison express, l&apos;automatisation du stock, la facturation
          consolidée et le support prioritaire.
        </p>

        <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface text-left">
                <th className="px-4 py-3 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Fonctionnalité
                </th>
                <th className="px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Gratuit
                </th>
                <th className="px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Flotte Pro
                </th>
                <th className="px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
                  Flotte Pro +
                </th>
              </tr>
            </thead>
            <tbody>
              {FLEET_COMPARISON.flatMap((g) => [
                <tr key={`group-${g.group}`} className="bg-surface/50">
                  <td colSpan={4} className="px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
                    {g.group}
                  </td>
                </tr>,
                ...g.rows.map((r) => (
                  <tr key={`${g.group}-${r.label}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-ink">{r.label}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{r.free}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{r.pro}</td>
                    <td className="px-4 py-2.5 text-center font-medium text-ink">{r.plus}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{DELIVERY_PROMISE}</p>
      </section>

      {/* ROI panel */}
      <section className="mt-16 rounded-xl border border-border bg-card p-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          ROI typique
        </div>
        <h2 className="mt-2 font-display text-3xl text-ink">
          Pour une flotte de 50 véhicules, l&apos;abonnement se rembourse plusieurs
          fois en économies sur le budget pièces.
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { label: 'Économie cible sur les pièces', value: '20–30 %' },
            { label: 'Investissement Flotte Pro + / an (50 véh)', value: '5 M F' },
            { label: 'ROI net minimum / an (50 véh)', value: '+ 25 M F' },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl text-ink">{s.value}</div>
              <div className="mt-1 text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-muted">
          Hypothèse : budget pièces annuel typique 150 M F sur 50 véhicules,
          économie projetée 20 % minimum via comparateur, scoring qualité
          fournisseur, détection des véhicules « gouffres » et stock tampon
          automatique. Testez-le pendant 30 jours gratuits : vous mesurez les
          gains sur votre propre flotte avant tout engagement.
        </p>
      </section>

      {/* How to start */}
      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">Comment démarrer</h2>
        <ol className="mt-6 space-y-3 text-sm text-ink">
          {[
            'Créez votre compte entreprise sur pieces.ci (signature en ligne, RCCM facultatif).',
            'Importez le CSV de votre flotte (marque, modèle, année, plaque, km).',
            'Essai 30 jours activé automatiquement — toutes les fonctionnalités Flotte Pro +, sans carte bancaire.',
            'Déclarez vos centres de maintenance et rattachez vos véhicules.',
            'Invitez votre équipe avec des rôles distincts (gestionnaire, mécanicien, comptable).',
            'À J+30, vous choisissez : Flotte Pro +, Flotte Pro, ou le niveau gratuit.',
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 font-mono text-xs font-semibold text-accent">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Créer mon compte entreprise
          </Link>
          <Link
            href="/entreprises/guide"
            className="rounded-md border border-border-strong bg-card px-5 py-2.5 text-sm font-semibold text-ink hover:bg-surface"
          >
            Lire le guide complet
          </Link>
        </div>
      </section>

      <p className="mt-16 border-t border-border pt-6 text-xs text-muted">
        Activation des abonnements en phase pilote (semestre 1 2026) — activation
        manuelle par l&apos;équipe Pièces après inscription. Paiement automatisé
        et calculateur ROI public à venir.
      </p>
    </div>
  )
}
