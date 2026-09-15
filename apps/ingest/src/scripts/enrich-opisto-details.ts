/**
 * Enrichit les pièces Opisto depuis leur fiche produit, et fait respecter la
 * règle des fitments.
 *
 * RÈGLE — un fitment Opisto doit porter année ET motorisation. Sans l'une des
 * deux, le filtre de compatibilité ne peut rien en faire, et une compatibilité
 * approximative sur une pièce d'occasion fait vendre la mauvaise pièce. Un
 * fitment incomplet est donc supprimé plutôt que conservé.
 *
 * Le listing ne suffit pas : il ne donne la référence OEM que dans ~3 % des cas,
 * l'année une fois sur deux, et pas toujours la cylindrée. La fiche produit porte
 * les trois (`mpn`, date de mise en circulation, désignation commerciale).
 *
 * Une requête par fiche, au rate-limit de `fetchText`, écritures par lots.
 * REPRENABLE : seules les lignes encore incomplètes sont sélectionnées.
 *
 *   pnpm -F ingest enrich:opisto -- --limit=50   # essai
 *   pnpm -F ingest enrich:opisto                 # tout le reliquat
 *   pnpm -F ingest enrich:opisto -- --prune      # + purge des fitments incomplets
 */
import { parseArgs } from 'node:util'
import { getEngines } from 'shared/constants'
import { fetchPartDetail } from '../sources/opisto.ts'
import { EXTERNAL_SOURCE_SLUG, resolveEngine, resolveModel } from '../normalizers/opisto.ts'
import { OPISTO_BRAND_TARGETS } from '../data/opisto-targets.ts'
import { withDbRetry } from '../pipeline/opisto.ts'
import { prisma } from '../lib/prisma.ts'

const reconnect = () => prisma.$disconnect()

/** Marque cible dont le slug apparaît dans l'URL de la fiche. */
function brandFromUrl(url: string): { brand: string; slug: string } | null {
  const hit = OPISTO_BRAND_TARGETS.find((b) => url.includes(`-${b.slug}-`) || url.endsWith(`-${b.slug}`))
  return hit ? { brand: hit.brand, slug: hit.slug } : null
}

/**
 * Complète la motorisation depuis le libellé déjà en base, sans réseau.
 *
 * `vehicle_compatibility` porte le libellé de listing (« … 1.5 BLUE HDI … 1499 cm3 »),
 * dont 77 % contiennent une cylindrée. Faire ce passage AVANT la passe réseau
 * évite de redemander à Opisto ce qu'on a déjà, et complète d'un coup tous les
 * fitments qui avaient déjà leur année.
 */
