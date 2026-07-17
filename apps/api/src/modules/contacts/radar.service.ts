import { prisma } from '../../lib/prisma.js'
import type { Prisma } from '@prisma/client'

/**
 * Radar de leads : transforme les gisements déjà présents en base en prospects
 * (`VendorContact`) dédupliqués, sans re-scraper :
 *  - boutiques physiques OpenStreetMap importées par `ingest --source=osm`
 *    (table `competitor_vendors`)
 *  - vrais vendeurs des marketplaces (Vendor.isExternal, ex. COINAFRIQUE_CI)
 *    résolus par le backfill sellers
 *
 * Idempotent : dédup par (source, sourceRef) — contrainte unique en base — et
 * par téléphone normalisé contre les contacts existants.
 */

export const OSM_SOURCE = 'OSM'
const SHADOW_SELLER_ID = '__shadow__'

const SPECIALTY_LABELS: Record<string, string> = {
  pieces_detachees: 'Pièces détachées',
  reparation: 'Réparation',
  vente_vehicules: 'Vente de véhicules',
}

export function normalizeIvorianPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00225')) digits = digits.slice(5)
  else if (digits.startsWith('225')) digits = digits.slice(3)
  if (digits.length !== 10 || !digits.startsWith('0')) return null
  return `+225${digits}`
}

export interface RadarSourceStats {
  source: string
  scanned: number
  imported: number
  dejaConnus: number
  sansTelephone: number
}

export interface RadarResult {
  dryRun: boolean
  sources: RadarSourceStats[]
  totalImported: number
}

export async function runRadarImport(opts: { dryRun?: boolean } = {}): Promise<RadarResult> {
  const dryRun = opts.dryRun ?? false

  const existing = await prisma.vendorContact.findMany({
    select: { phone: true, source: true, sourceRef: true, vendorId: true },
  })
  const phoneSet = new Set(existing.map((c) => c.phone))
  const refSet = new Set(
    existing.filter((c) => c.sourceRef).map((c) => `${c.source}:${c.sourceRef}`),
  )
  const linkedVendorIds = new Set(existing.map((c) => c.vendorId).filter(Boolean))

  const rows: Prisma.VendorContactCreateManyInput[] = []
  const statsBySource = new Map<string, RadarSourceStats>()

  function stats(source: string): RadarSourceStats {
    let s = statsBySource.get(source)
    if (!s) {
      s = { source, scanned: 0, imported: 0, dejaConnus: 0, sansTelephone: 0 }
      statsBySource.set(source, s)
    }
    return s
  }

  // --- Boutiques physiques OSM (competitor_vendors) ---
  const shops = await prisma.competitorVendor.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
      whatsapp: true,
      address: true,
      zone: true,
      commune: true,
      lat: true,
      lng: true,
      osmId: true,
      specialties: true,
    },
  })

  for (const shop of shops) {
    const s = stats(OSM_SOURCE)
    s.scanned += 1
    const sourceRef = shop.osmId ?? shop.id
    if (refSet.has(`${OSM_SOURCE}:${sourceRef}`)) {
      s.dejaConnus += 1
      continue
    }
    const phone = normalizeIvorianPhone(shop.phone ?? shop.whatsapp)
    if (!phone) {
      s.sansTelephone += 1
      continue
    }
    if (phoneSet.has(phone)) {
      s.dejaConnus += 1
      continue
    }
    phoneSet.add(phone)
    refSet.add(`${OSM_SOURCE}:${sourceRef}`)
    s.imported += 1
    rows.push({
      name: shop.name,
      shopName: shop.name,
      phone,
      whatsapp: normalizeIvorianPhone(shop.whatsapp),
      commune: shop.commune,
      address: shop.address,
      lat: shop.lat,
      lng: shop.lng,
      pieces: [],
      piecesLibre: shop.specialties.map((sp) => SPECIALTY_LABELS[sp] ?? sp).join(', ') || null,
      remarques: `Boutique repérée via OpenStreetMap${shop.zone ? ` (${shop.zone})` : ''}`,
      source: OSM_SOURCE,
      sourceRef,
    })
  }

  // --- Vendeurs réels des marketplaces (Vendor.isExternal) ---
  const externalVendors = await prisma.vendor.findMany({
    where: {
      isExternal: true,
      externalSellerId: { not: null },
      NOT: { externalSellerId: SHADOW_SELLER_ID },
    },
    select: {
      id: true,
      shopName: true,
      contactName: true,
      phone: true,
      commune: true,
      address: true,
      lat: true,
      lng: true,
      externalSource: true,
      _count: { select: { catalogItems: true } },
    },
  })

  for (const vendor of externalVendors) {
    const source = vendor.externalSource ?? 'MARKETPLACE'
    const s = stats(source)
    s.scanned += 1
    if (refSet.has(`${source}:${vendor.id}`) || linkedVendorIds.has(vendor.id)) {
      s.dejaConnus += 1
      continue
    }
    const phone = normalizeIvorianPhone(vendor.phone)
    if (!phone) {
      s.sansTelephone += 1
      continue
    }
    if (phoneSet.has(phone)) {
      s.dejaConnus += 1
      continue
    }
    phoneSet.add(phone)
    refSet.add(`${source}:${vendor.id}`)
    s.imported += 1
    rows.push({
      name: vendor.contactName || vendor.shopName,
      shopName: vendor.shopName,
      phone,
      commune: vendor.commune,
      address: vendor.address,
      lat: vendor.lat,
      lng: vendor.lng,
      pieces: [],
      remarques: `Vendeur ${source} — ${vendor._count.catalogItems} annonce(s) importée(s)`,
      source,
      sourceRef: vendor.id,
    })
  }

  if (!dryRun && rows.length > 0) {
    await prisma.vendorContact.createMany({ data: rows, skipDuplicates: true })
  }

  const sources = [...statsBySource.values()].sort((a, b) => b.scanned - a.scanned)
  return {
    dryRun,
    sources,
    totalImported: rows.length,
  }
}
