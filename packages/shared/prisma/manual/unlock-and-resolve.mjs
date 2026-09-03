/**
 * Débloque `prisma migrate` en prod, en deux temps :
 *
 *   1. libère le verrou consultatif 72707369 tenu par une session zombie
 *      (déploiement Render tué en cours de migration → P1002) ;
 *   2. marque la migration en échec comme appliquée (le SQL est déjà en base
 *      via prisma/manual/20260903_prospection_sync.sql) → lève le P3009 qui
 *      bloque tous les déploiements.
 *
 *   node packages/shared/prisma/manual/unlock-and-resolve.mjs [nom-migration]
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const migration = process.argv[2] ?? '20260903_prospection_lead_kyc_photo'

const here = dirname(fileURLToPath(import.meta.url))
const sharedDir = resolve(here, '../..')
const settingsPath = resolve(sharedDir, '../../.claude/settings.local.json')

const match = readFileSync(settingsPath, 'utf8').match(
  /postgres:\/\/[^"\\ ]*db\.prisma\.io[^"\\ ]*sslmode=require/,
)
if (!match) {
  console.error(`URL prod db.prisma.io introuvable dans ${settingsPath}`)
  process.exit(1)
}
const env = { ...process.env, DATABASE_URL: match[0] }

function run(label, args) {
  console.log(`\n→ ${label}`)
  const r = spawnSync('pnpm', args, { cwd: sharedDir, stdio: 'inherit', env })
  return r.status ?? 1
}

const unlocked = run('libération du verrou consultatif', [
  'exec', 'prisma', 'db', 'execute',
  '--schema', 'prisma/schema.prisma',
  '--file', 'prisma/manual/unlock-migrate-advisory.sql',
])
if (unlocked !== 0) {
  console.error('Échec de la libération du verrou — on s’arrête là.')
  process.exit(unlocked)
}

process.exit(
  run(`migrate resolve --applied ${migration}`, [
    'exec', 'prisma', 'migrate', 'resolve',
    '--applied', migration,
    '--schema', 'prisma/schema.prisma',
  ]),
)
