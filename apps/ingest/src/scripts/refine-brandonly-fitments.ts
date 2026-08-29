/**
 * Reprise des fitments « marque seule » : remplace les fitments sans modèle par
 * les modèles désormais reconnus dans le titre de l'annonce.
 *
 * Pourquoi : côté filtrage acheteur (`browseParts`), un fitment sans modèle est
 * INCLUSIF — il matche tous les modèles de la marque. « Filtre à huile Suzuki
 * Baleno » stocké en `SUZUKI / —` remontait donc pour une Suzuki Ertiga. Depuis
 * l'enrichissement du référentiel et du matching (`extractFitmentsFromName`), ces
 * titres livrent leur modèle : on rejoue l'extraction sur l'existant.
 *
 * Garde-fou : ne touche QU'AUX fitments entièrement vides (model, yearFrom et
 * yearTo à null), c'est-à-dire ceux produits par le backfill depuis un titre —
 * jamais un fitment saisi à la main par un vendeur ou l'admin. Un fitment marque
 * seule dont le titre ne nomme aucun modèle (« Filtre à Air Toyota ») est laissé
 * tel quel : il est légitimement générique.
 *
 * Idempotent (une fois le modèle écrit, l'article n'est plus candidat).
 * Dry-run par défaut — n'écrit qu'avec `--commit`.
 *
 *   pnpm -F ingest tsx src/scripts/refine-brandonly-fitments.ts            # dry-run
 *   DATABASE_URL='postgres://…prod…' \
 *     pnpm -F ingest tsx src/scripts/refine-brandonly-fitments.ts --commit # écriture
 */
import { extractFitmentsFromName } from 'shared/constants'
import { prisma } from '../lib/prisma.ts'

async function main(): Promise<void> {
  const commit = process.argv.includes('--commit')
  console.log(`[refine-fitments] mode = ${commit ? 'COMMIT (écriture)' : 'DRY-RUN (lecture seule)'}`)
  console.log(`[refine-fitments] DATABASE_URL host = ${dbHost()}`)

  const items = await prisma.catalogItem.findMany({
    where: { fitments: { some: { model: null, yearFrom: null, yearTo: null } } },
    select: {
      id: true,
      name: true,
      status: true,
      fitments: { select: { id: true, brand: true, model: true, yearFrom: true, yearTo: true } },
    },
  })
  console.log(`[refine-fitments] ${items.length} articles avec au moins un fitment marque seule`)

  const toDelete: string[] = []
  const toInsert: { catalogItemId: string; brand: string; model: string; yearFrom: null; yearTo: null }[] = []
  const sample: string[] = []
  let refined = 0
  let leftGeneric = 0

  for (const item of items) {
    const derived = extractFitmentsFromName(item.name)
    let touched = false

    for (const fitment of item.fitments) {
      const isBrandOnly = fitment.model === null && fitment.yearFrom === null && fitment.yearTo === null
      if (!isBrandOnly) continue

      // Modèles trouvés dans le titre pour CETTE marque, dédupliqués.
      const models = [
        ...new Set(
          derived
            .filter((d) => d.brand.toUpperCase() === fitment.brand.toUpperCase() && d.model)
            .map((d) => d.model as string),
        ),
      ]
      if (models.length === 0) {
        leftGeneric += 1
        continue
      }

      toDelete.push(fitment.id)
      for (const model of models) {
        toInsert.push({ catalogItemId: item.id, brand: fitment.brand, model, yearFrom: null, yearTo: null })
      }
      touched = true
      if (sample.length < 40) {
        sample.push(`  "${item.name}" : ${fitment.brand} / — → ${models.join(' + ')}`)
      }
    }

    if (touched) refined += 1
  }

  if (commit && toDelete.length > 0) {
    await prisma.catalogItemFitment.deleteMany({ where: { id: { in: toDelete } } })
    await prisma.catalogItemFitment.createMany({ data: toInsert, skipDuplicates: true })
  }

  console.log(`\n[refine-fitments] résumé :`)
  console.log(`  articles précisés            : ${refined}`)
  console.log(`  fitments marque seule levés  : ${toDelete.length}`)
  console.log(`  fitments modèle écrits       : ${commit ? toInsert.length : `${toInsert.length} (dry-run)`}`)
  console.log(`  laissés génériques (titre sans modèle) : ${leftGeneric}`)
  if (sample.length > 0) {
    console.log(`\n[refine-fitments] échantillon :`)
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
