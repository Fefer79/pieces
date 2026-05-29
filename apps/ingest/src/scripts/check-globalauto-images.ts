/**
 * Diagnostic LECTURE SEULE : combien d'annonces GlobalAuto ont une image stockée
 * (`imageOriginalUrl`) vs combien sont vides. Sert à savoir si les photos
 * s'afficheront dans le menu Annonces sans re-import.
 *
 * Aucune écriture. Affiche aussi un échantillon d'URLs et un comptage par source.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut :
 * le .env du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger
 * explicitement DATABASE_URL avec l'URL du dashboard Render.
 *
 *   DATABASE_URL='postgresql://…(prod Render)…' \
 *     pnpm -F ingest exec tsx src/scripts/check-globalauto-images.ts
 */
import { prisma } from '../lib/prisma.ts'

const GA = 'GLOBAL_AUTO_CI'

async function main(): Promise<void> {
  console.log(`[check-ga-images] DATABASE_URL host = ${dbHost()}\n`)

  const total = await prisma.catalogItem.count({ where: { externalSource: GA } })
  const withImage = await prisma.catalogItem.count({
    where: { externalSource: GA, imageOriginalUrl: { not: null } },
  })
  const withPhotoRows = await prisma.catalogItem.count({
    where: { externalSource: GA, photos: { some: {} } },
  })

  console.log(`Annonces GlobalAuto (external_source = ${GA}) :`)
  console.log(`  total                       : ${total}`)
  console.log(`  avec imageOriginalUrl       : ${withImage}`)
  console.log(`  sans image (null)           : ${total - withImage}`)
  console.log(`  avec photos[] (CatalogItemPhoto) : ${withPhotoRows}`)

  if (total > 0) {
    const pct = ((withImage / total) * 100).toFixed(1)
    console.log(`  couverture image principale : ${pct}%`)
  }

  const sample = await prisma.catalogItem.findMany({
    where: { externalSource: GA, imageOriginalUrl: { not: null } },
    select: { id: true, name: true, imageOriginalUrl: true },
    take: 5,
  })
  if (sample.length > 0) {
    console.log(`\nÉchantillon d'URLs stockées :`)
    for (const s of sample) console.log(`  - ${s.name?.slice(0, 40) ?? '(sans nom)'} → ${s.imageOriginalUrl}`)
  } else {
    console.log(`\n⚠️ Aucune image stockée : il faudra re-importer pour afficher des photos.`)
  }

  // Vue d'ensemble toutes sources (pour contexte)
  const bySource = await prisma.catalogItem.groupBy({
    by: ['externalSource'],
    where: { externalSource: { not: null } },
    _count: { _all: true },
  })
  if (bySource.length > 0) {
    console.log(`\nToutes sources externes :`)
    for (const r of bySource) console.log(`  - ${r.externalSource}: ${r._count._all}`)
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
