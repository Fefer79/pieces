/**
 * Applique 20260903_prospection_sync.sql sur la base de prod.
 *
 * Ce dépôt migre la base hors de `prisma migrate` : ce script rejoue le SQL à la
 * main. Il est idempotent — rejouable sans risque.
 *
 * Le credential n'est jamais affiché ni passé en ligne de commande : il est lu
 * depuis .claude/settings.local.json et transmis à Prisma par l'environnement.
 *
 *   node packages/shared/prisma/manual/apply-prospection-sync.mjs
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const sharedDir = resolve(here, '../..')
const settingsPath = resolve(sharedDir, '../../.claude/settings.local.json')

const raw = readFileSync(settingsPath, 'utf8')
const match = raw.match(/postgres:\/\/[^"\\ ]*db\.prisma\.io[^"\\ ]*sslmode=require/)
if (!match) {
  console.error(`URL prod db.prisma.io introuvable dans ${settingsPath}`)
  process.exit(1)
}

console.log('→ prisma db execute sur db.prisma.io …')
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'prisma',
    'db',
    'execute',
    '--schema',
    'prisma/schema.prisma',
    '--file',
    'prisma/manual/20260903_prospection_sync.sql',
  ],
  {
    cwd: sharedDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: match[0] },
  },
)
process.exit(result.status ?? 1)
