import { parseArgs } from 'node:util'
import { ingestOsmAbidjan } from './pipeline/competitor.ts'
import { ingestNhtsaVehicles } from './pipeline/vehicles.ts'
import { enrichVehicleYears } from './pipeline/vehicle-years.ts'
import { ingestFrenchModels } from './pipeline/french-models.ts'
import { ingestThreeH } from './pipeline/three-h.ts'

type SourceName = 'osm' | 'nhtsa' | 'nhtsa-year' | 'french-models' | '3h'

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', short: 's' },
      'dry-run': { type: 'boolean', default: false },
      commit: { type: 'boolean', default: false },
      limit: { type: 'string' },
    },
  })
  const source = values.source as SourceName | undefined
  const dryRun = values['dry-run'] ?? false
  const commit = values.commit ?? false
  const limit = values.limit ? Number.parseInt(values.limit, 10) : undefined
  if (!source) {
    console.error('Usage: pnpm -F ingest ingest --source=<osm|nhtsa|nhtsa-year|french-models|3h> [--dry-run|--commit] [--limit=N]')
    process.exit(1)
  }
  switch (source) {
    case 'osm': {
      console.log(`[ingest] osm abidjan ${dryRun ? '(dry-run)' : ''}`)
      const stats = await ingestOsmAbidjan({ dryRun })
      console.log('[ingest] done', stats)
      break
    }
    case 'nhtsa': {
      console.log(`[ingest] nhtsa vehicles ${dryRun ? '(dry-run)' : ''}`)
      const stats = await ingestNhtsaVehicles({ dryRun })
      console.log('[ingest] done', stats)
      break
    }
    case 'nhtsa-year': {
      console.log(`[ingest] nhtsa year enrichment ${dryRun ? '(dry-run)' : ''}`)
      const stats = await enrichVehicleYears({ dryRun })
      console.log('[ingest] done', stats)
      break
    }
    case 'french-models': {
      console.log(`[ingest] french supplementary models ${dryRun ? '(dry-run)' : ''}`)
      const stats = await ingestFrenchModels({ dryRun })
      console.log('[ingest] done', stats)
      break
    }
    case '3h': {
      const effectiveDryRun = commit ? false : true
      const mode = commit ? '(commit)' : '(dry-run)'
      console.log(`[ingest] 3h autoparts ${mode}${limit ? ` limit=${limit}` : ''}`)
      const stats = await ingestThreeH({ dryRun: effectiveDryRun, limit })
      console.log('[ingest] done', stats)
      break
    }
    default: {
      const exhaustive: never = source
      console.error(`Unknown source: ${exhaustive as string}`)
      process.exit(1)
    }
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
