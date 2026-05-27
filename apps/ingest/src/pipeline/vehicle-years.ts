import { prisma } from '../lib/prisma.ts'
import { slugify } from '../lib/slugify.ts'
import { CI_MARQUES } from '../data/ci-marques.ts'
import { fetchModelsForMakeYear } from '../sources/nhtsa-year.ts'

const YEAR_ANCHORS = [2000, 2005, 2010, 2015, 2020, 2025] as const

export type YearStats = {
  makes: number
  enriched: number
  notFound: number
}

export async function enrichVehicleYears(opts: { dryRun?: boolean } = {}): Promise<YearStats> {
  const stats: YearStats = { makes: 0, enriched: 0, notFound: 0 }
  for (const marque of CI_MARQUES) {
    stats.makes += 1
    const make = await prisma.vehicleMake.findUnique({ where: { slug: marque.slug }, select: { id: true } })
    if (!make) {
      console.log(`[nhtsa-year] ${marque.name}: make not found, run --source=nhtsa first`)
      continue
    }
    const yearByModel = new Map<string, number[]>()
    for (const year of YEAR_ANCHORS) {
      const names = await fetchModelsForMakeYear(marque.name, year)
      for (const name of names) {
        const slug = slugify(name)
        if (!slug) continue
        const years = yearByModel.get(slug) ?? []
        years.push(year)
        yearByModel.set(slug, years)
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    console.log(`[nhtsa-year] ${marque.name}: ${yearByModel.size} models with year anchors`)
    for (const [slug, years] of yearByModel) {
      const yearStart = Math.min(...years)
      const yearEnd = Math.max(...years) === 2025 ? null : Math.max(...years)
      if (!opts.dryRun) {
        const updated = await prisma.vehicleModel.updateMany({
          where: { makeId: make.id, slug },
          data: { yearStart, yearEnd },
        })
        if (updated.count > 0) stats.enriched += 1
        else stats.notFound += 1
      } else {
        stats.enriched += 1
      }
    }
  }
  return stats
}
