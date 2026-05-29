/**
 * Backfill des fitments structurés (CatalogItemFitment) à partir du texte legacy
 * `CatalogItem.vehicleCompatibility`, pour que le filtrage strict du parcours
 * acheteur fonctionne sans vider le catalogue.
 *
 * Idempotent : ne traite QUE les pièces sans aucun fitment existant.
 * Dry-run par défaut — n'écrit en base qu'avec le flag `--commit`.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut :
 * le .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render (cf. CTO_BIBLE).
 *
 *   pnpm -F ingest tsx src/scripts/backfill-fitments.ts            # dry-run
 *   pnpm -F ingest tsx src/scripts/backfill-fitments.ts --commit   # écriture
 */
import { parseCompatibilityText } from 'shared/constants'
import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  const mode = commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'
  console.log(`[backfill-fitments] mode = ${mode}`)
  console.log(`[backfill-fitments] DATABASE_URL host = ${dbHost()}`)

  // Idempotent : seules les pièces avec un texte de compatibilité ET sans fitment.
  const items = await prisma.catalogItem.findMany({
    where: {
      vehicleCompatibility: { not: null },
      fitments: { none: {} },
    },
    select: { id: true, vehicleCompatibility: true },
  })

  console.log(`[backfill-fitments] ${items.length} pièces candidates (texte présent, 0 fitment)`)

  let parsed = 0
  let written = 0
  const unparsed: string[] = []

  for (const item of items) {
    const f = parseCompatibilityText(item.vehicleCompatibility)
    if (!f) {
      if (item.vehicleCompatibility?.trim()) unparsed.push(item.vehicleCompatibility)
      continue
    }
    parsed += 1
    if (commit) {
      await prisma.catalogItemFitment.create({
        data: {
          catalogItemId: item.id,
          brand: f.brand,
          model: f.model,
          yearFrom: f.yearFrom,
          yearTo: f.yearTo,
        },
      })
      written += 1
    }
  }

  console.log(`\n[backfill-fitments] résumé :`)
  console.log(`  parsés    : ${parsed}`)
  console.log(`  écrits    : ${commit ? written : 0}${commit ? '' : ' (dry-run)'}`)
  console.log(`  non parsés: ${unparsed.length}`)
  if (unparsed.length > 0) {
    console.log(`\n[backfill-fitments] chaînes non parsées (à revoir) :`)
    for (const u of unparsed.slice(0, 50)) console.log(`  - ${u}`)
    if (unparsed.length > 50) console.log(`  … (+${unparsed.length - 50})`)
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
