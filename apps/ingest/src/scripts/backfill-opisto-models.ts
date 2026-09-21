/**
 * Reprise des modèles Opisto : remplace le modèle déduit du slug d'URL par celui
 * lu dans le libellé du véhicule donneur.
 *
 * Pourquoi : `parseDetailSlug()` lit le modèle dans le slug de la fiche produit
 * (`…/alternateur-peugeot-208-1-2020`). Quand le slug ne porte pas le marqueur
 * de marque, ce qui suit est la désignation commerciale de la casse, pas un
 * modèle — d'où des fitments `PEUGEOT / "Berlina S1 S2 Srdt"` (le libellé dit
 * « PEUGEOT 406 ») ou `TOYOTA / "10 KGB10"` (« TOYOTA AYGO »). Le même défaut
 * tronque « SANTA FE » en « Santa » et « RAV 4 » en « Rav ».
 *
 * Un modèle faux ou tronqué ne matche AUCUN filtre acheteur : la pièce existe au
 * catalogue mais reste introuvable par le parcours véhicule.
 *
 * `vehicle_compatibility` porte le libellé de listing, qui nomme le véhicule tel
 * qu'Opisto le désigne (« HYUNDAI SANTA FE (SM) Diesel 2000 cm3 ») : c'est la
 * meilleure source disponible, et elle est déjà en base — aucune requête réseau.
 *
 * Garde-fous :
 * - n'écrit QUE si `extractFitmentsFromName()` rend un modèle DU RÉFÉRENTIEL
 *   (`VEHICLE_BRANDS`) : on ne remplace pas un modèle douteux par un autre ;
 * - n'écrit QUE sur la marque déjà portée par le fitment — la marque Opisto est
 *   fiable (0 écart sur 5 472 relevé en base), on ne la rejoue pas ;
 * - un libellé qui résout PLUSIEURS modèles pour la marque est ambigu : ignoré ;
 * - `yearFrom`, `yearTo` et `engine` ne sont jamais touchés. Ce script corrige le
 *   modèle, il ne fabrique pas de compatibilité.
 *
 * Idempotent (une fois le modèle canonique écrit, la ligne n'est plus candidate).
 * Dry-run par défaut — n'écrit qu'avec `--commit`.
 *
 *   pnpm -F ingest tsx src/scripts/backfill-opisto-models.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/backfill-opisto-models.ts --commit # écriture
 */
import { VEHICLE_BRANDS, extractFitmentsFromName } from 'shared/constants'
import { EXTERNAL_SOURCE_SLUG } from '../normalizers/opisto.ts'
import { withDbRetry } from '../pipeline/opisto.ts'
import { prisma } from '../lib/prisma.ts'

/** Écritures par lots : une transaction de 100 updates tient largement. */
const CHUNK = 100

/** Le référentiel connaît-il ce couple marque / modèle ? */
function isKnownModel(brand: string, model: string): boolean {
  return Boolean(VEHICLE_BRANDS[brand.toUpperCase()]?.models?.[model])
}

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[opisto-models] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[opisto-models] DATABASE_URL host = ${dbHost()}`)

  const fitments = await prisma.catalogItemFitment.findMany({
    where: { catalogItem: { externalSource: EXTERNAL_SOURCE_SLUG } },
    select: {
      id: true,
      brand: true,
      model: true,
      catalogItem: { select: { vehicleCompatibility: true } },
    },
  })
  console.log(`[opisto-models] ${fitments.length} fitments Opisto examinés`)

  const updates: { id: string; model: string }[] = []
  const sample: string[] = []
  let alreadyCanonical = 0
  let unresolved = 0
  let rejectedUnknown = 0
  let ambiguous = 0

  for (const fitment of fitments) {
    const label = fitment.catalogItem.vehicleCompatibility
    if (!label) {
      unresolved += 1
      continue
    }

    // Modèles que le libellé nomme POUR CETTE MARQUE, dédupliqués.
    const models = [
      ...new Set(
        extractFitmentsFromName(label)
          .filter((d) => d.brand.toUpperCase() === fitment.brand.toUpperCase() && d.model)
          .map((d) => d.model as string),
      ),
    ]

    if (models.length === 0) {
      unresolved += 1
      continue
    }
    // Une pièce d'occasion vient d'un seul véhicule donneur : deux modèles dans
    // le libellé signifient qu'on ne sait pas lequel est le bon.
    if (models.length > 1) {
      ambiguous += 1
      continue
    }

    const resolved = models[0] as string
    if (resolved.toUpperCase() === (fitment.model ?? '').toUpperCase()) {
      alreadyCanonical += 1
      continue
    }
    if (!isKnownModel(fitment.brand, resolved)) {
      rejectedUnknown += 1
      continue
    }

    updates.push({ id: fitment.id, model: resolved })
    if (sample.length < 40) {
      sample.push(`  ${fitment.brand} / "${fitment.model ?? '—'}" → "${resolved}"   « ${label} »`)
    }
  }

  if (commit && updates.length > 0) {
    let written = 0
    for (let i = 0; i < updates.length; i += CHUNK) {
      const chunk = updates.slice(i, i + CHUNK)
      await withDbRetry(
        `modèles ${i + 1}-${i + chunk.length}`,
        () =>
          prisma.$transaction(
            chunk.map((u) =>
              prisma.catalogItemFitment.update({ where: { id: u.id }, data: { model: u.model } }),
            ),
          ),
        () => prisma.$disconnect(),
      )
      written += chunk.length
      console.log(`[opisto-models] ${written}/${updates.length} modèles corrigés`)
    }
  }

  console.log(`\n[opisto-models] résumé :`)
  console.log(`  modèles corrigés             : ${commit ? updates.length : `${updates.length} (dry-run)`}`)
  console.log(`  déjà canoniques              : ${alreadyCanonical}`)
  console.log(`  libellé sans modèle connu    : ${unresolved}`)
  console.log(`  résolution hors référentiel  : ${rejectedUnknown}`)
  console.log(`  libellé ambigu (2+ modèles)  : ${ambiguous}`)
  if (sample.length > 0) {
    console.log(`\n[opisto-models] échantillon :`)
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
