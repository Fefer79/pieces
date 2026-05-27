import { prisma } from '../lib/prisma.ts'
import { fetchAbidjanAutoShops } from '../sources/osm.ts'
import { normalizeOsmShop } from '../normalizers/osm.ts'

export type IngestStats = {
  fetched: number
  normalized: number
  upserted: number
  skipped: number
}

export async function ingestOsmAbidjan(opts: { dryRun?: boolean } = {}): Promise<IngestStats> {
  const elements = await fetchAbidjanAutoShops()
  const stats: IngestStats = { fetched: elements.length, normalized: 0, upserted: 0, skipped: 0 }
  for (const el of elements) {
    const input = normalizeOsmShop(el)
    if (!input) {
      stats.skipped += 1
      continue
    }
    stats.normalized += 1
    if (opts.dryRun) continue
    await prisma.competitorVendor.upsert({
      where: { osmId: input.osmId },
      create: input,
      update: {
        name: input.name,
        phone: input.phone,
        websiteUrl: input.websiteUrl,
        address: input.address,
        zone: input.zone,
        commune: input.commune,
        lat: input.lat,
        lng: input.lng,
        specialties: input.specialties,
        estimatedSize: input.estimatedSize,
      },
    })
    stats.upserted += 1
  }
  return stats
}
