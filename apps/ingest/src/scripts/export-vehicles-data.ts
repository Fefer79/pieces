/**
 * Exporte le catalogue véhicules de la BASE (tables vehicle_makes / models /
 * generations / engines, peuplées par l'ingest Global Auto) vers le fichier
 * statique `packages/shared/constants/vehicles-data.ts` consommé par le
 * sélecteur de véhicule du front.
 *
 * On fige ainsi la donnée : à relancer après chaque re-scrape Global Auto.
 *
 *   pnpm -F ingest export:vehicles
 *
 * Choix de format (validés produit) :
 *  - Marques en MAJUSCULES, telles qu'en base (cohérent avec les fitments des
 *    pièces ; le filtrage de compatibilité reste insensible à la casse).
 *  - Motorisations = libellés Global Auto bruts, dédupliqués par modèle.
 *  - On n'exporte que les entrées exploitables (modèles dotés de générations),
 *    ce qui écarte les seeds NHTSA résiduels sans données de millésime.
 */
import { writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prisma } from '../lib/prisma.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../../../../packages/shared/constants/vehicles-data.ts')

/** ~6 % des générations GA ont un yearStart manquant (= 0) : on plancher ici. */
const MIN_YEAR = 1980

interface EngineRow {
  code: string | null
  displacementCc: number | null
  fuelType: string | null
}
interface ModelEntry {
  years: number[]
  engines: string[]
}
type VehiclesData = Record<string, { models: Record<string, ModelEntry> }>

/** Libellé moteur : le code GA brut, sinon une dérivation cylindrée + carburant. */
function engineLabel(e: EngineRow): string | null {
  const code = e.code?.trim()
  if (code) return code
  const parts = [e.displacementCc ? `${(e.displacementCc / 1000).toFixed(1)}L` : null, e.fuelType].filter(Boolean)
  return parts.length ? parts.join(' ') : null
}

/** Sérialisation compacte mirroir du format existant (arrays en ligne). */
function serialize(data: VehiclesData): string {
  const brandEntries = Object.entries(data)
  const out: string[] = ['export default {']
  brandEntries.forEach(([brand, { models }], bi) => {
    out.push(`  ${JSON.stringify(brand)}: {`)
    out.push('    "models": {')
    const modelEntries = Object.entries(models)
    modelEntries.forEach(([m, entry], mi) => {
      const years = `[${entry.years.join(',')}]`
      const engines = `[${entry.engines.map((e) => JSON.stringify(e)).join(',')}]`
      out.push(`      ${JSON.stringify(m)}: {`)
      out.push(`        "years": ${years},`)
      out.push(`        "engines": ${engines}`)
      out.push(`      }${mi < modelEntries.length - 1 ? ',' : ''}`)
    })
    out.push('    }')
    out.push(`  }${bi < brandEntries.length - 1 ? ',' : ''}`)
  })
  out.push('}')
  return out.join('\n')
}

async function main(): Promise<void> {
  const maxYear = new Date().getFullYear()

  const makes = await prisma.vehicleMake.findMany({
    where: { models: { some: { generations: { some: {} } } } },
    orderBy: { name: 'asc' },
    select: {
      name: true,
      models: {
        where: { generations: { some: {} } },
        orderBy: { name: 'asc' },
        select: {
          name: true,
          generations: {
            select: {
              yearStart: true,
              yearEnd: true,
              engines: { select: { code: true, displacementCc: true, fuelType: true } },
            },
          },
        },
      },
    },
  })

  const data: VehiclesData = {}
  let modelCount = 0
  let engineCount = 0

  for (const make of makes) {
    const models: Record<string, ModelEntry> = {}
    for (const model of make.models) {
      const years = new Set<number>()
      const engines = new Set<string>()
      for (const g of model.generations) {
        const start = Math.max(g.yearStart, MIN_YEAR)
        const end = Math.min(g.yearEnd ?? maxYear, maxYear)
        for (let y = start; y <= end; y++) years.add(y)
        for (const e of g.engines) {
          const label = engineLabel(e)
          if (label) engines.add(label)
        }
      }
      // Modèles homonymes (rare) : on fusionne au lieu d'écraser.
      const existing = models[model.name]
      const mergedYears = existing ? new Set([...existing.years, ...years]) : years
      const mergedEngines = existing ? new Set([...existing.engines, ...engines]) : engines
      if (!existing) modelCount++
      models[model.name] = {
        years: [...mergedYears].sort((a, b) => a - b),
        engines: [...mergedEngines].sort((a, b) => a.localeCompare(b, 'fr')),
      }
    }
    for (const m of Object.values(models)) engineCount += m.engines.length
    data[make.name] = { models }
  }

  const header =
    '// AUTO-GÉNÉRÉ — ne pas éditer à la main.\n' +
    '// Catalogue véhicules figé depuis la base de données.\n' +
    '// Régénérer : pnpm -F ingest export:vehicles\n'
  await writeFile(OUT, `${header}${serialize(data)}\n`, 'utf8')

  console.log(`✓ écrit ${OUT}`)
  console.log(`  marques: ${Object.keys(data).length} · modèles: ${modelCount} · motorisations cumulées: ${engineCount}`)

  await prisma.$disconnect()
}

main().catch((err: unknown) => {
  console.error(err)
  process.exitCode = 1
})
