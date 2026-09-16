/**
 * Backfill de la catégorie des pièces sans catégorie, à partir de leur TITRE.
 *
 * Les pipelines de scraping (CoinAfrique via `data-ad-category` absent, Mobristore
 * qui ne fournit jamais de catégorie, etc.) laissent `CatalogItem.category` à `null`
 * quand la source ne l'expose pas. Le filtre browse (`where.category = "Freinage"`)
 * fait une égalité stricte : une pièce sans catégorie disparaît silencieusement de
 * tous les filtres catégorie, même quand son titre est sans ambiguïté (ex. « Kia
 * Sportage 2011 jeu de plaquettes de frein »).
 *
 * Ce script déduit `category` depuis `name` via le moteur de mots-clés déjà testé
 * de `matchLogisticsFamily` (packages/shared/constants/logistics.ts), en ne gardant
 * que les familles dont le mapping vers une catégorie catalogue (`PART_CATEGORIES`)
 * est sans ambiguïté — les familles trop génériques (joints, pompes, petite
 * électronique...) sont volontairement laissées de côté plutôt que de risquer un
 * mauvais classement.
 *
 * Idempotent : ne cible que les pièces avec `category IS NULL`.
 * Dry-run par défaut — n'écrit en base qu'avec le flag `--commit`.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut : le
 * .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-catalog-categories.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-catalog-categories.ts --commit # écriture
 */
import { matchLogisticsFamily, type PartCategory } from 'shared/constants'
import { prisma } from '../lib/prisma.ts'

/**
 * Familles logistiques → catégorie catalogue, uniquement quand le rattachement
 * est sans ambiguïté. Les familles absentes de cette table (GASKET, PUMP,
 * SMALL_ELECTRIC, WIPER_MIRROR, GENERIC...) mélangent plusieurs catégories
 * catalogue possibles : on préfère laisser ces pièces non catégorisées plutôt
 * que de deviner faux.
 */
const FAMILY_TO_CATEGORY: Partial<Record<string, PartCategory>> = {
  FILTER: 'Filtration',
  BRAKE_PADS: 'Freinage',
  BRAKE_DISCS: 'Freinage',
  BELT_KIT: 'Distribution',
  SHOCK_ABSORBER: 'Suspension',
  SUSPENSION_ARM: 'Suspension',
  ALTERNATOR_STARTER: 'Démarrage & charge',
  TURBO: 'Admission & turbo',
  AC_COMPRESSOR: 'Climatisation & chauffage',
  CLUTCH_KIT: 'Embrayage',
  ENGINE_HEAVY_PART: 'Moteur',
  ENGINE: 'Moteur',
  RADIATOR: 'Refroidissement',
  HEADLIGHT: 'Éclairage & signalisation',
  EXHAUST: 'Échappement',
  STEERING: 'Direction',
  DRIVESHAFT: 'Transmission',
  BUMPER: 'Carrosserie extérieure',
  BODY_PANEL: 'Carrosserie extérieure',
  WINDSHIELD: 'Vitrage',
  BATTERY: 'Électrique & batterie',
  WHEEL: 'Roues & pneus',
  TYRE: 'Roues & pneus',
  GEARBOX: 'Boîte de vitesses',
  EV_HV_COMPONENT: 'Électrique & batterie',
}

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[backfill-categories] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[backfill-categories] DATABASE_URL host = ${dbHost()}`)

  const bySource = await prisma.catalogItem.groupBy({
    by: ['externalSource'],
    where: { category: null },
    _count: { _all: true },
  })
  console.log(`[backfill-categories] répartition des pièces sans catégorie par source :`)
  for (const row of bySource.sort((a, b) => b._count._all - a._count._all)) {
    console.log(`  ${row.externalSource ?? '(manuel / vendeur direct)'}: ${row._count._all}`)
  }

  const items = await prisma.catalogItem.findMany({
    where: { category: null },
    select: { id: true, name: true },
  })
  console.log(`\n[backfill-categories] ${items.length} pièces candidates (0 catégorie)`)

  let matched = 0
  let written = 0
  const matchedByFamily = new Map<string, number>()
  const unmatched: string[] = []

  for (const item of items) {
    const family = matchLogisticsFamily(item.name)
    const category = family ? FAMILY_TO_CATEGORY[family.id] : undefined
    if (!category) {
      unmatched.push(item.name ?? '(sans nom)')
      continue
    }
    matched += 1
    matchedByFamily.set(category, (matchedByFamily.get(category) ?? 0) + 1)
    if (commit) {
      await prisma.catalogItem.update({
        where: { id: item.id },
        data: { category },
      })
      written += 1
    }
  }

  console.log(`\n[backfill-categories] résumé :`)
  console.log(`  pièces avec catégorie déduite : ${matched}/${items.length}`)
  console.log(`  écritures en base              : ${commit ? written : 0}${commit ? '' : ' (dry-run)'}`)
  console.log(`  sans catégorie déduite         : ${unmatched.length}`)
  if (matchedByFamily.size > 0) {
    console.log(`\n[backfill-categories] détail par catégorie déduite :`)
    for (const [category, count] of [...matchedByFamily.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${category}: ${count}`)
    }
  }
  if (unmatched.length > 0) {
    console.log(`\n[backfill-categories] échantillon sans catégorie déduite (titres trop génériques ou famille ambiguë) :`)
    for (const u of unmatched.slice(0, 30)) console.log(`  - ${u}`)
    if (unmatched.length > 30) console.log(`  … (+${unmatched.length - 30})`)
  }

  await prisma.$disconnect()
}

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(inconnu)'
  } catch {
    return '(inconnu)'
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
