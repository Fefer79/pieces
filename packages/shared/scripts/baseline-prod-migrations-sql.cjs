/* Finalise le baseline des migrations prod par SQL direct (sans verrou advisory).
 *
 * Pourquoi pas `prisma migrate resolve` : chaque invocation CLI prend le verrou
 * advisory 72707369 avec un timeout de 10 s ; un acteur externe (déploiements
 * Render en retry) le prend par intermittence, ce qui fait échouer le CLI et
 * laisse des backends orphelins. Les INSERT/UPDATE ici n'ont pas besoin du
 * verrou. La forme des lignes insérées (checksum sha256 du migration.sql,
 * applied_steps_count=0) a été validée identique à celle de `migrate resolve`
 * par scripts/verify-migration-checksums.cjs.
 *
 * Aucune donnée applicative touchée : uniquement la table _prisma_migrations.
 * Les migrations 20260730_vehicle_plate_* restent exclues : elles doivent
 * s'appliquer pour de vrai au prochain `migrate deploy`. */
const { PrismaClient } = require('@prisma/client')
const { createHash } = require('crypto')
const { readFileSync, readdirSync } = require('fs')
const path = require('path')

const EXCLUDE = new Set(['20260730_vehicle_plate_canonical', '20260730_vehicle_plate_unique'])

const prisma = new PrismaClient()

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
  const local = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d/.test(d.name) && !EXCLUDE.has(d.name))
    .map((d) => d.name)
    .sort()

  const appliedRows = await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL'
  )
  const applied = new Set(appliedRows.map((r) => r.migration_name))
  const todo = local.filter((m) => !applied.has(m))
  console.log(`${todo.length} migrations à marquer appliquées`)
  if (todo.length === 0) return

  await prisma.$transaction(async (tx) => {
    const rb = await tx.$executeRawUnsafe(
      'UPDATE _prisma_migrations SET rolled_back_at = now() WHERE finished_at IS NULL AND rolled_back_at IS NULL'
    )
    console.log(`lignes interrompues marquées rolled-back : ${rb}`)
    for (const m of todo) {
      const checksum = createHash('sha256')
        .update(readFileSync(path.join(migrationsDir, m, 'migration.sql')))
        .digest('hex')
      await tx.$executeRawUnsafe(
        `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES (gen_random_uuid(), $1, now(), $2, NULL, NULL, now(), 0)`,
        checksum,
        m
      )
      console.log(`  ${m} ... ok`)
    }
  })
  console.log('terminé')
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
