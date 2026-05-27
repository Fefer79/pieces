import Link from 'next/link'

export const metadata = {
  title: 'Pièces Entreprises — Flotte Pro et Flotte Pro +',
  description:
    'Trois niveaux pour gérer votre flotte en Côte d\'Ivoire. Gratuit, Flotte Pro à 5 000 F/véh/mois, Flotte Pro + à 10 000 F/véh/mois.',
}

type Tier = {
  key: 'FREE' | 'PRO_FLOTTE' | 'PRO_FLOTTE_PLUS'
  label: string
  tagline: string
  price: string
  priceNote: string
  cta: string
  highlights: string[]
  highlight?: boolean
}

const TIERS: Tier[] = [
  {
    key: 'FREE',
    label: 'Gratuit',
    tagline: 'Achetez mieux.',
    price: '0 F',
    priceNote: 'commission fournisseur uniquement',
    cta: 'Créer un compte',
    highlights: [
      'Catalogue compatibilité véhicule',
      'Comparateur multi-fournisseurs sur le prix',
      'Garantie pièce intermédiée + retours',
      '1 centre de maintenance, 2 utilisateurs',
      'Export CSV des commandes',
    ],
  },
  {
    key: 'PRO_FLOTTE',
    label: 'Flotte Pro',
    tagline: 'Pilotez votre flotte.',
    price: '5 000 F',
    priceNote: 'par véhicule / mois — prix flat',
    cta: 'Demander un essai 30 jours',
    highlight: true,
    highlights: [
      'Détection automatique des véhicules « gouffres »',
      'Tableau de bord flotte multi-véhicules',
      'Alertes prédictives WhatsApp / SMS / email',
      'Stock tampon avec réapprovisionnement auto',
      'Factures normalisées DGI + facture mensuelle',
      'Module optimisation fiscale + export FEC',
      'Support prioritaire < 4 h ouvrées',
    ],
  },
  {
    key: 'PRO_FLOTTE_PLUS',
    label: 'Flotte Pro +',
    tagline: 'Ne perdez plus une journée.',
    price: '10 000 F',
    priceNote: 'par véhicule / mois — inclut tout Flotte Pro',
    cta: 'Demander un essai 30 jours',
    highlights: [
      'Tout Flotte Pro inclus',
      'Livraison 3 h chrono Abidjan + SLA monétisé',
      'Livraison J+1 garantie hors Abidjan',
      'Pickup prioritaire chez le vendeur',
      'Ligne WhatsApp dédiée 6 h – 22 h, 7 j / 7',
      'Concierge dépannage : un appel et c\'est réglé',
    ],
  },
]

