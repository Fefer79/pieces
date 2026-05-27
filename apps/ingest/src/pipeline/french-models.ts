import { prisma } from '../lib/prisma.ts'
import { slugify } from '../lib/slugify.ts'
import { CI_FRENCH_MODELS } from '../data/ci-french-models.ts'

export type FrenchStats = {
  inserted: number
  updated: number
  skippedNoMake: number
}

export async function ingestFrenchModels(opts: { dryRun?: boolean } = {}): Promise<FrenchStats> {
  const stats: FrenchStats = { inserted: 0, updated: 0, skippedNoMake: 0 }
  const makeCache = new Map<string, string>()
  for (const model of CI_FRENCH_MODELS) {
    let makeId = makeCache.get(model.makeSlug)
    if (!makeId) {
      const make = await prisma.vehicleMake.findUnique({ where: { slug: model.makeSlug }, select: { id: true } })
      if (!make) {
        stats.skippedNoMake += 1
        continue
      }
      makeId = make.id
      makeCache.set(model.makeSlug, makeId)
    }
    const slug = slugify(model.name)
    if (opts.dryRun) {
      stats.inserted += 1
      continue
    }
    const existing = await prisma.vehicleModel.findUnique({
      where: { uq_vehicle_model_make_slug: { makeId, slug } },
      select: { id: true },
    })
    if (existing) {
      await prisma.vehicleModel.update({
        where: { id: existing.id },
        data: { yearStart: model.yearStart, yearEnd: model.yearEnd, name: model.name },
      })
      stats.updated += 1
    } else {
      await prisma.vehicleModel.create({
        data: { makeId, name: model.name, slug, yearStart: model.yearStart, yearEnd: model.yearEnd },
      })
      stats.inserted += 1
    }
  }
  return stats
}
