import { prisma } from '../lib/prisma.ts'
import { slugify } from '../lib/slugify.ts'
import { CI_MARQUES } from '../data/ci-marques.ts'
import { fetchModelsForMake } from '../sources/nhtsa.ts'

export type VehicleStats = {
  makes: number
  models: number
  skippedDuplicates: number
}

export async function ingestNhtsaVehicles(opts: { dryRun?: boolean } = {}): Promise<VehicleStats> {
  const stats: VehicleStats = { makes: 0, models: 0, skippedDuplicates: 0 }
  for (const marque of CI_MARQUES) {
    let makeId: string | null = null
    if (!opts.dryRun) {
      const upserted = await prisma.vehicleMake.upsert({
        where: { slug: marque.slug },
        create: {
          name: marque.name,
          slug: marque.slug,
          country: marque.country,
          popularityCi: marque.popularityCi,
        },
        update: {
          name: marque.name,
          country: marque.country,
          popularityCi: marque.popularityCi,
        },
      })
      makeId = upserted.id
    }
    stats.makes += 1
    const rows = await fetchModelsForMake(marque.name)
    const seenSlugs = new Set<string>()
    for (const row of rows) {
      const modelSlug = slugify(row.Model_Name)
      if (!modelSlug) continue
      if (seenSlugs.has(modelSlug)) {
        stats.skippedDuplicates += 1
        continue
      }
      seenSlugs.add(modelSlug)
      if (!opts.dryRun && makeId) {
        await prisma.vehicleModel.upsert({
          where: { uq_vehicle_model_make_slug: { makeId, slug: modelSlug } },
          create: { makeId, name: row.Model_Name, slug: modelSlug },
          update: { name: row.Model_Name },
        })
      }
      stats.models += 1
    }
    console.log(`[nhtsa] ${marque.name}: ${rows.length} rows, ${seenSlugs.size} unique models`)
  }
  return stats
}
