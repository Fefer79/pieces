import Link from 'next/link'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  LOGISTICS_MODES,
  PART_LOGISTICS_FAMILIES,
} from 'shared/constants'
import { Chip } from '@/components/ui/chip'
import { ArbitrageTable, formatDelay } from '@/components/logistique/arbitrage-table'
import {
  LOGISTIQUE_HERO,
  LOGISTIQUE_RECEIPT,
  LOGISTIQUE_STATS,
  TOTAL_COST_FORMULA,
  TOTAL_COST_INTRO,
  DEMO_MATRIX,
  DEMO_MATRIX_PART_QUERY,
  SWITCH_RULE,
  MODE_COPY,
  PUBLIC_MODES,
  LOGISTIQUE_LEVERS,
  STORAGE_FLEET_BULLETS,
  WEIGHT_VOLUME_PROMISE,
  LOGISTIQUE_STEPS,
  CONFIDENCE_LEVELS,
  canonicalFor,
} from '@/lib/logistique-content'

export const metadata = {
  title: 'Pièces Logistique — Import de pièces détachées auto en Côte d\'Ivoire',
  description:
    'Nous chiffrons l\'attente. Cotation immédiate pour importer une pièce détachée automobile à Abidjan : aérien 3 à 7 jours, maritime groupé, achat local. Chaque option comparée coût total, immobilisation du véhicule comprise.',
  alternates: { canonical: canonicalFor('/') },
}

