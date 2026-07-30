/**
 * Renomme les vendeurs CoinAfrique déjà en base dont le `shopName` trahit la source.
 *
 * Le code d'ingest ne nomme plus jamais un vendeur d'après sa source (cf.
 * `pipeline/coinafrique.ts`), mais les lignes créées avant ce changement portent
 * encore « CoinAfrique CI » (fantôme) ou « Vendeur CoinAfrique » (vendeur réel dont
 * le nom n'a pas pu être scrapé). Ce script les réaligne :
 *
 *   fantôme (externalSellerId = '__shadow__') → Alpha Diaby
 *   vendeur réel sans nom scrapé             → Abou Camara
 *
 * Un vendeur renommé à la main par un admin n'est PAS touché : on ne réécrit que les
 * deux libellés historiques exacts.
 *
 * Dry-run par défaut — n'écrit qu'avec `--commit`.
 *
 * ⚠️ Le .env du repo pointe sur un Supabase legacy vide, PAS sur la prod : sans
 * surcharge de DATABASE_URL le script ne verra aucun vendeur. À lancer depuis
 * `apps/ingest/`.
 *
 *   npx tsx src/scripts/rename-coinafrique-vendors.ts                       # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     npx tsx src/scripts/rename-coinafrique-vendors.ts --commit
 */
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/coinafrique.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'
import { prisma } from '../lib/prisma.ts'

const LEGACY_SHADOW_NAME = 'CoinAfrique CI'
const LEGACY_UNNAMED_NAME = 'Vendeur CoinAfrique'
const SHADOW_VENDOR_SHOP_NAME = 'Alpha Diaby'
const UNNAMED_SELLER_SHOP_NAME = 'Abou Camara'

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[rename-ca-vendors] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[rename-ca-vendors] DATABASE_URL host = ${dbHost()}`)

  const targets = [
    {
      label: `fantôme « ${LEGACY_SHADOW_NAME} » → « ${SHADOW_VENDOR_SHOP_NAME} »`,
      where: { externalSource: EXTERNAL_SOURCE_SLUG, externalSellerId: SHADOW_SELLER_ID, shopName: LEGACY_SHADOW_NAME },
      data: { shopName: SHADOW_VENDOR_SHOP_NAME, contactName: SHADOW_VENDOR_SHOP_NAME },
    },
    {
      label: `sans nom « ${LEGACY_UNNAMED_NAME} » → « ${UNNAMED_SELLER_SHOP_NAME} »`,
      where: { externalSource: EXTERNAL_SOURCE_SLUG, shopName: LEGACY_UNNAMED_NAME },
      data: { shopName: UNNAMED_SELLER_SHOP_NAME },
    },
  ]

  for (const t of targets) {
    const count = await prisma.vendor.count({ where: t.where })
    if (!commit) {
      console.log(`[rename-ca-vendors] ${count} vendeur(s) à renommer — ${t.label}`)
      continue
    }
    const { count: updated } = await prisma.vendor.updateMany({ where: t.where, data: t.data })
    console.log(`[rename-ca-vendors] ${updated}/${count} vendeur(s) renommés — ${t.label}`)
  }

  // Filet de sécurité : reste-t-il un vendeur externe dont le nom cite la source ?
  const leftovers = await prisma.vendor.findMany({
    where: { externalSource: EXTERNAL_SOURCE_SLUG, shopName: { contains: 'coinafrique', mode: 'insensitive' } },
    select: { id: true, shopName: true },
    take: 20,
  })
  if (leftovers.length > 0) {
    console.warn(`[rename-ca-vendors] ⚠️ ${leftovers.length} vendeur(s) citent encore la source :`)
    for (const v of leftovers) console.warn(`    ${v.id} — ${v.shopName}`)
  } else {
    console.log(`[rename-ca-vendors] ✅ aucun vendeur CoinAfrique ne cite la source dans son nom`)
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
