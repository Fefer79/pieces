// Rattrapage ponctuel : vendeurs dont le contrat d'adhésion est signé mais qui sont
// restés PENDING_ACTIVATION, faute d'activation à la signature (corrigé par
// 8ee23b7). Idempotent : ne touche que les vendeurs en attente, et les
// signatures de garanties sont créées en skipDuplicates.
//
//   pnpm exec tsx scripts/backfill-vendor-activation.mts          → dry-run
//   pnpm exec tsx scripts/backfill-vendor-activation.mts --apply  → écrit
//
// L'URL prod est lue depuis .claude/settings.local.json : le .env local pointe
// une base Supabase fantôme, et PrismaClient le charge tout seul — sans cet
// override, le script écrirait dans le vide.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const settingsPath = join(here, '..', '..', '..', '.claude', 'settings.local.json')

function resolveProdUrl(): string {
  const fromEnv = process.env.PIECES_PROD_DATABASE_URL
  if (fromEnv) return fromEnv
  const raw = readFileSync(settingsPath, 'utf8')
  const match = raw.match(/postgres:\/\/[^ "']+db\.prisma\.io[^ "']+/)
  if (!match) throw new Error('URL prod db.prisma.io introuvable dans .claude/settings.local.json')
  return match[0]
}

const url = resolveProdUrl()
if (!url.includes('db.prisma.io')) {
  throw new Error('Refus : l’URL résolue ne pointe pas vers la prod db.prisma.io')
}
process.env.DATABASE_URL = url

const { PrismaClient } = await import('@prisma/client')
const prisma = new PrismaClient()
const APPLY = process.argv.includes('--apply')

const targets = await prisma.vendor.findMany({
  where: { status: 'PENDING_ACTIVATION', contracts: { some: { status: 'ACCEPTED' } } },
  select: {
    id: true,
    shopName: true,
    contracts: {
      where: { status: 'ACCEPTED' },
      select: { signedName: true, signedAt: true },
      orderBy: { signedAt: 'desc' },
      take: 1,
    },
  },
})

console.log(`${targets.length} vendeur(s) signé(s) mais resté(s) en attente d'activation`)
for (const v of targets) {
  const c = v.contracts[0]
  console.log(` - ${v.shopName} — signé par ${c?.signedName} le ${c?.signedAt?.toISOString().slice(0, 10)}`)
}

if (!APPLY) {
  console.log('\n(dry-run — relancer avec --apply)')
  await prisma.$disconnect()
  process.exit(0)
}

for (const v of targets) {
  await prisma.$transaction(async (tx) => {
    await tx.vendorGuaranteeSignature.createMany({
      data: [
        { vendorId: v.id, guaranteeType: 'RETURN_48H' },
        { vendorId: v.id, guaranteeType: 'DELIVERY_REFUSAL' },
      ],
      skipDuplicates: true,
    })
    await tx.vendor.update({ where: { id: v.id }, data: { status: 'ACTIVE' } })
  })
  console.log(`   ✓ ${v.shopName} activé`)
}

const left = await prisma.vendor.count({
  where: { status: 'PENDING_ACTIVATION', contracts: { some: { status: 'ACCEPTED' } } },
})
console.log(`\nreste en attente avec contrat signé : ${left}`)
await prisma.$disconnect()