const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em]'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function LogistiquePage() {
  // La table de démonstration sort du MÊME moteur que le produit : impossible que
  // le discours commercial dérive de ce que voit réellement un client.
  const demo = computeArbitrageMatrix({
    ...DEMO_MATRIX.input,
    family: matchLogisticsFamily(DEMO_MATRIX_PART_QUERY),
  })
  const best = demo.options.find((o) => o.recommended) ?? demo.options[0]!
  const worst = demo.options[demo.options.length - 1]!
  const ratio = Math.round(worst.totalCost / Math.max(best.totalCost, 1))

  return (
    <>
      {/* ===== Hero navy + Reçu d'arbitrage ===== */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-8 lg:py-24">
          <div>
            <div className={`${EYEBROW} text-accent`}>{LOGISTIQUE_HERO.eyebrow}</div>
            <h1 className="mt-4 text-4xl leading-[1.1] text-white lg:text-[52px]">
              {LOGISTIQUE_HERO.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">
              {LOGISTIQUE_HERO.lead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={LOGISTIQUE_HERO.ctaPrimary.href}
                className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                {LOGISTIQUE_HERO.ctaPrimary.label}
              </Link>
              <Link
                href={LOGISTIQUE_HERO.ctaSecondary.href}
                className="rounded-md border border-white/35 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/[0.08]"
              >
                {LOGISTIQUE_HERO.ctaSecondary.label}
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-2">
              {LOGISTIQUE_HERO.audiences.map((a) => (
                <span
                  key={a}
                  className="rounded-full border border-white/15 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-white/60"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Composant signature « Reçu » — la transparence appliquée à l'arbitrage */}
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-card text-ink shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:justify-self-end">
            <div className="bg-ink px-6 py-4 text-white">
              <div className={`${EYEBROW} text-white/60`}>{LOGISTIQUE_RECEIPT.header}</div>
              <div className="mt-1 font-display text-[22px]">{LOGISTIQUE_RECEIPT.subheader}</div>
            </div>
            <div className="px-6 py-5">
              {LOGISTIQUE_RECEIPT.lines.map((l) => (
                <div key={l.label} className="flex items-baseline gap-2.5 py-1.5 text-sm">
                  <span className={'min-w-0 ' + (l.dominant ? 'font-semibold text-ink' : '')}>
                    {l.label}
                  </span>
                  <span className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-border" />
                  <span
                    className={
                      'tabular whitespace-nowrap font-mono ' +
                      (l.dominant ? 'font-semibold text-accent' : '')
                    }
                  >
                    {l.value}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-baseline gap-2 border-t-2 border-ink pt-3.5">
                <span className="text-[15px] font-bold">{LOGISTIQUE_RECEIPT.total.label}</span>
                <span className="tabular ml-auto font-mono text-[22px] text-ink">
                  {LOGISTIQUE_RECEIPT.total.value}
                </span>
              </div>
              <p className="mt-4 rounded-md bg-surface px-3.5 py-2.5 text-xs leading-relaxed text-muted">
                {LOGISTIQUE_RECEIPT.note}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Bande de stats ===== */}
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-4 py-10 lg:grid-cols-4 lg:px-8">
          {LOGISTIQUE_STATS.map((s) => (
            <div key={s.cap}>
              <div className="tabular font-mono text-2xl text-ink lg:text-[28px]">{s.num}</div>
              <div className="mt-1.5 text-[13px] leading-snug text-muted">{s.cap}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== La thèse ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-10 lg:px-8 lg:py-14">
        <div className={`${EYEBROW} text-muted`}>Le troisième terme</div>
        <h2 className="mt-3 max-w-3xl text-3xl text-ink lg:text-[38px]">
          Le prix de la pièce n&apos;est presque jamais ce qui coûte le plus cher.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{TOTAL_COST_INTRO}</p>
        <pre className="mt-7 overflow-x-auto rounded-md border-l-[3px] border-accent bg-card p-5 font-mono text-[12.5px] leading-relaxed text-ink">
          {TOTAL_COST_FORMULA.join('\n')}
        </pre>
      </section>

      {/* ===== Matrice d'arbitrage ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className={`${EYEBROW} text-muted`}>Exemple réel</div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[38px]">{DEMO_MATRIX.vehicle}</h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
            {DEMO_MATRIX.caption}
          </p>

          <div className="mt-7">
            <ArbitrageTable result={demo} />
          </div>

          <p className="mt-4 text-xs text-muted-2">
            {demo.familyLabel} · {demo.weightKg} kg · {demo.volumeDm3} dm³ — estimation par famille,
            ± 20 %. Le poids réel est confirmé auprès du fournisseur avant le devis.
          </p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-surface p-5">
              <div className={`${EYEBROW} text-muted`}>Ce que la table démontre</div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">
                {DEMO_MATRIX.note} Ici, l&apos;écart entre la meilleure option et la pire est de{' '}
                <strong className="tabular font-mono">× {ratio}</strong>.
              </p>
            </div>
            <div className="rounded-md border border-border bg-surface p-5">
              <div className={`${EYEBROW} text-muted`}>La règle à retenir</div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink">{SWITCH_RULE}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Modes d'acheminement ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
        <div className={`${EYEBROW} text-muted`}>Acheminement</div>
        <h2 className="mt-3 text-3xl text-ink lg:text-[38px]">Cinq façons de faire venir la pièce.</h2>
        <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">
          Chaque mode est chiffré sur la même grille. Nous ne vendons pas du transport, nous vendons
          la décision.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PUBLIC_MODES.map((mode) => {
            const copy = MODE_COPY[mode]
            return (
              <article key={mode} className="rounded-md border border-border bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-[19px] text-ink">{copy.publicLabel}</h3>
                  <span className="tabular whitespace-nowrap font-mono text-[13px] text-accent">
                    {copy.delay}
                  </span>
                </div>
                <p className="mt-2.5 text-[14px] leading-relaxed text-muted">{copy.useCase}</p>
                <p className="mt-3 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-[0.06em] text-muted-2">
                  {copy.basis}
                </p>
              </article>
            )
          })}
          <article className="rounded-md border border-dashed border-border-strong bg-surface p-5">
            <h3 className="text-[19px] text-ink">{MODE_COPY.PRE_POSITIONED.publicLabel}</h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              {MODE_COPY.PRE_POSITIONED.useCase}
            </p>
            <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted-2">
              Réservé aux flottes sous plan d&apos;anticipation —{' '}
              <Link href="/entreprises" className="underline underline-offset-2 hover:text-ink">
                voir l&apos;offre flotte
              </Link>
              .
            </p>
          </article>
        </div>
      </section>

      {/* ===== Ce que nous prenons en charge ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className={`${EYEBROW} text-muted`}>Périmètre</div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[38px]">Un seul interlocuteur, bout en bout.</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {LOGISTIQUE_LEVERS.map((l) => (
              <div key={l.title} className="border-t-2 border-ink pt-4">
                <div className={`${EYEBROW} text-accent`}>{l.line}</div>
                <h3 className="mt-2 text-[19px] text-ink">{l.title}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{l.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Stockage & dispatch pour flottes ===== */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
          <div>
            <div className={`${EYEBROW} text-accent`}>Stockage & dispatch</div>
            <h2 className="mt-3 text-3xl text-white lg:text-[38px]">
              Vos pièces importées, gardées à Abidjan, prêtes à être dispatchées.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              Pour les gestionnaires de flotte, importer en gros par maritime ne suffit pas — il
              faut ensuite stocker, suivre par référence et par véhicule, et dispatcher au fil des
              besoins. C&apos;est ce que nous faisons.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">
              Le coût d&apos;immobilisation n&apos;a plus de raison d&apos;être : la pièce attendue
              est déjà à Abidjan, le délai se compte en heures, pas en semaines. La mise à
              disposition est facturée à la pièce servie — pas au mètre carré.
            </p>
            <Link
              href="/entreprises"
              className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Voir l&apos;offre flotte →
            </Link>
          </div>
          <ul className="space-y-3.5 self-center">
            {STORAGE_FLEET_BULLETS.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
                <span aria-hidden="true" className="mt-0.5 text-accent">
                  →
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Poids / volume ===== */}
      <section className="bg-ink text-white">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div>
            <div className={`${EYEBROW} text-accent`}>Référentiel poids / volume</div>
            <h2 className="mt-3 text-3xl text-white lg:text-[38px]">
              {WEIGHT_VOLUME_PROMISE.title}
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/65">
              {WEIGHT_VOLUME_PROMISE.body}
            </p>
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-white/45">
              {PART_LOGISTICS_FAMILIES.length} familles codées
            </p>
          </div>
          <ul className="space-y-3.5 self-center">
            {WEIGHT_VOLUME_PROMISE.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] leading-relaxed text-white/80">
                <span aria-hidden="true" className="mt-0.5 text-accent">
                  →
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Parcours ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
        <div className={`${EYEBROW} text-muted`}>Comment ça marche</div>
        <h2 className="mt-3 text-3xl text-ink lg:text-[38px]">De la photo au devis, en quatre étapes.</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {LOGISTIQUE_STEPS.map((s, i) => (
            <div key={s.title} className="relative border-t-2 border-border pt-5">
              <span className="tabular absolute -top-3 left-0 bg-surface pr-2 font-mono text-[13px] text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h3 className="text-[18px] text-ink">{s.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/logistique/comment-ca-marche"
            className="text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
          >
            Le détail du parcours et du suivi de transport
          </Link>
        </div>
      </section>

      {/* ===== Niveaux de fiabilité ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className={`${EYEBROW} text-muted`}>Fiabilité de l&apos;estimation</div>
          <h2 className="mt-3 text-3xl text-ink lg:text-[38px]">
            Nous vous disons toujours d&apos;où vient le chiffre.
          </h2>
          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {CONFIDENCE_LEVELS.map((c) => (
              <div key={c.key} className="rounded-md border border-border bg-surface p-5">
                <Chip variant={c.chip}>{c.label}</Chip>
                <p className="mt-3 text-[14px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA final ===== */}
      <section className="bg-ink text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center lg:px-8 lg:py-20">
          <h2 className="mx-auto max-w-2xl text-3xl text-white lg:text-[40px]">
            Dites-nous quelle pièce vous manque.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/65">
            Estimation immédiate, sans compte, en deux minutes. Le devis confirmé suit, généralement
            sous deux heures ouvrées — le maritime met {formatDelay(LOGISTICS_MODES.SEA_LCL.transitDays)},
            votre décision n&apos;a pas à attendre autant.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/logistique/devis"
              className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Demander une cotation
            </Link>
            <Link
              href="/logistique/calculateur"
              className="rounded-md border border-white/35 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/[0.08]"
            >
              Calculer mon coût d&apos;immobilisation
            </Link>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-white/40">
            Immobilisation de référence · {fmt(demo.downtimeCostPerDay)} F par jour
          </p>
        </div>
      </section>
    </>
  )
}
