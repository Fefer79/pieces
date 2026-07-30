import Link from 'next/link'
import { FLEET_PLANS } from '@/lib/fleet-plans'

// Section « flotte » de l'accueil — la porte d'entrée vers flotte.pieces.ci.
// Le prix affiché vient de FLEET_PLANS (source unique, cf. CLAUDE.md) : ne pas
// le recopier en dur ici.

const PRO = FLEET_PLANS.find((p) => p.key === 'PRO_FLOTTE')

const BULLETS = [
  'Tableau de bord multi-véhicules : coût au kilomètre, dépense par catégorie de pièce.',
  'Détection des véhicules « gouffres » et alertes d’entretien prédictives sur WhatsApp.',
  'Stock tampon qui se réapprovisionne seul sur vos pièces critiques.',
  'Facture consolidée en fin de mois, et livraison express au garage.',
]

export function FleetSection() {
  return (
    <section className="bg-ink text-white">
      <div className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-14 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-16">
        <div>
          <div className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent">
            Entreprises &amp; flottes · flotte.pieces.ci
          </div>
          <h2 className="mt-3 max-w-[22ch] text-3xl text-white lg:text-[34px]">
            Plusieurs véhicules ? Pilotez la dépense, pas seulement l&apos;achat.
          </h2>
          <p className="mt-3.5 max-w-[62ch] text-[15.5px] leading-relaxed text-white/65">
            Un véhicule coûte environ 1,3 million de francs de pièces par an. Pièces Flotte vous
            montre où part cet argent, véhicule par véhicule, et vous rend la main dessus.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/enterprise/register"
              className="rounded-md bg-accent px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Enregistrer ma flotte
            </Link>
            <Link
              href="/entreprises/calculateur-roi"
              className="rounded-md border border-white/35 px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-white/[0.08]"
            >
              Calculateur ROI
            </Link>
          </div>
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-white/45">
            À partir de {PRO?.price ?? '4 900 F'} / véhicule / mois · 30 jours d&apos;essai
          </p>
        </div>

        <ul className="flex flex-col gap-4 self-center">
          {BULLETS.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-[15px] leading-relaxed text-white/85">
              <span aria-hidden="true" className="mt-0.5 flex-none text-accent">
                →
              </span>
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
