/* Termine toutes les sessions client du rôle prisma_migration sauf la nôtre.
 * Cible : les backends orphelins bloqués sur pg_advisory_lock(72707369),
 * reliquats des tentatives Prisma expirées côté client. Aucune donnée touchée. */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT pid, pg_terminate_backend(pid) AS terminated
    FROM pg_stat_activity
    WHERE usename = 'prisma_migration'
      AND backend_type = 'client backend'
      AND pid <> pg_backend_pid()
    ORDER BY pid
  `)
  console.log(JSON.stringify(rows))
  const remaining = await prisma.$queryRawUnsafe(`
    SELECT count(*)::int AS n
    FROM pg_locks
    WHERE locktype = 'advisory'
  `)
  console.log('verrous advisory restants :', JSON.stringify(remaining))
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
