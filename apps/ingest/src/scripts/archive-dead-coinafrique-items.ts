/**
 * Archive les annonces CoinAfrique mortes (supprimées / expirées à la source).
 *
 * Les petites annonces CoinAfrique expirent au bout de ~2 mois. Le snapshot de juin
 * 2026 laissait 2 182 annonces `PUBLISHED` pointant vers des 404 — visibles en
 * recherche, incliquables une fois ouvertes.
 *
 * Critère retenu : « rattachée au vendeur fantôme ». Sondage du 2026-07-29 sur la
 * prod, échantillons répartis uniformément :
 *   - 80/80  des annonces sur le fantôme  → HTTP 404 (mortes)
 *   - 40/40  des annonces sur un vrai vendeur → HTTP 200 (vivantes)
 * La corrélation est parfaite et s'explique : l'enrichissement vendeur ne peut
 * résoudre un nom que si la page détail répond, donc « pas de vendeur réel » ⟺
 * « page morte ». `--verify` re-teste chaque URL en HTTP avant d'archiver, pour les
 * runs futurs où cette corrélation pourrait ne plus tenir.
 *
 * ARCHIVED est réversible : les lignes restent en base, seul le statut change, et
 * `browse.service` ne sert que du PUBLISHED.
 *
 * Dry-run par défaut — n'écrit qu'avec `--commit`. À lancer depuis `apps/ingest/`.
 * ⚠️ Le .env du repo pointe sur un Supabase legacy vide, PAS sur la prod.
 *
 *   npx tsx src/scripts/archive-dead-coinafrique-items.ts                    # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     npx tsx src/scripts/archive-dead-coinafrique-items.ts --commit --verify
 */
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/coinafrique.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'
import { prisma } from '../lib/prisma.ts'

const UA = 'pieces-ci-ingest/0.1 (+https://pieces.ci; contact: techops@pieces.ci)'
const VERIFY_DELAY_MS = 800

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  const verify = process.argv.includes('--verify')
  console.log(`[archive-ca] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}${verify ? ' + VERIFY HTTP' : ''}`)
  console.log(`[archive-ca] DATABASE_URL host = ${dbHost()}`)

  const candidates = await withRetry(() =>
    prisma.catalogItem.findMany({
      where: {
        externalSource: EXTERNAL_SOURCE_SLUG,
        status: 'PUBLISHED',
        vendor: { externalSellerId: SHADOW_SELLER_ID },
      },
      select: { id: true, externalSourceUrl: true },
    }),
  )
  console.log(`[archive-ca] ${candidates.length} annonce(s) PUBLISHED sur le vendeur fantôme`)

  if (!verify) {
    if (!commit) {
      console.log(`[archive-ca] DRY-RUN : ${candidates.length} annonce(s) seraient passées en ARCHIVED`)
      await prisma.$disconnect()
      return
    }
    await archiveBatch(candidates.map((c) => c.id))
    await report()
    await prisma.$disconnect()
    return
  }

  // Vérification + archivage ENTRELACÉS, par paquets : une coupure réseau ne coûte
  // que le paquet en cours, pas les 30 minutes de vérification. Relançable — les
  // annonces déjà archivées sortent d'elles-mêmes du `findMany` ci-dessus.
  console.log(`[archive-ca] vérification HTTP de chaque URL (${VERIFY_DELAY_MS} ms entre deux appels)…`)
  const CHUNK = 100
  let dead = 0
  let alive = 0
  let archived = 0
  let pending: string[] = []

  for (let i = 0; i < candidates.length; i += 1) {
    const c = candidates[i]
    if (!c) continue
    if (!c.externalSourceUrl) {
      pending.push(c.id) // Pas d'URL → invérifiable et inexploitable : on archive.
      dead += 1
    } else {
      try {
        const res = await fetch(c.externalSourceUrl, { headers: { 'user-agent': UA } })
        if (res.ok) {
          alive += 1
        } else {
          pending.push(c.id)
          dead += 1
        }
      } catch {
        alive += 1 // Erreur réseau de NOTRE côté : on ne condamne pas l'annonce.
      }
      await sleep(VERIFY_DELAY_MS)
    }

    const last = i === candidates.length - 1
    if (pending.length >= CHUNK || (last && pending.length > 0)) {
      if (commit) archived += await archiveBatch(pending)
      pending = []
    }
    if ((i + 1) % CHUNK === 0 || last) {
      console.log(
        `[archive-ca] ${i + 1}/${candidates.length} vérifiées — mortes:${dead} vivantes:${alive}${commit ? ` archivées:${archived}` : ' (dry-run)'}`,
      )
    }
  }

  console.log(`[archive-ca] vérification finie — ${dead} mortes, ${alive} vivantes (épargnées)`)
  if (commit) await report()
  else console.log(`[archive-ca] DRY-RUN : ${dead} annonce(s) seraient passées en ARCHIVED`)

  await prisma.$disconnect()
}

/** Passe un lot d'ids en ARCHIVED. Retourne le nombre de lignes effectivement mises à jour. */
async function archiveBatch(ids: string[]): Promise<number> {
  const BATCH = 500
  let archived = 0
  for (let i = 0; i < ids.length; i += BATCH) {
    const slice = ids.slice(i, i + BATCH)
    const { count } = await withRetry(() =>
      prisma.catalogItem.updateMany({ where: { id: { in: slice } }, data: { status: 'ARCHIVED' } }),
    )
    archived += count
  }
  return archived
}

async function report(): Promise<void> {
  const remaining = await withRetry(() =>
    prisma.catalogItem.count({
      where: { externalSource: EXTERNAL_SOURCE_SLUG, status: 'PUBLISHED', vendor: { externalSellerId: SHADOW_SELLER_ID } },
    }),
  )
  const live = await withRetry(() =>
    prisma.catalogItem.count({ where: { externalSource: EXTERNAL_SOURCE_SLUG, status: 'PUBLISHED' } }),
  )
  console.log(`[archive-ca] ✅ reste ${remaining} PUBLISHED sur le fantôme — ${live} annonces CoinAfrique encore visibles`)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/** Retry exponentiel : db.prisma.io lâche des connexions (P2024, socket fermée). */
async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  let lastErr: unknown
  for (let a = 0; a < attempts; a += 1) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (a < attempts - 1) {
        console.warn(`[archive-ca] écriture/lecture DB KO (essai ${a + 1}/${attempts}), nouvelle tentative…`)
        await sleep(2000 * 2 ** a)
      }
    }
  }
  throw lastErr
}

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(inconnu)'
  } catch {
    return '(inconnu)'
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