const COMPARISON: Array<{ group: string; rows: Array<{ label: string; free: string; pro: string; plus: string }> }> = [
  {
    group: 'Marketplace & confiance',
    rows: [
      { label: 'Catalogue compatibilité véhicule', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Comparateur multi-fournisseurs (prix)', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Comparateur enrichi (scoring qualité)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Garantie pièce intermédiée + retours', free: '✓', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Gestion de flotte',
    rows: [
      { label: 'Utilisateurs & véhicules', free: '2 / illim.', pro: 'Illimités', plus: 'Illimités' },
      { label: 'Centres de maintenance', free: '1', pro: 'Illimités', plus: 'Illimités' },
      { label: 'Fiche véhicule enrichie (coût, YTD, vs flotte)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Rôles fins (gestionnaire / mécano / compta)', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Intelligence & pilotage',
    rows: [
      { label: 'Tableau de bord multi-véhicules', free: '—', pro: '✓', plus: '✓' },
      { label: 'Détection véhicules « gouffres »', free: '—', pro: '✓', plus: '✓' },
      { label: 'Reporting avancé (coût/km, mensuel)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Alertes prédictives multi-canal', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Stock & approvisionnement',
    rows: [
      { label: 'Stock tampon manuel sur SKU critiques', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Réapprovisionnement automatique', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Facturation & fiscalité',
    rows: [
      { label: 'Factures normalisées DGI (QR, mentions)', free: '—', pro: '✓', plus: '✓' },
      { label: 'Facture mensuelle consolidée flotte', free: '—', pro: '✓', plus: '✓' },
      { label: 'Module optimisation fiscale + export FEC', free: '—', pro: '✓', plus: '✓' },
    ],
  },
  {
    group: 'Logistique premium',
    rows: [
      { label: 'Livraison standard (J+2 / J+3)', free: '✓', pro: '✓', plus: '✓' },
      { label: 'Livraison 3 h chrono Abidjan + SLA', free: '—', pro: '—', plus: '✓' },
      { label: 'Livraison J+1 garantie hors Abidjan + SLA', free: '—', pro: '—', plus: '✓' },
      { label: 'Pickup prioritaire + WhatsApp dédiée + concierge', free: '—', pro: '—', plus: '✓' },
    ],
  },
  {
    group: 'Service',
    rows: [
      { label: 'PDF historique véhicule signé Pièces', free: '—', pro: '✓', plus: '✓' },
      { label: 'Support prioritaire < 4 h ouvrées', free: '—', pro: '✓', plus: '✓' },
      { label: 'Revue trimestrielle avec Liaison Pièces', free: '—', pro: '✓', plus: '✓' },
    ],
  },
]

export default function EntreprisesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-16">
      {/* Hero */}
      <header className="border-b border-border pb-10">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          Pièces Entreprises
        </div>
        <h1 className="mt-2 font-display text-4xl leading-tight text-ink lg:text-5xl">
          Reprenez le contrôle de votre budget pièces et entretien.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted">
          Trois niveaux, trois promesses, prix flat par véhicule. Pour les
          flottes de 5 véhicules ou plus en Côte d&apos;Ivoire — transport,
          BTP, mines, location longue durée, services administratifs.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/login"
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

      {/* Tier cards */}
      <section className="mt-12 grid gap-5 md:grid-cols-3">
        {TIERS.map((t) => (
          <article
            key={t.key}
            className={
              t.highlight
                ? 'rounded-xl border-2 border-accent bg-card p-6 shadow-sm'
                : 'rounded-xl border border-border bg-card p-6'
            }
          >
            {t.highlight ? (
              <div className="mb-3 inline-block rounded-full bg-accent/10 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-accent">
                Recommandé
              </div>
            ) : null}
            <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
              {t.label}
            </div>
            <div className="mt-1 font-display text-2xl text-ink">{t.tagline}</div>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-3xl text-ink">{t.price}</span>
              {t.key !== 'FREE' && <span className="text-sm text-muted">FCFA</span>}
            </div>
            <div className="mt-1 text-xs text-muted">{t.priceNote}</div>

            <ul className="mt-6 space-y-2.5 text-sm text-ink">
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
                  ? 'mt-7 block rounded-md bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-accent-hover'
                  : 'mt-7 block rounded-md border border-border-strong bg-card px-4 py-2.5 text-center text-sm font-semibold text-ink hover:bg-surface'
              }
            >
              {t.cta}
            </Link>
          </article>
        ))}
      </section>

      <p className="mt-6 text-center text-xs text-muted">
        Prix flat par véhicule, mensuel d&apos;avance. Paiement annuel = 2 mois
        offerts. Garantie ROI à 3 mois sur Flotte Pro.
      </p>

      {/* Comparison */}
      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">Tableau comparatif détaillé</h2>
        <p className="mt-2 text-sm text-muted">
          Rappel : <strong>Flotte Pro +</strong> inclut systématiquement tout
          Flotte Pro, et ajoute la couche urgence.
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
                <th className="px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
                  Flotte Pro
                </th>
                <th className="px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink">
                  Flotte Pro +
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.flatMap((g) => [
                <tr key={`group-${g.group}`} className="bg-surface/50">
                  <td colSpan={4} className="px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-ink">
                    {g.group}
                  </td>
                </tr>,
                ...g.rows.map((r) => (
                  <tr key={`${g.group}-${r.label}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-ink">{r.label}</td>
                    <td className="px-4 py-2.5 text-center text-muted">{r.free}</td>
                    <td className="px-4 py-2.5 text-center text-ink">{r.pro}</td>
                    <td className="px-4 py-2.5 text-center text-ink">{r.plus}</td>
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
      </section>

      {/* ROI panel */}
      <section className="mt-16 rounded-xl border border-border bg-card p-8">
        <div className="font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
          ROI typique
        </div>
        <h2 className="mt-2 font-display text-3xl text-ink">
          Pour une flotte de 50 véhicules, Flotte Pro est remboursé en 3 semaines.
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {[
            { label: 'Économie cible sur les pièces', value: '20–30 %' },
            { label: 'Investissement Flotte Pro / an (50 véh)', value: '2,5 M F' },
            { label: 'ROI net minimum / an (50 véh)', value: '+ 27,5 M F' },
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
          automatique. Si l&apos;économie ne couvre pas l&apos;abonnement à 3
          mois, nous remboursons la dernière mensualité (garantie ROI).
        </p>
      </section>

      {/* How to start */}
      <section className="mt-16">
        <h2 className="font-display text-3xl text-ink">Comment démarrer</h2>
        <ol className="mt-6 space-y-3 text-sm text-ink">
          {[
            'Créez votre compte entreprise sur pieces.ci (signature en ligne, RCCM facultatif).',
            'Importez le CSV de votre flotte (marque, modèle, année, plaque, km).',
            'Essai Flotte Pro 30 jours activé automatiquement — toutes les fonctionnalités, sans carte bancaire.',
            'Déclarez vos centres de maintenance et rattachez vos véhicules.',
            'Invitez votre équipe avec des rôles distincts (gestionnaire, mécanicien, comptable).',
            'À J+30, vous choisissez : continuer en Flotte Pro, revenir au gratuit, ou passer en Flotte Pro +.',
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
