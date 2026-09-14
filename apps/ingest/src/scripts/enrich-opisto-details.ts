/**
 * Enrichit les pièces Opisto depuis leur fiche produit.
 *
 * Le listing ne donne ni la référence OEM (présente seulement dans le nom des
 * photos non lazy-loadées, ~3 % des annonces) ni l'année du donneur une fois sur
 * deux. Or pour une pièce d'occasion la référence constructeur est la seule
 * correspondance vraiment fiable, et sans année la pièce reste invisible dans un
 * filtre de compatibilité strict.
 *
 * Une requête par fiche, au rate-limit de `fetchText`. Le script est REPRENABLE :
 * il ne sélectionne que les lignes encore incomplètes, donc une interruption se
 * rattrape en relançant.
 *
 *   pnpm -F ingest enrich:opisto -- --limit=50   # essai
 *   pnpm -F ingest enrich:opisto                 # tout le reliquat
 */
import { parseArgs } from 'node:util'
import { fetchPartDetail } from '../sources/opisto.ts'
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/opisto.ts'
import { withDbRetry } from '../pipeline/opisto.ts'
import { prisma } from '../lib/prisma.ts'

const reconnect = () => prisma.$disconnect()

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string' },
      'log-every': { type: 'string' },
      'flush-every': { type: 'string' },
    },
  })
  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined
  const logEvery = values['log-every'] ? Number.parseInt(values['log-every'], 10) : 100
  const flushEvery = values['flush-every'] ? Number.parseInt(values['flush-every'], 10) : 50

  const items = await prisma.catalogItem.findMany({
    where: {
      externalSource: EXTERNAL_SOURCE_SLUG,
      externalSourceUrl: { not: null },
      // Incomplet = pas de réf OEM, ou au moins un fitment sans année.
      OR: [{ oemReference: null }, { fitments: { some: { yearFrom: null } } }],
    },
    select: {
      id: true,
      externalSourceUrl: true,
      oemReference: true,
      fitments: { select: { id: true, yearFrom: true } },
    },
    ...(limit ? { take: limit } : {}),
  })

  console.log(`[enrich] ${items.length} pièces à compléter`)
  let oemAdded = 0
  let yearsAdded = 0
  let failed = 0

  // Les écritures sont accumulées puis envoyées par lots : une par pièce, c'était
  // deux allers-retours vers db.prisma.io à chaque fiche, soit ~9 s l'unité au
  // lieu des 2 s du rate-limit réseau. Le lot ramène le coût DB à la marge.
  let pendingOem: { id: string; oemReference: string }[] = []
  let pendingYears: { ids: string[]; year: number }[] = []

  const flush = async (): Promise<void> => {
    if (pendingOem.length === 0 && pendingYears.length === 0) return
    const writes = [
      ...pendingOem.map((u) =>
        prisma.catalogItem.update({ where: { id: u.id }, data: { oemReference: u.oemReference } }),
      ),
      ...pendingYears.map((u) =>
        prisma.catalogItemFitment.updateMany({
          where: { id: { in: u.ids } },
          data: { yearFrom: u.year, yearTo: u.year },
        }),
      ),
    ]
    await withDbRetry('flush', () => prisma.$transaction(writes), reconnect)
    oemAdded += pendingOem.length
    yearsAdded += pendingYears.reduce((n, u) => n + u.ids.length, 0)
    pendingOem = []
    pendingYears = []
  }

  for (const [i, item] of items.entries()) {
    let detail
    try {
      detail = await fetchPartDetail(item.externalSourceUrl as string)
    } catch (err) {
      // Une fiche retirée (404) est normale sur un stock d'occasion qui tourne :
      // on la compte et on continue, sans interrompre le lot.
      failed += 1
      if (failed <= 5) {
        console.warn(`[enrich] fiche KO ${item.externalSourceUrl}:`, err instanceof Error ? err.message : err)
      }
      continue
    }

    if (detail.oemReference && !item.oemReference) {
      pendingOem.push({ id: item.id, oemReference: detail.oemReference })
    }
    if (detail.year) {
      const stale = item.fitments.filter((f) => f.yearFrom == null).map((f) => f.id)
      if (stale.length > 0) pendingYears.push({ ids: stale, year: detail.year })
    }

    if ((i + 1) % flushEvery === 0) await flush()
    if ((i + 1) % logEvery === 0) {
      console.log(`[enrich] ${i + 1}/${items.length} — +${oemAdded} OEM, +${yearsAdded} années, ${failed} KO`)
    }
  }
  await flush()

  console.log(`[enrich] terminé — +${oemAdded} réfs OEM, +${yearsAdded} fitments datés, ${failed} fiches KO`)
  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
