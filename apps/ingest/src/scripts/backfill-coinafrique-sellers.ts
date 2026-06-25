/**
 * Backfill du vrai vendeur (nom + téléphone) des pièces CoinAfrique déjà importées.
 *
 * À l'origine, toutes les annonces CoinAfrique pointaient vers un seul vendeur
 * fantôme « CoinAfrique CI ». Le vrai vendeur (nom + numéro) ne vit que sur la page
 * détail `/annonce/…`. Ce script refetch chaque page détail, upsert un Vendor par
 * vendeur réel (dédup sur l'UUID `data-user-id`) et réassigne `catalogItem.vendorId`.
 *
 * Idempotent : upsert sur la clé composite (externalSource, externalSellerId) et
 * réassignation directe. Relançable sans dégât. Les annonces dont le détail est KO
 * (502 persistant, plus de data-user-id) restent sur le vendeur fantôme.
 *
 * Dry-run par défaut — n'écrit en base qu'avec `--commit`. `--limit N` borne le lot.
 *
 * ⚠️ La prod (Prisma Postgres, db.prisma.io) n'est PAS la cible par défaut : le .env
 * du repo pointe sur un Supabase legacy. Pour viser la prod, surcharger DATABASE_URL.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-coinafrique-sellers.ts --limit 20      # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-coinafrique-sellers.ts --commit      # écriture
 */
import { fetchAdDetail, parseAdDetail } from '../sources/coinafrique.ts'
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/coinafrique.ts'
import { resolveCoinAfriqueVendorId } from '../pipeline/coinafrique.ts'
import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limitFlagIdx = process.argv.indexOf('--limit')
  const limit = limitArg
    ? Number(limitArg.split('=')[1])
    : limitFlagIdx >= 0
      ? Number(process.argv[limitFlagIdx + 1])
      : undefined

  console.log(`[backfill-ca-sellers] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[backfill-ca-sellers] DATABASE_URL host = ${dbHost()}`)

  const items = await prisma.catalogItem.findMany({
    where: { externalSource: EXTERNAL_SOURCE_SLUG, externalSourceUrl: { not: null } },
    select: { id: true, externalSourceUrl: true },
    ...(limit ? { take: limit } : {}),
  })
  console.log(`[backfill-ca-sellers] ${items.length} annonces CoinAfrique à traiter`)

  const cache = new Map<string, string>()
  let resolved = 0
  let fallback = 0
  let reassigned = 0

  for (const item of items) {
    const url = item.externalSourceUrl as string
    let seller = { sellerId: null as string | null, sellerName: null as string | null, sellerPhone: null as string | null }
    try {
      const detail = parseAdDetail(await fetchAdDetail(url))
      seller = { sellerId: detail.sellerId, sellerName: detail.sellerName, sellerPhone: detail.phone }
      if (detail.sellerId) resolved += 1
      else fallback += 1
    } catch (err) {
      fallback += 1
      console.warn(`[backfill-ca-sellers] détail KO ${url}:`, err instanceof Error ? err.message : err)
    }

    if (commit) {
      const vendorId = await resolveCoinAfriqueVendorId(seller, prisma, cache)
      await prisma.catalogItem.update({ where: { id: item.id }, data: { vendorId } })
      reassigned += 1
    }
  }

  console.log(`\n[backfill-ca-sellers] résumé :`)
  console.log(`  vendeurs réels résolus  : ${resolved}`)
  console.log(`  fallback fantôme        : ${fallback}`)
  console.log(`  vendeurs distincts créés: ${commit ? cache.size : '(dry-run)'}`)
  console.log(`  annonces réassignées    : ${commit ? reassigned : '(dry-run)'}`)

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
