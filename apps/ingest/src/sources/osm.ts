import { z } from 'zod'

const OverpassElement = z.object({
  type: z.enum(['node', 'way', 'relation']),
  id: z.number(),
  lat: z.number().optional(),
  lon: z.number().optional(),
  center: z.object({ lat: z.number(), lon: z.number() }).optional(),
  tags: z.record(z.string(), z.string()).optional(),
})

const OverpassResponse = z.object({
  elements: z.array(OverpassElement),
})

export type OsmShop = z.infer<typeof OverpassElement>

const ABIDJAN_BBOX = [5.20, -4.20, 5.50, -3.85] as const

export async function fetchAbidjanAutoShops(): Promise<OsmShop[]> {
  const [south, west, north, east] = ABIDJAN_BBOX
  const query = `[out:json][timeout:90];(nwr["shop"="car_parts"](${south},${west},${north},${east});nwr["shop"="car_repair"](${south},${west},${north},${east});nwr["shop"="car"](${south},${west},${north},${east}););out center tags;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': process.env.INGEST_USER_AGENT ?? 'pieces-ci-ingest/0.1',
    },
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error(`OSM Overpass HTTP ${res.status}`)
  const json: unknown = await res.json()
  const parsed = OverpassResponse.parse(json)
  return parsed.elements
}
