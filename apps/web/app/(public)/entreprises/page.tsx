import Link from 'next/link'
import { Chip, type ChipVariant } from '@/components/ui/chip'
import {
  FLEET_PLANS,
  FLEET_COMPARISON,
  COST_LEVERS,
  DELIVERY_PROMISE,
  DELEGATED_PROCUREMENT,
} from '@/lib/fleet-plans'

export const metadata = {
  title: 'Pièces Entreprises — Optimisez les coûts de votre flotte',
  description:
    'La plateforme qui réduit les coûts d\'exploitation de votre flotte en Côte d\'Ivoire : achats au meilleur prix, pilotage des coûts, entretien préventif, livraison express, gestion déléguée des achats de pièces. Gratuit, Flotte Pro 4 900 F, Flotte Pro + 9 900 F par véhicule / mois.',
}

const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em]'

// Reçu des économies — mêmes hypothèses que le panneau ROI ci-dessous
// (budget 65 M F / 50 véhicules, économie 20 % = 13 M F, abonnement 5 M F).
const RECU_LINES = [
  { label: 'Comparateur multi-fournisseurs', value: '− 6,5 M F', gain: true },
  { label: 'Véhicules « gouffres » détectés', value: '− 3,2 M F', gain: true },
  { label: 'Pannes évitées (alertes)', value: '− 2,8 M F', gain: true },
  { label: 'Admin & fiscalité allégées', value: '− 0,5 M F', gain: true },
  { label: 'Abonnement Flotte Pro +', value: '+ 5,0 M F', gain: false },
]

const STATS = [
  { num: '20–30 %', cap: 'd\'économie cible sur le budget pièces' },
  { num: 'Prioritaire', cap: 'livraison express dédiée à votre flotte' },
  { num: '× 2,6', cap: 'ROI minimum avec Flotte Pro +' },
  { num: 'Dès J+1', cap: 'gains directs et indirects mesurables' },
]

const DOMAINS = ['Transport', 'VTC', 'BTP', 'Mines', 'Location', 'Services']

// Aperçu marketing du tableau de bord « détection des gouffres ».
const DASH_ROWS: Array<{ veh: string; cost: string; vs: string; chip: ChipVariant; status: string }> = [
  { veh: 'Toyota Hiace · AB-472-CD', cost: '142 F', vs: '+38 %', chip: 'status-err', status: 'Surconsommateur' },
  { veh: 'Kia K2700 · CI-816-EF', cost: '109 F', vs: '+11 %', chip: 'status-warn', status: 'À surveiller' },
  { veh: 'Hyundai H-1 · GH-233-IJ', cost: '96 F', vs: '−4 %', chip: 'status-ok', status: 'Normal' },
  { veh: 'Toyota Hilux · KL-590-MN', cost: '88 F', vs: '−12 %', chip: 'status-ok', status: 'Normal' },
]

const STEPS = [
  { title: 'Créez votre compte entreprise', body: 'Signature en ligne sur pieces.ci — RCCM facultatif.' },
  { title: 'Importez votre flotte', body: 'Un CSV suffit : marque, modèle, année, plaque, kilométrage.' },
  { title: 'Choisissez votre palier', body: 'Gratuit, Flotte Pro ou Flotte Pro + selon vos besoins. Vous voyez la valeur dès le premier mois, sans période d’essai imposée.' },
  { title: 'Déclarez vos centres', body: 'Rattachez vos véhicules à vos centres de maintenance.' },
  { title: 'Invitez votre équipe', body: 'Rôles distincts : gestionnaire, mécanicien, comptable.' },
  { title: 'Mesurez vos gains', body: 'Économies sur pièces, immobilisations évitées et temps administratif récupéré, chiffrés dans votre tableau de bord.' },
]

function CompareCell({ value, plus = false }: { value: string; plus?: boolean }) {
  return (
    <td
      className={
        'px-4 py-2.5 text-center ' +
        (plus ? 'bg-accent/[0.04] font-medium text-ink' : 'text-muted')
      }
    >
      {value === '✓' ? <span className="font-semibold text-success-fg">✓</span> : value}
    </td>
  )
}

