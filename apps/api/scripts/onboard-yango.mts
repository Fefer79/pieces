/**
 * Onboarding d'une flotte à partir d'un export conducteurs Yango.
 *
 * Crée l'entreprise (le propriétaire devient OWNER) puis importe le fichier
 * Yango via le service natif : chauffeurs + véhicules (dédoublonnés par plaque)
 * + affectations, en un seul passage.
 *
 * Usage :
 *   cd apps/api
 *   pnpm tsx --env-file=.env scripts/onboard-yango.mts \
 *     --name "SITEX" \
 *     --owner fernando.kouame@gmail.com \
 *     --file "/Users/mac/Downloads/contractor_profiles_manager_segment_v2_contractors.csv" \
 *     --commune "Abidjan"
 *
 * Idempotent : refuse de continuer si une entreprise du même nom existe déjà
 * (passez --reuse pour importer dans l'entreprise existante).
 */
import { readFileSync } from 'node:fs'
import { prisma } from '../src/lib/prisma.js'
import { createEnterprise } from '../src/modules/enterprise/enterprise.service.js'
import {
  importYangoFromCsv,
  importYangoFromXlsx,
} from '../src/modules/enterprise/yangoImport.service.js'

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag)
  return i !== -1 ? process.argv[i + 1] : undefined
}

const name = arg('--name')
const ownerEmail = arg('--owner')
const file = arg('--file')
const commune = arg('--commune')
const reuse = process.argv.includes('--reuse')

if (!name || !ownerEmail || !file) {
  console.error('Usage: --name <nom> --owner <email> --file <chemin> [--commune <ville>] [--reuse]')
  process.exit(1)
}

const owner = await prisma.user.findFirst({ where: { email: ownerEmail }, select: { id: true } })
if (!owner) {
  console.error(`Propriétaire introuvable pour l'email ${ownerEmail}`)
  process.exit(1)
}

let enterpriseId: string
const existing = await prisma.enterprise.findFirst({
  where: { name: { equals: name, mode: 'insensitive' } },
  select: { id: true, name: true },
})
if (existing) {
  if (!reuse) {
    console.error(`L'entreprise « ${existing.name} » existe déjà (${existing.id}). Ajoutez --reuse pour importer dedans.`)
    process.exit(1)
  }
  enterpriseId = existing.id
  console.log(`Réutilisation de l'entreprise existante « ${existing.name} » (${enterpriseId})`)
} else {
  const ent = await createEnterprise(owner.id, { name, commune: commune ?? 'Abidjan' })
  enterpriseId = ent.id
  console.log(`Entreprise créée : « ${ent.name} » [${ent.slug}] (${enterpriseId}) — propriétaire ${ownerEmail}`)
}

const buf = readFileSync(file)
const isXlsx = file.toLowerCase().endsWith('.xlsx')
const result = isXlsx
  ? await importYangoFromXlsx(enterpriseId, owner.id, buf)
  : await importYangoFromCsv(enterpriseId, owner.id, buf.toString('utf8'))

console.log('\n=== Résultat de l\'import Yango ===')
console.log(`Chauffeurs créés : ${result.drivers.created}`)
if (result.drivers.errors.length) {
  console.log(`  Lignes ignorées (${result.drivers.errors.length}) :`)
  for (const e of result.drivers.errors) console.log(`   - ${e.line ? `L${e.line}: ` : ''}${e.message}`)
}
console.log(`Véhicules créés : ${result.vehicles.created} · affectés : ${result.vehicles.assigned ?? 0}`)
if (result.vehicles.errors.length) {
  console.log(`  Lignes ignorées (${result.vehicles.errors.length}) :`)
  for (const e of result.vehicles.errors) console.log(`   - ${e.line ? `L${e.line}: ` : ''}${e.message}`)
}

await prisma.$disconnect()
