import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { fetchProductUrls, fetchProduct } from '../sources/three-h.ts'
import { normalizeThreeHProduct, EXTERNAL_SOURCE_SLUG, type ThreeHNormalized } from '../normalizers/three-h.ts'
import { prisma } from '../lib/prisma.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'

const SHADOW_VENDOR_PHONE = '+22500000003H'
const SHADOW_VENDOR_SHOP_NAME = '3H Autoparts'

export type ThreeHStats = {
  urls: number
  fetched: number
  normalized: number
  skippedNoJsonLd: number
  skippedNoName: number
  errors: number
  outputPath: string | null
  vendorId: string | null
  upserted: number
}

type IngestPrisma = Pick<PrismaClient, 'vendor' | 'catalogItem'>

export async function loadThreeHItems(
  items: ThreeHNormalized[],
  db: IngestPrisma = prisma,
): Promise<{ vendorId: string; upserted: number }> {
  const vendor = await db.vendor.upsert({
    where: { uq_vendors_external_seller: { externalSource: EXTERNAL_SOURCE_SLUG, externalSellerId: SHADOW_SELLER_ID } },
    create: {
      shopName: SHADOW_VENDOR_SHOP_NAME,
      contactName: SHADOW_VENDOR_SHOP_NAME,
      phone: SHADOW_VENDOR_PHONE,
      vendorType: 'FORMAL',
      status: 'ACTIVE',
      isExternal: true,
      externalSource: EXTERNAL_SOURCE_SLUG,
      externalSellerId: SHADOW_SELLER_ID,
    },
    update: {
      isExternal: true,
    },
  })
  let upserted = 0
  for (const item of items) {
    await db.catalogItem.upsert({
      where: {
        uq_catalog_items_external: {
          externalSource: item.externalSource,
          externalSourceId: item.externalSourceId,
        },
      },
      create: {
        vendorId: vendor.id,
        name: item.name,
        category: item.category,
        oemReference: item.oemReference,
        price: item.price,
        status: 'PUBLISHED',
        imageOriginalUrl: item.imageOriginalUrl,
        aiGenerated: false,
        inStock: item.inStock,
        condition: item.condition,
        partSource: item.partSource,
        externalSource: item.externalSource,
        externalSourceId: item.externalSourceId,
        externalSourceUrl: item.externalSourceUrl,
      },
      update: {
        name: item.name,
        category: item.category,
        oemReference: item.oemReference,
        price: item.price,
        imageOriginalUrl: item.imageOriginalUrl,
        inStock: item.inStock,
        condition: item.condition,
        partSource: item.partSource,
        externalSourceUrl: item.externalSourceUrl,
      },
    })
    upserted += 1
  }
  return { vendorId: vendor.id, upserted }
}

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestThreeH(opts: { dryRun?: boolean; limit?: number } = {}): Promise<ThreeHStats> {
  const dryRun = opts.dryRun ?? true
  const stats: ThreeHStats = {
    urls: 0,
    fetched: 0,
    normalized: 0,
    skippedNoJsonLd: 0,
    skippedNoName: 0,
    errors: 0,
    outputPath: null,
    vendorId: null,
    upserted: 0,
  }
  const urls = await fetchProductUrls()
  stats.urls = urls.length
  const targets = opts.limit ? urls.slice(0, opts.limit) : urls
  console.log(`[3h] ${urls.length} produits dans sitemap, traitement de ${targets.length}`)
  const normalized: ThreeHNormalized[] = []
  for (const url of targets) {
    try {
      const raw = await fetchProduct(url)
      stats.fetched += 1
      if (!raw) {
        stats.skippedNoJsonLd += 1
        continue
      }
      const item = normalizeThreeHProduct(raw)
      if (!item) {
        stats.skippedNoName += 1
        continue
      }
      normalized.push(item)
      stats.normalized += 1
      if (stats.normalized % 25 === 0) {
        console.log(`[3h] ${stats.normalized}/${targets.length} normalisés`)
      }
    } catch (err) {
      stats.errors += 1
      console.warn(`[3h] erreur sur ${url}:`, err instanceof Error ? err.message : err)
    }
  }
  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `3hautoparts-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify({ source: '3hautoparts', fetchedAt: new Date().toISOString(), count: normalized.length, items: normalized }, null, 2),
      'utf8'
    )
    stats.outputPath = outPath
    console.log(`[3h] dump écrit dans ${outPath}`)
  } else {
    console.log(`[3h] commit en DB de ${normalized.length} produits…`)
    const { vendorId, upserted } = await loadThreeHItems(normalized)
    stats.vendorId = vendorId
    stats.upserted = upserted
    console.log(`[3h] ${upserted} produits upserted sous vendor ${vendorId}`)
  }
  return stats
}