async function backfillEnginesFromLabels(): Promise<{ filled: number; scanned: number }> {
  const rows = await prisma.catalogItemFitment.findMany({
    where: {
      engine: null,
      yearFrom: { not: null },
      catalogItem: { externalSource: EXTERNAL_SOURCE_SLUG },
    },
    select: {
      id: true,
      brand: true,
      model: true,
      yearFrom: true,
      catalogItem: { select: { vehicleCompatibility: true } },
    },
  })

  let filled = 0
  const CHUNK = 100
  for (let i = 0; i < rows.length; i += CHUNK) {
    const writes = rows.slice(i, i + CHUNK).flatMap((r) => {
      const engine = resolveEngine(
        getEngines(r.brand, r.model ?? '', r.yearFrom),
        r.catalogItem.vehicleCompatibility,
      )
      if (!engine) return []
      return [prisma.catalogItemFitment.update({ where: { id: r.id }, data: { engine } })]
    })
    if (writes.length === 0) continue
    await withDbRetry('backfill motorisations', () => prisma.$transaction(writes), reconnect)
    filled += writes.length
    console.log(`[enrich] motorisations depuis le libellé : ${filled} complétées`)
  }
  return { filled, scanned: rows.length }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      limit: { type: 'string' },
      'log-every': { type: 'string' },
      'flush-every': { type: 'string' },
      prune: { type: 'boolean', default: false },
    },
  })
  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined
  const logEvery = values['log-every'] ? Number.parseInt(values['log-every'], 10) : 250
  const flushEvery = values['flush-every'] ? Number.parseInt(values['flush-every'], 10) : 50

  // D'abord ce qu'on peut faire sans réseau.
  const local = await backfillEnginesFromLabels()
  console.log(
    `[enrich] libellés — ${local.filled}/${local.scanned} motorisations déduites sans requête réseau`,
  )

  const items = await prisma.catalogItem.findMany({
    where: {
      externalSource: EXTERNAL_SOURCE_SLUG,
      externalSourceUrl: { not: null },
      OR: [
        { oemReference: null },
        { fitments: { none: {} } },
        { fitments: { some: { OR: [{ yearFrom: null }, { engine: null }] } } },
      ],
    },
    select: {
      id: true,
      externalSourceUrl: true,
      oemReference: true,
      fitments: { select: { id: true, brand: true, model: true, yearFrom: true, engine: true } },
    },
    ...(limit ? { take: limit } : {}),
  })

  console.log(`[enrich] ${items.length} pièces à compléter`)
  let oem = 0
  let fitmentsUpdated = 0
  let fitmentsCreated = 0
  let failed = 0
  let noYear = 0
  let noEngine = 0

  type Write = { kind: 'oem'; id: string; value: string }
    | { kind: 'fitment'; id: string; year: number; engine: string }
    | { kind: 'create'; itemId: string; brand: string; model: string; year: number; engine: string }
  let pending: Write[] = []

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return
    const batch = pending
    pending = []
    await withDbRetry(
      'flush',
      () =>
        prisma.$transaction(
          batch.map((w) => {
            if (w.kind === 'oem') {
              return prisma.catalogItem.update({ where: { id: w.id }, data: { oemReference: w.value } })
            }
            if (w.kind === 'fitment') {
              return prisma.catalogItemFitment.update({
                where: { id: w.id },
                data: { yearFrom: w.year, yearTo: w.year, engine: w.engine },
              })
            }
            return prisma.catalogItemFitment.create({
              data: {
                catalogItemId: w.itemId,
                brand: w.brand,
                model: w.model,
                engine: w.engine,
                yearFrom: w.year,
                yearTo: w.year,
              },
            })
          }),
        ),
      reconnect,
    )
    oem += batch.filter((w) => w.kind === 'oem').length
    fitmentsUpdated += batch.filter((w) => w.kind === 'fitment').length
    fitmentsCreated += batch.filter((w) => w.kind === 'create').length
  }

  for (const [i, item] of items.entries()) {
    const url = item.externalSourceUrl as string
    let detail
    try {
      detail = await fetchPartDetail(url)
    } catch (err) {
      // Une fiche retirée (404) est normale sur un stock d'occasion qui tourne.
      failed += 1
      if (failed <= 5) console.warn(`[enrich] fiche KO ${url}:`, err instanceof Error ? err.message : err)
      continue
    }

    if (detail.oemReference && !item.oemReference) {
      pending.push({ kind: 'oem', id: item.id, value: detail.oemReference })
    }

    if (!detail.year) noYear += 1

    const existing = item.fitments[0]
    const brandInfo = brandFromUrl(url)
    const brand = existing?.brand ?? brandInfo?.brand ?? null
    const model =
      existing?.model ??
      (brandInfo ? resolveModel(brandInfo.brand, url.split('/').pop()?.split(`-${brandInfo.slug}-`)[1] ?? '') : null)

    if (detail.year && brand && model) {
      const engine = resolveEngine(
        getEngines(brand, model, detail.year),
        detail.engineLabel,
        detail.displacementCc,
      )
      if (!engine) {
        noEngine += 1
      } else if (existing) {
        if (existing.yearFrom == null || existing.engine == null) {
          pending.push({ kind: 'fitment', id: existing.id, year: detail.year, engine })
        }
      } else {
        pending.push({ kind: 'create', itemId: item.id, brand, model, year: detail.year, engine })
      }
    }

    if ((i + 1) % flushEvery === 0) await flush()
    if ((i + 1) % logEvery === 0) {
      console.log(
        `[enrich] ${i + 1}/${items.length} — +${oem} OEM, ${fitmentsUpdated} fitments complétés, ${fitmentsCreated} créés, ${failed} KO`,
      )
    }
  }
  await flush()

  console.log(
    `[enrich] terminé — +${oem} réfs OEM, ${fitmentsUpdated} fitments complétés, ${fitmentsCreated} créés`,
  )
  console.log(`[enrich] non exploitables — ${noYear} sans année à la source, ${noEngine} sans motorisation`)

  if (values.prune) {
    const pruned = await withDbRetry(
      'purge',
      () =>
        prisma.catalogItemFitment.deleteMany({
          where: {
            catalogItem: { externalSource: EXTERNAL_SOURCE_SLUG },
            OR: [{ yearFrom: null }, { engine: null }],
          },
        }),
      reconnect,
    )
    console.log(`[enrich] purge — ${pruned.count} fitments incomplets supprimés`)
  }

  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
