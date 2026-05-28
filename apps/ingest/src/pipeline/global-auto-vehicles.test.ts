import { describe, it, expect, vi } from 'vitest'
import { loadVehicleCatalog } from './global-auto-vehicles.ts'
import type { GaMake, GaModel, GaSeries } from '../sources/global-auto.ts'

function makeMockDb() {
  const makeUpsert = vi.fn(({ create }) => ({ id: `local-make-${create.externalSourceId}` }))
  const modelUpsert = vi.fn(({ create }) => ({ id: `local-model-${create.externalSourceId}` }))
  const genUpsert = vi.fn(({ create }) => ({ id: `local-gen-${create.externalSourceId}` }))
  const engineUpsert = vi.fn(({ create }) => ({ id: `local-engine-${create.externalSourceId}` }))
  return {
    db: {
      vehicleMake: { upsert: makeUpsert },
      vehicleModel: { upsert: modelUpsert },
      vehicleGeneration: { upsert: genUpsert },
      vehicleEngine: { upsert: engineUpsert },
    },
    makeUpsert,
    modelUpsert,
    genUpsert,
    engineUpsert,
  }
}

const peugeotMake: GaMake = { id: 1, name: 'PEUGEOT', slug: 'peugeot' }
const dsMake: GaMake = { id: 2, name: 'DS', slug: 'ds' }
const peugeot208: GaModel = { id: 10, make_id: 1, name: '208', slug: '208' }
const ds5Model: GaModel = { id: 20, make_id: 2, name: 'DS5', slug: 'ds5' }
const peugeot208Series: GaSeries = { id: 100, model_id: 10, name: 'II (P21) (05/2019 - ...)', slug: 'p21' }
const ds5Series: GaSeries = { id: 200, model_id: 20, name: '(05/2015 - 04/2018)', slug: 'd5' }

const makes: GaMake[] = [peugeotMake, dsMake]
const modelsByMake = new Map<number, GaModel[]>([
  [1, [peugeot208]],
  [2, [ds5Model]],
])
const seriesByModel = new Map<number, GaSeries[]>([
  [10, [peugeot208Series]],
  [20, [ds5Series]],
])

describe('loadVehicleCatalog', () => {
  it('upserts every layer keyed by GLOBAL_AUTO_CI + upstream id', async () => {
    const { db, makeUpsert, modelUpsert, genUpsert, engineUpsert } = makeMockDb()
    const result = await loadVehicleCatalog(
      {
        makes,
        modelsByMake,
        seriesByModel,
        trims: [
          { trimId: 1000, trimName: '1.6 THP 165 cv', seriesId: 100 },
          { trimId: 2000, trimName: '2.0 Blue HDi 136 cv', seriesId: 200 },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
    )
    expect(result).toEqual({ makes: 2, models: 2, generations: 2, engines: 2 })
    expect(makeUpsert).toHaveBeenCalledTimes(2)
    expect(modelUpsert).toHaveBeenCalledTimes(2)
    expect(genUpsert).toHaveBeenCalledTimes(2)
    expect(engineUpsert).toHaveBeenCalledTimes(2)
  })

  it('passes parsed series year_start/code and trim displacement/fuel/power to upsert', async () => {
    const { db, genUpsert, engineUpsert } = makeMockDb()
    await loadVehicleCatalog(
      {
        makes,
        modelsByMake,
        seriesByModel,
        trims: [{ trimId: 1000, trimName: '1.6 THP 165 cv', seriesId: 100 }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
    )
    const genCreate = genUpsert.mock.calls[0][0].create
    expect(genCreate.yearStart).toBe(2019)
    expect(genCreate.yearEnd).toBeNull()
    expect(genCreate.code).toBe('II (P21)')

    const engineCreate = engineUpsert.mock.calls[0][0].create
    expect(engineCreate.displacementCc).toBe(1600)
    expect(engineCreate.fuelType).toBe('PETROL')
    expect(engineCreate.powerKw).toBe(121) // 165 * 0.7355 ≈ 121
    expect(engineCreate.code).toBe('1.6 THP 165 cv')
  })

  it('falls back yearStart to 0 when series label is unparseable', async () => {
    const { db, genUpsert } = makeMockDb()
    const orphanSeries = new Map<number, GaSeries[]>([
      [10, [{ id: 999, model_id: 10, name: 'No date here', slug: 'x' }]],
    ])
    await loadVehicleCatalog(
      {
        makes: [peugeotMake],
        modelsByMake: new Map([[1, [peugeot208]]]),
        seriesByModel: orphanSeries,
        trims: [],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
    )
    expect(genUpsert.mock.calls[0][0].create.yearStart).toBe(0)
    expect(genUpsert.mock.calls[0][0].create.code).toBe('No date here')
  })

  it('deduplicates engine upserts when the same trim_id appears twice', async () => {
    const { db, engineUpsert } = makeMockDb()
    await loadVehicleCatalog(
      {
        makes: [peugeotMake],
        modelsByMake: new Map([[1, [peugeot208]]]),
        seriesByModel: new Map([[10, [peugeot208Series]]]),
        trims: [
          { trimId: 7777, trimName: '1.6 HDi 100 cv', seriesId: 100 },
          { trimId: 7777, trimName: '1.6 HDi 100 cv', seriesId: 100 },
        ],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
    )
    expect(engineUpsert).toHaveBeenCalledTimes(1)
  })

  it('skips engine when its series_id was not upserted (orphan)', async () => {
    const { db, engineUpsert } = makeMockDb()
    await loadVehicleCatalog(
      {
        makes: [peugeotMake],
        modelsByMake: new Map([[1, [peugeot208]]]),
        seriesByModel: new Map([[10, [peugeot208Series]]]),
        trims: [{ trimId: 5555, trimName: '1.6 HDi 100 cv', seriesId: 99999 }],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
    )
    expect(engineUpsert).not.toHaveBeenCalled()
  })
})
