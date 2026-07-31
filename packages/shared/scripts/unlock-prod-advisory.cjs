/* Libère les verrous advisory de session sur le backend du pooler.
 * Contexte : un pg_advisory_lock(72707369) (Prisma migrate) est resté pris
 * sur un backend persistant du pooler après la déconnexion du client d'origine.
 * Aucune donnée touchée. */
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe('SELECT pg_advisory_unlock_all()')
  console.log('pg_advisory_unlock_all : exécuté')
  const remaining = await prisma.$queryRawUnsafe(`
    SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory'
  `)
  console.log('verrous advisory restants :', JSON.stringify(remaining))
}

main()
  .catch((e) => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
