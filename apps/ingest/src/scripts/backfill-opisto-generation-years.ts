/**
 * Datation des fitments Opisto par génération, depuis le code châssis du libellé.
 *
 * Lit `(T25)`, `(_E12_)`, `(JT, TE, TD)` dans `vehicle_compatibility` et écrit la
 * plage d'années de la génération correspondante, d'après la table curée
 * `data/opisto-generations.ts`.
 *
 * Garde-fous :
 * - n'écrit QUE depuis une entrée `verified: true`. La table livrée est
 *   entièrement `false` : tant qu'elle n'est pas relue, ce script écrit zéro
 *   ligne et se contente de chiffrer le gain en attente ;
 * - ne touche QUE les fitments sans année (`yearFrom: null`) — un millésime
 *   exact déjà obtenu par `enrich:opisto` prime toujours sur une plage ;
 * - marque + modèle du fitment doivent correspondre à l'entrée : le code seul ne
 *   suffit pas (« RD » est une Hyundai Coupe ET une Lantra) ;
 * - un libellé dont les jetons touchent DEUX entrées est ambigu : ignoré ;
 * - `engine` n'est pas touché.
 *
 * ⚠ INTERACTION AVEC `enrich:opisto --prune` — la purge supprime tout fitment
 * sans année OU sans motorisation. Les fitments datés ici n'ont pas de
 * motorisation : la purge les effacerait au passage suivant. Ajuster sa
 * condition (purger sur année manquante seule) avant de lancer ce backfill en
 * écriture, sinon le gain est perdu au run suivant.
 *
 * Idempotent. Dry-run par défaut — n'écrit qu'avec `--commit`.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-opisto-generation-years.ts
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-opisto-generation-years.ts --commit
 */
import { OPISTO_GENERATIONS, type OpistoGeneration } from '../data/opisto-generations.ts'
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/opisto.ts'
import { withDbRetry } from '../pipeline/opisto.ts'
import { prisma } from '../lib/prisma.ts'

const CHUNK = 100

/** Jetons de code châssis du libellé : « (JT, TE, TD) » → ['JT','TE','TD']. */
export function chassisTokens(label: string | null | undefined): string[] {
  if (!label) return []
  const inner = /\(([A-Z0-9_/,; -]{1,20})\)/.exec(label.toUpperCase())?.[1]
  if (!inner) return []
  return inner
    .split(/[/,;]/)
    .map((t) => t.replace(/_/g, '').trim())
    .filter(Boolean)
}

/** Entrées de la table compatibles avec ce fitment, sur marque + modèle + jeton. */
export function matchGenerations(
  brand: string,
  model: string | null,
  tokens: string[],
  table: OpistoGeneration[] = OPISTO_GENERATIONS,
): OpistoGeneration[] {
  if (!model || tokens.length === 0) return []
  return table.filter(
    (g) =>
      g.brand.toUpperCase() === brand.toUpperCase() &&
      g.model.toUpperCase() === model.toUpperCase() &&
      g.codes.some((c) => tokens.includes(c.toUpperCase())),
  )
}

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[opisto-years] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[opisto-years] DATABASE_URL host = ${dbHost()}`)
  const verified = OPISTO_GENERATIONS.filter((g) => g.verified)
  console.log(
    `[opisto-years] table : ${OPISTO_GENERATIONS.length} générations, ${verified.length} vérifiées`,
  )

  const fitments = await prisma.catalogItemFitment.findMany({
    where: { catalogItem: { externalSource: EXTERNAL_SOURCE_SLUG }, yearFrom: null },
    select: {
      id: true,
      brand: true,
      model: true,
      catalogItem: { select: { vehicleCompatibility: true } },
    },
  })
  console.log(`[opisto-years] ${fitments.length} fitments sans année`)

  const updates: { id: string; from: number; to: number }[] = []
  const sample: string[] = []
  let noCode = 0
  let unknownGeneration = 0
  let ambiguous = 0
  let pendingReview = 0

  for (const fitment of fitments) {
    const label = fitment.catalogItem.vehicleCompatibility
    const tokens = chassisTokens(label)
    if (tokens.length === 0) {
      noCode += 1
      continue
    }

    const hits = matchGenerations(fitment.brand, fitment.model, tokens)
    if (hits.length === 0) {
      unknownGeneration += 1
      continue
    }
    if (hits.length > 1) {
      ambiguous += 1
      continue
    }

    const gen = hits[0] as OpistoGeneration
    if (!gen.verified) {
      pendingReview += 1
      continue
    }

    updates.push({ id: fitment.id, from: gen.yearFrom, to: gen.yearTo })
    if (sample.length < 30) {
      sample.push(`  ${gen.brand} ${gen.model} [${tokens.join('/')}] → ${gen.yearFrom}-${gen.yearTo}   « ${label} »`)
    }
  }

  if (commit && updates.length > 0) {
    let written = 0
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK)
      await withDbRetry(
        `années ${i + 1}-${i + chunk.length}`,
        () =>
          prisma.$transaction(
            chunk.map((u) =>
              prisma.catalogItemFitment.update({
                where: { id: u.id },
                data: { yearFrom: u.from, yearTo: u.to },
              }),
            ),
          ),
        () => prisma.$disconnect(),
      )
      written += chunk.length
      console.log(`[opisto-years] ${written}/${updates.length} fitments datés`)
    }
  }

  console.log(`\n[opisto-years] résumé :`)
  console.log(`  fitments datés               : ${commit ? updates.length : `${updates.length} (dry-run)`}`)
  console.log(`  en attente de relecture      : ${pendingReview}   ← gain si la table passe verified:true`)
  console.log(`  libellé sans code châssis    : ${noCode}`)
  console.log(`  code hors table              : ${unknownGeneration}`)
  console.log(`  code ambigu (2+ entrées)     : ${ambiguous}`)
  if (sample.length > 0) {
    console.log(`\n[opisto-years] échantillon :`)
    for (const s of sample) console.log(s)
  }

  await prisma.$disconnect()
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
