/**
 * Backfill des fitments des pièces CoinAfrique à partir de leur TITRE.
 *
 * Les annonces CoinAfrique n'ont pas de champ de compatibilité : la marque du
 * véhicule est noyée dans le nom (« Phare BMW », « Filtre à huile Renault »).
 * Sans fitment structuré, ces pièces disparaissent du parcours acheteur dès qu'un
 * véhicule est sélectionné (filtrage strict). Ce script déduit les fitments du nom
 * via `extractFitmentsFromName` et les écrit dans `CatalogItemFitment`.
 *
 * Idempotent : ne traite QUE les pièces du vendor CoinAfrique sans aucun fitment.
 * Dry-run par défaut — n'écrit en base qu'avec le flag `--commit`.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut : le
 * .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-coinafrique-fitments.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-coinafrique-fitments.ts --commit # écriture
 */
import { extractFitmentsFromName } from 'shared/constants'
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/coinafrique.ts'
import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[backfill-ca-fitments] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[backfill-ca-fitments] DATABASE_URL host = ${dbHost()}`)

  const vendor = await prisma.vendor.findUnique({
    where: { externalSource: EXTERNAL_SOURCE_SLUG },
    select: { id: true, shopName: true },
  })
  if (!vendor) {
    console.log(`[backfill-ca-fitments] vendor CoinAfrique introuvable (${EXTERNAL_SOURCE_SLUG}) — rien à faire.`)
    await prisma.$disconnect()
    return
  }

  // Idempotent : pièces du vendor CoinAfrique sans aucun fitment.
  const items = await prisma.catalogItem.findMany({
    where: { vendorId: vendor.id, fitments: { none: {} } },
    select: { id: true, name: true },
  })
  console.log(`[backfill-ca-fitments] ${items.length} pièces candidates (vendor ${vendor.shopName}, 0 fitment)`)

  let withFitment = 0
  let fitmentsWritten = 0
  const unmatched: string[] = []

  for (const item of items) {
    const fitments = extractFitmentsFromName(item.name)
    if (fitments.length === 0) {
      unmatched.push(item.name ?? '(sans nom)')
      continue
    }
    withFitment += 1
    if (commit) {
      await prisma.catalogItemFitment.createMany({
        data: fitments.map((f) => ({
          catalogItemId: item.id,
          brand: f.brand,
          model: f.model,
          yearFrom: f.yearFrom,
          yearTo: f.yearTo,
        })),
      })
      fitmentsWritten += fitments.length
    }
  }

  console.log(`\n[backfill-ca-fitments] résumé :`)
  console.log(`  pièces avec marque détectée : ${withFitment}/${items.length}`)
  console.log(`  fitments écrits             : ${commit ? fitmentsWritten : 0}${commit ? '' : ' (dry-run)'}`)
  console.log(`  sans marque (laissées telles): ${unmatched.length}`)
  if (!commit && unmatched.length > 0) {
    console.log(`\n[backfill-ca-fitments] échantillon sans marque (titres génériques attendus) :`)
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
