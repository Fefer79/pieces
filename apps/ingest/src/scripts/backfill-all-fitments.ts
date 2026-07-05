/**
 * Backfill GLOBAL des fitments : couvre TOUS les articles sans aucun fitment,
 * quelle que soit leur source (CoinAfrique, Jumia, Global Auto, ou créés à la main).
 *
 * Sans fitment structuré, une pièce disparaît du parcours acheteur dès qu'un
 * véhicule est sélectionné (filtrage strict de `browseParts`) et n'affiche aucune
 * compatibilité dans l'admin — alors que sa marque est souvent lisible dans le titre.
 *
 * Deux stratégies, dans l'ordre de fiabilité :
 *   1. `vehicleCompatibility` (texte libre legacy) présent → `parseCompatibilityText`
 *      (garde l'année quand elle est écrite).
 *   2. Sinon → `extractFitmentsFromName` sur le nom (marque noyée dans le titre,
 *      conservateur : pas d'année, modèle seulement s'il est connu au catalogue).
 *
 * Idempotent : ne traite QUE les articles ayant zéro fitment. Relançable sans risque.
 * Dry-run par défaut — n'écrit en base qu'avec le flag `--commit`.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut : le
 * .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render/Prisma.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-all-fitments.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-all-fitments.ts --commit # écriture
 */
import { extractFitmentsFromName, parseCompatibilityText } from 'shared/constants'
import { prisma } from '../lib/prisma.ts'

interface FitmentInput {
  brand: string
  model: string | null
  yearFrom: number | null
  yearTo: number | null
}

/** Déduit les fitments d'un article : compat texte libre en priorité, sinon titre. */
function deriveFitments(name: string | null, compat: string | null): FitmentInput[] {
  const fromText = parseCompatibilityText(compat)
  if (fromText) return [fromText]
  return extractFitmentsFromName(name).map((f) => ({
    brand: f.brand,
    model: f.model,
    yearFrom: f.yearFrom,
    yearTo: f.yearTo,
  }))
}

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[backfill-all-fitments] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[backfill-all-fitments] DATABASE_URL host = ${dbHost()}`)

  // Idempotent : tous les articles sans aucun fitment, toutes sources confondues.
  const items = await prisma.catalogItem.findMany({
    where: { fitments: { none: {} } },
    select: { id: true, name: true, vehicleCompatibility: true, externalSource: true },
  })
  console.log(`[backfill-all-fitments] ${items.length} articles candidats (0 fitment)`)

  let withFitment = 0
  let fitmentsWritten = 0
  const bySource = new Map<string, { matched: number; total: number }>()
  const unmatched: string[] = []
  const sample: string[] = []
  // On accumule TOUS les inserts pour n'émettre qu'un seul createMany : sur une base
  // distante (db.prisma.io, Paris), un appel par article = des centaines d'allers-retours.
  const toInsert: { catalogItemId: string; brand: string; model: string | null; yearFrom: number | null; yearTo: number | null }[] = []

  for (const item of items) {
    const src = item.externalSource ?? '(manuel)'
    const agg = bySource.get(src) ?? { matched: 0, total: 0 }
    agg.total += 1

    const fitments = deriveFitments(item.name, item.vehicleCompatibility)
    if (fitments.length === 0) {
      unmatched.push(item.name ?? '(sans nom)')
      bySource.set(src, agg)
      continue
    }
    withFitment += 1
    agg.matched += 1
    bySource.set(src, agg)

    if (sample.length < 30) {
      const desc = fitments
        .map((f) => [f.brand, f.model, f.yearFrom && `${f.yearFrom}${f.yearTo ? `-${f.yearTo}` : '+'}`].filter(Boolean).join(' '))
        .join(' | ')
      sample.push(`  "${item.name}" → ${desc}`)
    }

    for (const f of fitments) {
      toInsert.push({ catalogItemId: item.id, brand: f.brand, model: f.model, yearFrom: f.yearFrom, yearTo: f.yearTo })
    }
  }

  if (commit && toInsert.length > 0) {
    const res = await prisma.catalogItemFitment.createMany({ data: toInsert })
    fitmentsWritten = res.count
  }

  console.log(`\n[backfill-all-fitments] résumé :`)
  console.log(`  articles avec marque détectée : ${withFitment}/${items.length}`)
  console.log(`  fitments écrits               : ${commit ? fitmentsWritten : 0}${commit ? '' : ' (dry-run)'}`)
  console.log(`  sans marque (laissés tels)    : ${unmatched.length}`)
  console.log(`\n[backfill-all-fitments] par source :`)
  for (const [src, agg] of [...bySource.entries()].sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${src.padEnd(16)} ${agg.matched}/${agg.total} détectés`)
  }
  if (sample.length > 0) {
    console.log(`\n[backfill-all-fitments] échantillon des déductions :`)
    for (const s of sample) console.log(s)
  }
  if (!commit && unmatched.length > 0) {
    console.log(`\n[backfill-all-fitments] échantillon sans marque (titres génériques attendus) :`)
    for (const u of unmatched.slice(0, 20)) console.log(`  - ${u}`)
    if (unmatched.length > 20) console.log(`  … (+${unmatched.length - 20})`)
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