export default function EntreprisesPage() {
  return (
    <>
      {/* ===== Hero navy + Reçu des économies ===== */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <div className={`${EYEBROW} text-accent`}>
              Flottes de 5 véhicules et plus — Côte d&apos;Ivoire
            </div>
            <h1 className="mt-4 text-4xl leading-[1.1] text-white lg:text-[52px]">
              Votre budget pièces cache 20 à 30 % d&apos;économies.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              Achat au meilleur prix sur{' '}
              <a href="https://pieces.ci" className="font-semibold text-white underline underline-offset-2">
                pieces.ci
              </a>
              , pilotage des coûts véhicule par véhicule, entretien préventif et
              livraison express prioritaire à Abidjan — une seule plateforme.{' '}
              <strong className="font-semibold text-white">
                Moins de surcoûts, moins de pannes, moins d&apos;immobilisation.
              </strong>
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/enterprise/dashboard"
                className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Créer mon compte entreprise
              </Link>
              <Link
                href="/entreprises/calculateur-roi"
                className="rounded-md border border-white/35 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/[0.08]"
              >
                Calculer votre ROI
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-2">
              {DOMAINS.map((d) => (
                <span
                  key={d}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white/60"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>

          {/* Composant signature « Reçu » — la transparence appliquée au ROI flotte */}
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-card text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:justify-self-end">
            <div className="bg-ink px-6 py-4 text-white">
              <div className={`${EYEBROW} text-white/60`}>Flotte type — 50 véhicules / an</div>
              <div className="mt-1 font-display text-[22px]">Le reçu de vos économies</div>
            </div>
            <div className="px-6 py-5">
              <p className="mb-1 text-xs text-muted">
                Budget pièces actuel : ~65,0 M F (1,3 M F / véhicule)
              </p>
              {RECU_LINES.map((l) => (
                <div key={l.label} className="flex items-baseline gap-2.5 py-1.5 text-sm">
                  <span className="min-w-0">{l.label}</span>
                  <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-border" />
                  <span
                    className={
                      'font-mono tabular whitespace-nowrap ' + (l.gain ? 'text-success-fg' : '')
                    }
                  >
                    {l.value}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-baseline gap-2 border-t-2 border-ink pt-3.5">
                <span className="text-[15px] font-bold">Gain net la première année</span>
                <span className="tabular ml-auto font-mono text-[22px] text-success-fg">
                  + 8,0 M F
                </span>
              </div>
              <div className="mt-4 flex items-start gap-2.5 rounded-md bg-success-bg px-3.5 py-2.5 text-xs font-semibold leading-relaxed text-success-fg">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-shrink-0">
                  <path d="M8 1.5l5.5 2v4c0 3.2-2.3 5.6-5.5 7-3.2-1.4-5.5-3.8-5.5-7v-4l5.5-2z" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M5.5 8l1.8 1.8L10.8 6.4" stroke="currentColor" strokeWidth="1.4" />
                </svg>
                L&apos;abonnement se rentabilise par les économies réalisées sur les pièces et l&apos;administration.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Bande de stats ===== */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-y-5 px-4 py-6 md:grid-cols-4 md:gap-y-0 md:py-0 lg:px-8">
          {STATS.map((s) => (
            <div key={s.num} className="md:border-l md:border-border md:px-6 md:py-7 md:first:border-l-0 md:first:pl-0">
              <div className="tabular font-mono text-[26px] text-ink">{s.num}</div>
              <div className="mt-0.5 text-[13px] text-muted">{s.cap}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== Leviers d'économies ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-20 lg:px-8" id="leviers">
        <div className="max-w-xl">
          <div className={`${EYEBROW} text-accent`}>Quatre leviers d&apos;économies</div>
          <h2 className="mt-3 text-3xl lg:text-4xl">
            Chaque fonctionnalité fait baisser une ligne de votre budget.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Chaque module de Pièces s&apos;attaque à un poste de coût précis de votre
            exploitation.
          </p>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {COST_LEVERS.map((l) => (
            <article
              key={l.title}
              className="rounded-lg border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className={`${EYEBROW} text-muted-2`}>
                Ligne budget — <span className="text-accent">{l.line}</span>
              </div>
              <h3 className="mt-2.5 text-xl">{l.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{l.body}</p>
            </article>
          ))}
        </div>

        {/* Preuve produit : détection des gouffres */}
        <div className="mt-14 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
          <div>
            <h3 className="text-2xl">Vos « surconsommateurs », noir sur blanc.</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              Le tableau de bord Flotte Pro compare chaque véhicule à la moyenne de
              votre flotte. Flotte Pro vous signale immédiatement un coût/km qui
              dérape et cela vous permet de chercher à comprendre avant que la
              facture n&apos;enfle. Nous pouvons aussi vous aider dans ce domaine.
            </p>
          </div>
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
            <div className="flex items-baseline gap-3 bg-ink px-5 py-3.5 text-white">
              <span className={`${EYEBROW} text-white/60`}>Détection des surconsommateurs</span>
              <span className="tabular ml-auto font-mono text-[11px] text-white/60">
                T2 2026 · 50 véh.
              </span>
            </div>
            {/*
              Sur mobile, la colonne Statut disparaît et la chip passe sous le
              nom du véhicule : le tableau tient dans l'écran sans défilement
              horizontal.
            */}
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface">
                  <th className="px-3 py-2.5 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted sm:px-4">
                    Véhicule
                  </th>
                  <th className="px-3 py-2.5 text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted sm:px-4">
                    Coût / km
                  </th>
                  <th className="px-3 py-2.5 text-right font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted sm:px-4">
                    vs flotte
                  </th>
                  <th className="hidden px-4 py-2.5 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted sm:table-cell">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {DASH_ROWS.map((r) => (
                  <tr key={r.veh} className="border-t border-border">
                    <td className="px-3 py-2.5 text-ink sm:whitespace-nowrap sm:px-4">
                      {r.veh}
                      <div className="mt-1.5 sm:hidden">
                        <Chip variant={r.chip}>{r.status}</Chip>
                      </div>
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2.5 text-right align-top font-mono sm:px-4 sm:align-middle">
                      {r.cost}
                    </td>
                    <td className="tabular whitespace-nowrap px-3 py-2.5 text-right align-top font-mono sm:px-4 sm:align-middle">
                      {r.vs}
                    </td>
                    <td className="hidden px-4 py-2.5 sm:table-cell">
                      <Chip variant={r.chip}>{r.status}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== Gestion déléguée des achats (exclusif Flotte Pro +) ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-20 lg:px-8" id="gestion-deleguee">
        <div className="overflow-hidden rounded-lg bg-ink text-white">
          <div className="grid gap-10 px-6 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-12 lg:py-14">
            <div>
              <div className={`${EYEBROW} text-accent`}>{DELEGATED_PROCUREMENT.eyebrow}</div>
              <h2 className="mt-3 text-3xl text-white lg:text-4xl">
                {DELEGATED_PROCUREMENT.title}
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/70">
                {DELEGATED_PROCUREMENT.intro}
              </p>
              <p className="mt-5 text-xs leading-relaxed text-white/50">
                {DELEGATED_PROCUREMENT.note}
              </p>
            </div>
            <div className="grid gap-7 sm:grid-cols-2">
              {DELEGATED_PROCUREMENT.steps.map((s, i) => (
                <div key={s.title} className="relative border-t-2 border-white/20 pt-4">
                  <span className="tabular absolute -top-2.5 left-0 bg-ink pr-2.5 font-mono text-xs text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="text-[15px] font-semibold text-white">{s.title}</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Tarifs ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-20 lg:px-8" id="tarifs">
        <div className="max-w-xl">
          <div className={`${EYEBROW} text-accent`}>Tarifs — par véhicule / mois</div>
          <h2 className="mt-3 text-3xl lg:text-4xl">Trois formules, zéro engagement caché.</h2>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Prix flat par véhicule, mensuel d&apos;avance. Paiement annuel = 2 mois
            offerts. Vous voyez la valeur dès le premier mois : gains directs
            (économies sur pièces et admin) et gains indirects (moins d&apos;immobilisation, moins de pannes).
          </p>
        </div>

        {/*
          Subgrid layout: the section owns 7 row tracks (label, tagline, price,
          priceNote, advantages[1fr], delivery, CTA) and each card spans all of
          them via `grid-rows-subgrid`, so rows stay aligned across cards at any
          width — delivery times/costs line up across the three plans.
          Collapses to a plain stacked flex column below `md`.
        */}
        <div className="mt-14 grid gap-y-10 md:grid-cols-3 md:grid-rows-[auto_auto_auto_auto_1fr_auto_auto] md:gap-x-5 md:gap-y-0">
          {FLEET_PLANS.map((t) => (
            <article
              key={t.key}
              className={
                (t.highlight
                  ? 'bg-ink text-white shadow-[0_20px_50px_rgba(0,17,58,0.28)]'
                  : 'border border-border bg-card') +
                ' relative flex flex-col rounded-lg p-6 md:row-span-7 md:grid md:grid-rows-subgrid'
              }
            >
              {t.highlight && t.badge ? (
                <span className="absolute -top-3 left-6 whitespace-nowrap rounded-full bg-accent px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-white">
                  {t.badge}
                </span>
              ) : null}

              <div className={`${EYEBROW} ${t.highlight ? 'text-accent' : 'text-muted'}`}>
                {t.label}
              </div>
              <div className="mt-1 font-display text-2xl leading-snug">{t.tagline}</div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="tabular font-mono text-[32px]">{t.price}</span>
                {t.key !== 'FREE' && (
                  <span className={'text-sm ' + (t.highlight ? 'text-white/60' : 'text-muted')}>
                    FCFA
                  </span>
                )}
              </div>
              <div className={'mt-1 text-xs ' + (t.highlight ? 'text-white/60' : 'text-muted')}>
                {t.priceNote}
              </div>

              <ul className="mb-6 mt-6 space-y-2.5 text-sm">
                {t.highlights.map((h) => (
                  <li key={h} className="flex gap-2.5">
                    <span className={'font-mono ' + (t.highlight ? 'text-accent' : 'text-muted-2')}>
                      →
                    </span>
                    <span className="leading-snug">{h}</span>
                  </li>
                ))}
              </ul>

              <div
                className={
                  'mb-6 border-t pt-4 ' + (t.highlight ? 'border-white/15' : 'border-border')
                }
              >
                <div className={`${EYEBROW} ${t.highlight ? 'text-white/60' : 'text-muted-2'}`}>
                  Livraison
                </div>
                <dl className="mt-2.5 space-y-1.5 text-[13px]">
                  {t.delivery.map((d) => (
                    <div key={d.label} className="flex items-baseline justify-between gap-3">
                      <dt className={t.highlight ? 'text-white/80' : 'text-muted'}>{d.label}</dt>
                      <dd
                        className={
                          'tabular whitespace-nowrap text-right font-mono text-xs ' +
                          (d.value === 'Offerte'
                            ? 'font-medium text-accent'
                            : t.highlight
                              ? 'text-white'
                              : 'text-ink')
                        }
                      >
                        {d.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

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
        </div>
        <p className="mt-6 text-center text-xs text-muted">
          Vous pouvez changer de formule ou arrêter à tout moment. Aucune carte bancaire demandée.
        </p>

        {/* Tableau comparatif */}
        <div className="mt-14 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface">
                <th className="px-4 py-3.5 text-left font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Fonctionnalité
                </th>
                <th className="px-4 py-3.5 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Gratuit
                </th>
                <th className="px-4 py-3.5 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-muted">
                  Flotte Pro
                </th>
                <th className="px-4 py-3.5 text-center font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-accent">
                  Flotte Pro +
                </th>
              </tr>
            </thead>
            <tbody>
              {FLEET_COMPARISON.flatMap((g) => [
                <tr key={`group-${g.group}`}>
                  <td
                    colSpan={4}
                    className="bg-ink px-4 py-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-white"
                  >
                    {g.group}
                  </td>
                </tr>,
                ...g.rows.map((r) => (
                  <tr key={`${g.group}-${r.label}`} className="border-t border-border">
                    <td className="px-4 py-2.5 text-ink">{r.label}</td>
                    <CompareCell value={r.free} />
                    <CompareCell value={r.pro} />
                    <CompareCell value={r.plus} plus />
                  </tr>
                )),
              ])}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">{DELIVERY_PROMISE}</p>
      </section>

      {/* ===== Bande ROI navy ===== */}
      <section className="mt-20 bg-ink py-16 text-white" id="roi">
        <div className="mx-auto w-full max-w-6xl px-4 lg:px-8">
          <div className={`${EYEBROW} text-accent`}>ROI typique — flotte de 50 véhicules</div>
          <h2 className="mt-3 max-w-2xl text-[26px] text-white lg:text-4xl">
            L&apos;abonnement se rembourse plusieurs fois en économies sur le budget
            pièces.
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { num: '20–30 %', cap: 'économie cible sur les pièces' },
              { num: '5 M F', cap: 'investissement Flotte Pro + / an (50 véh)' },
              { num: '+ 8 M F', cap: 'ROI net minimum / an (50 véh)' },
            ].map((s) => (
              <div key={s.cap} className="border-l-2 border-accent pl-4">
                <div className="tabular font-mono text-[32px]">{s.num}</div>
                <div className="mt-1 text-[13.5px] text-white/60">{s.cap}</div>
              </div>
            ))}
          </div>
          <p className="mt-9 max-w-3xl text-sm leading-relaxed text-white/60">
            Hypothèse : budget pièces annuel ~65 M F sur 50 véhicules (1,3 M F /
            véhicule), économie projetée 20 % minimum via comparateur, scoring
            qualité fournisseur, détection des véhicules « gouffres » et stock
            tampon automatique — soit 13 M F d&apos;économie pour 5 M F
            d&apos;abonnement (ROI ×2,6, hors gains indirects d&apos;immobilisation évitée et de
            productivité retrouvée).{' '}
            <strong className="font-semibold text-white">
              Vous mesurez les gains directs et indirects sur votre propre flotte dès
              le premier mois.
            </strong>
          </p>
        </div>
      </section>

      {/* ===== Comment démarrer ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8" id="demarrer">
        <div className="max-w-xl">
          <div className={`${EYEBROW} text-accent`}>Comment démarrer</div>
          <h2 className="mt-3 text-3xl lg:text-4xl">Opérationnel en une journée.</h2>
        </div>
        <div className="mt-12 grid gap-y-10 md:grid-cols-3 md:gap-x-7">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative border-t-2 border-border pt-5">
              <span className="tabular absolute -top-2.5 left-0 bg-surface pr-2.5 font-mono text-xs text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="text-[15.5px] font-semibold text-ink">{s.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="border-t border-border px-4 py-20 text-center lg:px-8">
        <h2 className="mx-auto max-w-xl text-3xl lg:text-[40px]">
          Mesurez vos économies sur votre propre flotte.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted">
          Créez votre compte entreprise et accédez aux fonctionnalités Flotte Pro +
          dès le premier mois. Vous mesurez les gains directs et indirects avant de
          choisir la formule qui vous convient.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white hover:bg-accent-hover"
          >
            Créer mon compte entreprise
          </Link>
          <Link
            href="/entreprises/guide"
            className="rounded-md border border-border-strong bg-card px-6 py-3 text-[15px] font-semibold text-ink hover:bg-surface"
          >
            Lire le guide complet
          </Link>
        </div>
      </section>
    </>
  )
}
