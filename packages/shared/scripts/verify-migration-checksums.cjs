/* Compare les checksums stockés dans _prisma_migrations avec le sha256
 * local des migration.sql, pour valider l'insertion SQL directe. */
const { PrismaClient } = require('@prisma/client')
const { createHash } = require('crypto')
const { readFileSync } = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT migration_name, checksum, applied_steps_count,
           finished_at IS NOT NULL AS finished,
           rolled_back_at IS NOT NULL AS rolled_back
    FROM _prisma_migrations
    ORDER BY started_at
  `)
  console.log('== Lignes _prisma_migrations ==')
  for (const r of rows) {
    console.log(
      `${r.migration_name} | steps=${r.applied_steps_count} | finished=${r.finished} | rolled_back=${r.rolled_back} | checksum=${r.checksum.slice(0, 12)}...`
    )
  }

  console.log('\n== Vérification sha256 local vs checksum stocké ==')
  for (const r of rows) {
    const file = path.join(__dirname, '..', 'prisma', 'migrations', r.migration_name, 'migration.sql')
    let local
    try {
      local = createHash('sha256').update(readFileSync(file)).digest('hex')
    } catch {
      console.log(`${r.migration_name} : pas de fichier local (baseline ?)`)
      continue
    }
    console.log(`${r.migration_name} : ${local === r.checksum ? 'MATCH' : `DIFFÈRE (local ${local.slice(0, 12)}...)`}`)
  }
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
