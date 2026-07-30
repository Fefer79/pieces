import type { Metadata } from 'next'
import Link from 'next/link'
import { computeArbitrageMatrix, matchLogisticsFamily } from 'shared/constants'
import { ArbitrageTable } from '@/components/logistique/arbitrage-table'
import {
  VTC_HERO,
  VTC_STATS,
  LOGISTIQUE_RECEIPT,
  TOTAL_COST_FORMULA,
  TOTAL_COST_INTRO,
  DEMO_MATRIX,
  DEMO_MATRIX_PART_QUERY,
  SWITCH_RULE,
  MODE_COPY,
  STORAGE_FLEET_BULLETS,
  AUDIT_BIGDATA,
  canonicalFor,
} from '@/lib/logistique-content'

// Page du segment prioritaire. Elle porte l'argument du coût d'immobilisation —
// le « troisième terme » — qui ne vaut que pour un véhicule produisant une
// recette. La vitrine ouverte (/logistique) ne le porte plus qu'en teaser.
//
// Volontairement absentes ici pour ne pas dupliquer la home : le référentiel
// poids / volume, les quatre étapes du parcours et les niveaux de fiabilité.

export const metadata: Metadata = {
  title: 'Flottes VTC | Import de pièces détachées et coût d\'immobilisation',
  description:
    'Pour les flottes VTC d\'Abidjan : chaque option d\'acheminement chiffrée en coût total réel, immobilisation du véhicule comprise. Stock pré-positionné, entreposage, dispatch et audit des dépenses en pièces détachées.',
  alternates: { canonical: canonicalFor('/flottes-vtc') },
}

const EYEBROW = 'font-mono text-[11px] font-medium uppercase tracking-[0.1em]'

const fmt = (n: number) => n.toLocaleString('fr-FR')

export default function LogistiqueFlottesVtcPage() {
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
            <div className={`${EYEBROW} text-accent`}>{VTC_HERO.eyebrow}</div>
            <h1 className="mt-4 text-4xl leading-[1.1] text-white lg:text-[52px]">
              {VTC_HERO.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">{VTC_HERO.lead}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={VTC_HERO.ctaPrimary.href}
                className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                {VTC_HERO.ctaPrimary.label}
              </Link>
              <Link
                href={VTC_HERO.ctaSecondary.href}
                className="rounded-md border border-white/35 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/[0.08]"
              >
                {VTC_HERO.ctaSecondary.label}
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-2">
              {VTC_HERO.audiences.map((a) => (
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
          {VTC_STATS.map((s) => (
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
            {demo.familyLabel} · {demo.weightKg} kg · {demo.volumeDm3} dm³ · estimation par famille,
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

          <p className="mt-6 text-[13.5px] text-muted">
            Le détail de chaque mode d&apos;acheminement, du référentiel poids / volume et du
            parcours de cotation est sur{' '}
            <Link href="/logistique" className="underline underline-offset-2 hover:text-ink">
              la page d&apos;accueil du service
            </Link>
            .
          </p>
        </div>
      </section>

      {/* ===== Stock pré-positionné ===== */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
        <div className={`${EYEBROW} text-muted`}>Le sixième mode</div>
        <h2 className="mt-3 max-w-3xl text-3xl text-ink lg:text-[38px]">
          {MODE_COPY.PRE_POSITIONED.publicLabel} : la pièce est déjà là.
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
          {MODE_COPY.PRE_POSITIONED.useCase} C&apos;est le seul mode qui ramène le délai sous la
          barre des {MODE_COPY.PRE_POSITIONED.delay} — donc le seul qui annule presque entièrement le
          coût d&apos;immobilisation. Il n&apos;est proposé qu&apos;aux flottes sous plan
          d&apos;anticipation, parce qu&apos;il suppose de savoir à l&apos;avance quelles pièces
          votre parc va consommer.
        </p>
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
              Pour les gestionnaires de flotte, importer en gros par maritime ne suffit pas : il
              faut ensuite stocker, suivre par référence et par véhicule, puis dispatcher au fil des
              besoins.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-white/65">
              Quand la pièce attendue est déjà à Abidjan, le délai se compte en heures et non en
              semaines : le coût d&apos;immobilisation tombe. La mise à disposition est facturée à
              la pièce servie, pas au mètre carré.
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

      {/* ===== Audit big data ===== */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 lg:px-8 lg:py-16">
          <div className={`${EYEBROW} text-muted`}>{AUDIT_BIGDATA.eyebrow}</div>
          <h2 className="mt-3 max-w-3xl text-3xl text-ink lg:text-[38px]">{AUDIT_BIGDATA.title}</h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">
            {AUDIT_BIGDATA.lead}
          </p>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {AUDIT_BIGDATA.sources.map((s) => (
              <div key={s.title} className="rounded-md border border-border bg-surface p-5">
                <div className={`${EYEBROW} text-accent`}>{s.title}</div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className={`${EYEBROW} text-muted`}>Ce que vous recevez</div>
              <ul className="mt-3 space-y-2.5">
                {AUDIT_BIGDATA.outputs.map((line) => (
                  <li
                    key={line}
                    className="flex gap-3 border-t border-border pt-2.5 text-[14.5px] leading-relaxed text-ink first:border-t-0 first:pt-0"
                  >
                    <span aria-hidden="true" className="mt-0.5 text-accent">
                      →
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <aside className="rounded-md border border-ink bg-ink p-5 text-white">
              <div className={`${EYEBROW} text-accent`}>Tarification</div>
              <p className="mt-2 text-[15px] font-semibold leading-snug">
                {AUDIT_BIGDATA.pricing.included}
              </p>
              <p className="mt-3 text-[15px] font-semibold leading-snug text-white/95">
                {AUDIT_BIGDATA.pricing.onDemand}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/65">
                {AUDIT_BIGDATA.pricing.onDemandNote}
              </p>
              <Link
                href={AUDIT_BIGDATA.ctaFleetHref}
                className="mt-5 inline-block rounded-md bg-accent px-5 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                {AUDIT_BIGDATA.ctaFleetLabel} →
              </Link>
            </aside>
          </div>

          <p className="mt-7 max-w-3xl text-[13px] leading-relaxed text-muted-2">
            {AUDIT_BIGDATA.principle}
          </p>
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
            sous deux heures ouvrées.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/logistique/devis?profil=FLEET_VTC"
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
