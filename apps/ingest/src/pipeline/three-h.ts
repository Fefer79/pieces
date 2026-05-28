import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchProductUrls, fetchProduct } from '../sources/three-h.ts'
import { normalizeThreeHProduct, type ThreeHNormalized } from '../normalizers/three-h.ts'

export type ThreeHStats = {
  urls: number
  fetched: number
  normalized: number
  skippedNoJsonLd: number
  skippedNoName: number
  errors: number
  outputPath: string | null
}

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestThreeH(opts: { dryRun?: boolean; limit?: number } = {}): Promise<ThreeHStats> {
  const dryRun = opts.dryRun ?? true
  const stats: ThreeHStats = {
    urls: 0,
    fetched: 0,
    normalized: 0,
    skippedNoJsonLd: 0,
    skippedNoName: 0,
    errors: 0,
    outputPath: null,
  }
  const urls = await fetchProductUrls()
  stats.urls = urls.length
  const targets = opts.limit ? urls.slice(0, opts.limit) : urls
  console.log(`[3h] ${urls.length} produits dans sitemap, traitement de ${targets.length}`)
  const normalized: ThreeHNormalized[] = []
  for (const url of targets) {
    try {
      const raw = await fetchProduct(url)
      stats.fetched += 1
      if (!raw) {
        stats.skippedNoJsonLd += 1
        continue
      }
      const item = normalizeThreeHProduct(raw)
      if (!item) {
        stats.skippedNoName += 1
        continue
      }
      normalized.push(item)
      stats.normalized += 1
      if (stats.normalized % 25 === 0) {
        console.log(`[3h] ${stats.normalized}/${targets.length} normalisés`)
      }
    } catch (err) {
      stats.errors += 1
      console.warn(`[3h] erreur sur ${url}:`, err instanceof Error ? err.message : err)
    }
  }
  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `3hautoparts-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify({ source: '3hautoparts', fetchedAt: new Date().toISOString(), count: normalized.length, items: normalized }, null, 2),
      'utf8'
    )
    stats.outputPath = outPath
    console.log(`[3h] dump écrit dans ${outPath}`)
  }
  return stats
}
