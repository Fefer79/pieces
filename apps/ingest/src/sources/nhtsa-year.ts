import { z } from 'zod'

const NhtsaYearModel = z.object({
  Make_ID: z.number(),
  Make_Name: z.string(),
  Model_ID: z.number(),
  Model_Name: z.string(),
})

const NhtsaResponse = z.object({
  Count: z.number(),
  Results: z.array(NhtsaYearModel),
})

export async function fetchModelsForMakeYear(makeName: string, year: number): Promise<string[]> {
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMakeYear/make/${encodeURIComponent(makeName)}/modelyear/${year}?format=json`
  const res = await fetch(url, {
    headers: {
      'user-agent': process.env.INGEST_USER_AGENT ?? 'pieces-ci-ingest/0.1',
      accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`NHTSA year HTTP ${res.status} for ${makeName} ${year}`)
  const json: unknown = await res.json()
  return NhtsaResponse.parse(json).Results.map((r) => r.Model_Name)
}
