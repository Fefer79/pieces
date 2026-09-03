/**
 * Débloque une migration marquée « failed » dans _prisma_migrations.
 *
 * Cas d'usage : le SQL a été appliqué à la main, puis `prisma migrate deploy`
 * (lancé par Render au démarrage) a rejoué la migration et heurté un
 * « already exists » (P3018). La migration reste enregistrée en échec et
 * bloque TOUS les déploiements suivants en P3009.
 *
 * Comme le schéma est bien en place, on la marque « applied ».
 *
 *   node packages/shared/prisma/manual/resolve-failed-migration.mjs <nom-migration>
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

console.log(`→ prisma migrate resolve --applied ${migration}`)
const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'migrate', 'resolve', '--applied', migration, '--schema', 'prisma/schema.prisma'],
  { cwd: sharedDir, stdio: 'inherit', env: { ...process.env, DATABASE_URL: match[0] } },
)
process.exit(result.status ?? 1)
