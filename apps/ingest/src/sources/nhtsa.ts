import { z } from 'zod'

const NhtsaModel = z.object({
  Make_ID: z.number(),
  Make_Name: z.string(),
  Model_ID: z.number(),
  Model_Name: z.string(),
})

const NhtsaResponse = z.object({
  Count: z.number(),
  Results: z.array(NhtsaModel),
})

export type NhtsaModelRow = z.infer<typeof NhtsaModel>

export async function fetchModelsForMake(makeName: string): Promise<NhtsaModelRow[]> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(makeName)}?format=json`
  const res = await fetch(url, {
    headers: {
      'user-agent': process.env.INGEST_USER_AGENT ?? 'pieces-ci-ingest/0.1',
      accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`NHTSA HTTP ${res.status} for ${makeName}`)
  const json: unknown = await res.json()
  return NhtsaResponse.parse(json).Results
}
