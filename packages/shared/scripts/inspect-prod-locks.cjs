/* Inspection des verrous advisory et sessions sur la prod (lecture seule). */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const locks = await prisma.$queryRawUnsafe(`
    SELECT l.pid, l.classid::bigint AS classid, l.objid::bigint AS objid,
           a.usename, a.state, a.backend_start::text,
           (now() - a.backend_start)::text AS age,
           left(coalesce(a.query, ''), 100) AS query
    FROM pg_locks l
    LEFT JOIN pg_stat_activity a ON a.pid = l.pid
    WHERE l.locktype = 'advisory'
    ORDER BY a.backend_start
  `)
  console.log('== Verrous advisory ==')
  console.log(JSON.stringify(locks, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2))

  const sessions = await prisma.$queryRawUnsafe(`
    SELECT pid, usename, state, backend_start::text,
           (now() - backend_start)::text AS age,
           left(coalesce(query, ''), 80) AS query
    FROM pg_stat_activity
    WHERE backend_type = 'client backend'
    ORDER BY backend_start
  `)
  console.log('== Sessions client ==')
  console.log(JSON.stringify(sessions, (_, v) => (typeof v === 'bigint' ? v.toString() : v), 2))
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
