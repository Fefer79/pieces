import type { CompetitorSize, CompetitorType } from '@prisma/client'
import type { OsmShop } from '../sources/osm.ts'

export type CompetitorVendorInput = {
  name: string
  type: CompetitorType
  phone: string | null
  websiteUrl: string | null
  address: string | null
  zone: string | null
  commune: string | null
  lat: number | null
  lng: number | null
  osmId: string
  specialties: string[]
  estimatedSize: CompetitorSize | null
}

const ZONE_BOXES: Array<{ name: string; commune: string; south: number; north: number; west: number; east: number }> = [
  { name: 'Treichville', commune: 'Treichville', south: 5.275, north: 5.305, west: -3.995, east: -3.965 },
  { name: 'Marcory Zone 4', commune: 'Marcory', south: 5.295, north: 5.315, west: -4.020, east: -4.000 },
  { name: 'Adjamé Roxy/Forum', commune: 'Adjamé', south: 5.340, north: 5.380, west: -4.110, east: -4.060 },
  { name: 'Cocody Angré/Riviera', commune: 'Cocody', south: 5.345, north: 5.415, west: -4.000, east: -3.955 },
  { name: 'Abobo', commune: 'Abobo', south: 5.410, north: 5.450, west: -4.080, east: -4.000 },
  { name: 'Yopougon', commune: 'Yopougon', south: 5.320, north: 5.370, west: -4.120, east: -4.060 },
  { name: 'Koumassi', commune: 'Koumassi', south: 5.280, north: 5.320, west: -3.970, east: -3.930 },
]

function classifyZone(lat: number, lng: number): { zone: string | null; commune: string | null } {
  for (const z of ZONE_BOXES) {
    if (lat >= z.south && lat <= z.north && lng >= z.west && lng <= z.east) {
      return { zone: z.name, commune: z.commune }
    }
  }
  return { zone: null, commune: null }
}

function classifySize(shop: OsmShop): CompetitorSize | null {
  const tags = shop.tags ?? {}
  const hasPhone = Boolean(tags.phone ?? tags['contact:phone'])
  const hasWebsite = Boolean(tags.website ?? tags['contact:website'])
  if (hasPhone && hasWebsite) return 'LARGE'
  if (hasPhone || hasWebsite) return 'MEDIUM'
  return 'SMALL'
}

export function normalizeOsmShop(shop: OsmShop): CompetitorVendorInput | null {
  const tags = shop.tags ?? {}
  const name = tags.name
  if (!name) return null
  const lat = shop.lat ?? shop.center?.lat ?? null
  const lng = shop.lon ?? shop.center?.lon ?? null
  const { zone, commune } = lat != null && lng != null ? classifyZone(lat, lng) : { zone: null, commune: null }
  const specialties: string[] = []
  if (tags.shop === 'car_parts') specialties.push('pieces_detachees')
  if (tags.shop === 'car_repair') specialties.push('reparation')
  if (tags.shop === 'car') specialties.push('vente_vehicules')
  return {
    name,
    type: 'OFFLINE',
    phone: tags.phone ?? tags['contact:phone'] ?? null,
    websiteUrl: tags.website ?? tags['contact:website'] ?? null,
    address: tags['addr:full'] ?? tags['addr:street'] ?? null,
    zone,
    commune,
    lat,
    lng,
    osmId: `${shop.type}/${shop.id}`,
    specialties,
    estimatedSize: classifySize(shop),
  }
}
