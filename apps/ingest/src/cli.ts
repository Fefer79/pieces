import { parseArgs } from 'node:util'
import { ingestOsmAbidjan } from './pipeline/competitor.ts'

type SourceName = 'osm'

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      source: { type: 'string', short: 's' },
      'dry-run': { type: 'boolean', default: false },
    },
  })
  const source = values.source as SourceName | undefined
  const dryRun = values['dry-run'] ?? false
  if (!source) {
    console.error('Usage: pnpm -F ingest ingest --source=<osm> [--dry-run]')
    process.exit(1)
  }
  switch (source) {
    case 'osm': {
      console.log(`[ingest] osm abidjan ${dryRun ? '(dry-run)' : ''}`)
      const stats = await ingestOsmAbidjan({ dryRun })
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
