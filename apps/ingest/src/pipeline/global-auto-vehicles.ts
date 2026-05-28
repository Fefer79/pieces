import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import {
  EXTERNAL_SOURCE,
  fetchMakes,
  fetchModels,
  fetchSeries,
  streamAllProducts,
  type GaMake,
  type GaModel,
  type GaSeries,
} from '../sources/global-auto.ts'
import { parseTrim, parseSeries, type FuelType } from '../normalizers/global-auto.ts'
import { slugify } from '../lib/slugify.ts'
import { prisma } from '../lib/prisma.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

interface TrimSeed {
  trimId: number
  trimName: string
  /** Series the trim belongs to (from product compatibility). */
  seriesId: number
}

export interface VehiclesStats {
  makes: number
  models: number
  series: number
  trims: number
  productsScanned: number
  pagesScanned: number
  outputPath: string | null
  upserted: { makes: number; models: number; generations: number; engines: number }
}

type VehiclePrisma = Pick<PrismaClient, 'vehicleMake' | 'vehicleModel' | 'vehicleGeneration' | 'vehicleEngine'>

export async function loadVehicleCatalog(
  data: {
    makes: GaMake[]
    modelsByMake: Map<number, GaModel[]>
    seriesByModel: Map<number, GaSeries[]>
    trims: TrimSeed[]
  },
  db: VehiclePrisma = prisma,
): Promise<{ makes: number; models: number; generations: number; engines: number }> {
  let upMakes = 0, upModels = 0, upGens = 0, upEngines = 0

  // 1. Upsert makes — keyed by GLOBAL_AUTO_CI + ga.id
  const makeIdByGa = new Map<number, string>()
  for (const m of data.makes) {
    const row = await db.vehicleMake.upsert({
      where: {
        uq_vehicle_makes_external: {
          externalSource: EXTERNAL_SOURCE,
          externalSourceId: String(m.id),
        },
      },
      create: {
        name: m.name,
        slug: slugify(m.name),
        externalSource: EXTERNAL_SOURCE,
        externalSourceId: String(m.id),
      },
      update: { name: m.name },
    })
    makeIdByGa.set(m.id, row.id)
    upMakes += 1
  }

  // 2. Upsert models
  const modelIdByGa = new Map<number, string>()
  for (const [gaMakeId, models] of data.modelsByMake) {
    const localMakeId = makeIdByGa.get(gaMakeId)
    if (!localMakeId) continue
    for (const m of models) {
      const row = await db.vehicleModel.upsert({
        where: {
          uq_vehicle_models_external: {
            externalSource: EXTERNAL_SOURCE,
            externalSourceId: String(m.id),
          },
        },
        create: {
          makeId: localMakeId,
          name: m.name,
          slug: slugify(m.name),
          externalSource: EXTERNAL_SOURCE,
          externalSourceId: String(m.id),
        },
        update: { name: m.name, makeId: localMakeId },
      })
      modelIdByGa.set(m.id, row.id)
      upModels += 1
    }
  }

  // 3. Upsert generations (series)
  const generationIdByGa = new Map<number, string>()
  for (const [gaModelId, seriesList] of data.seriesByModel) {
    const localModelId = modelIdByGa.get(gaModelId)
    if (!localModelId) continue
    for (const s of seriesList) {
      const parsed = parseSeries(s.name)
      const row = await db.vehicleGeneration.upsert({
        where: {
          uq_vehicle_generations_external: {
            externalSource: EXTERNAL_SOURCE,
            externalSourceId: String(s.id),
          },
        },
        create: {
          modelId: localModelId,
          code: parsed.code,
          // year_start is NOT NULL in schema — fall back to 0 sentinel when missing.
          yearStart: parsed.yearStart ?? 0,
          yearEnd: parsed.yearEnd,
          externalSource: EXTERNAL_SOURCE,
          externalSourceId: String(s.id),
        },
        update: {
          modelId: localModelId,
          code: parsed.code,
          yearStart: parsed.yearStart ?? 0,
          yearEnd: parsed.yearEnd,
        },
      })
      generationIdByGa.set(s.id, row.id)
      upGens += 1
    }
  }

  // 4. Upsert engines (trims). One DB row per unique global-auto trim_id.
  const seen = new Set<number>()
  for (const t of data.trims) {
    if (seen.has(t.trimId)) continue
    seen.add(t.trimId)
    const localGenId = generationIdByGa.get(t.seriesId)
    if (!localGenId) continue
    const parsed = parseTrim(t.trimName)
    await db.vehicleEngine.upsert({
      where: {
        uq_vehicle_engines_external: {
          externalSource: EXTERNAL_SOURCE,
          externalSourceId: String(t.trimId),
        },
      },
      create: {
        generationId: localGenId,
        code: parsed.code,
        displacementCc: parsed.displacementCc,
        fuelType: parsed.fuelType as FuelType | null,
        powerKw: parsed.powerKw,
        externalSource: EXTERNAL_SOURCE,
        externalSourceId: String(t.trimId),
      },
      update: {
        generationId: localGenId,
        code: parsed.code,
        displacementCc: parsed.displacementCc,
        fuelType: parsed.fuelType as FuelType | null,
        powerKw: parsed.powerKw,
      },
    })
    upEngines += 1
  }

  return { makes: upMakes, models: upModels, generations: upGens, engines: upEngines }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestGlobalAutoVehicles(
  opts: { dryRun?: boolean; pageLimit?: number } = {},
): Promise<VehiclesStats> {
  const dryRun = opts.dryRun ?? true
  const stats: VehiclesStats = {
    makes: 0,
    models: 0,
    series: 0,
    trims: 0,
    productsScanned: 0,
    pagesScanned: 0,
    outputPath: null,
    upserted: { makes: 0, models: 0, generations: 0, engines: 0 },
  }

  // Phase 1: walk makes → models → series
  const makes = await fetchMakes()
  stats.makes = makes.length
  console.log(`[global-auto] ${makes.length} marques`)

  const modelsByMake = new Map<number, GaModel[]>()
  for (const make of makes) {
    const models = await fetchModels(make.id)
    modelsByMake.set(make.id, models)
    stats.models += models.length
  }
  console.log(`[global-auto] ${stats.models} modèles`)

  const seriesByModel = new Map<number, GaSeries[]>()
  for (const [, models] of modelsByMake) {
    for (const m of models) {
      const series = await fetchSeries(m.id)
      seriesByModel.set(m.id, series)
      stats.series += series.length
    }
  }
  console.log(`[global-auto] ${stats.series} générations`)

  // Phase 2: stream products to harvest unique trims (trim_id, trim_name, series_id)
  const trimsMap = new Map<number, TrimSeed>()
  for await (const page of streamAllProducts(opts.pageLimit ?? 500)) {
    stats.pagesScanned += 1
    stats.productsScanned += page.products.length
    for (const p of page.products) {
      for (const c of p.vehicle_compatibility) {
        if (c.trim_id != null && c.trim_name && c.series_id != null) {
          if (!trimsMap.has(c.trim_id)) {
            trimsMap.set(c.trim_id, {
              trimId: c.trim_id,
              trimName: c.trim_name,
              seriesId: c.series_id,
            })
          }
        }
      }
    }
    console.log(`[global-auto] page ${page.page}/${page.totalPages} — ${trimsMap.size} trims uniques`)
  }
  const trims = Array.from(trimsMap.values())
  stats.trims = trims.length

  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `global-auto-vehicles-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify({
        source: 'global-auto-vehicles',
        fetchedAt: new Date().toISOString(),
        counts: { makes: stats.makes, models: stats.models, series: stats.series, trims: stats.trims },
        makes,
        modelsByMake: Object.fromEntries(modelsByMake),
        seriesByModel: Object.fromEntries(seriesByModel),
        trims,
      }, null, 2),
      'utf8',
    )
    stats.outputPath = outPath
    console.log(`[global-auto] dump écrit dans ${outPath}`)
  } else {
    console.log(`[global-auto] commit en DB…`)
    stats.upserted = await loadVehicleCatalog({ makes, modelsByMake, seriesByModel, trims })
    console.log(`[global-auto] upserted`, stats.upserted)
  }

  return stats
}
