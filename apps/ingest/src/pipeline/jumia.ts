import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { streamAllProducts } from '../sources/jumia.ts'
import { normalizeJumiaProduct, EXTERNAL_SOURCE_SLUG, type JumiaNormalized } from '../normalizers/jumia.ts'
import { prisma } from '../lib/prisma.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

const SHADOW_VENDOR_SHOP_NAME = 'Jumia CI'
const SHADOW_VENDOR_PHONE = '+22500000099JU'

export type JumiaStats = {
  productsScanned: number
  pagesScanned: number
  normalized: number
  skippedNoName: number
  skippedNoPrice: number
  outputPath: string | null
  vendorId: string | null
  itemsUpserted: number
}

type IngestPrisma = Pick<PrismaClient, 'vendor' | 'catalogItem'>

export async function loadJumiaItems(
  items: JumiaNormalized[],
  db: IngestPrisma = prisma,
): Promise<{ vendorId: string; itemsUpserted: number }> {
  const vendor = await db.vendor.upsert({
    where: { externalSource: EXTERNAL_SOURCE_SLUG },
    create: {
      shopName: SHADOW_VENDOR_SHOP_NAME,
      contactName: SHADOW_VENDOR_SHOP_NAME,
      phone: SHADOW_VENDOR_PHONE,
      vendorType: 'FORMAL',
      status: 'ACTIVE',
      isExternal: true,
      externalSource: EXTERNAL_SOURCE_SLUG,
    },
    update: { isExternal: true },
  })

  let itemsUpserted = 0
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
        price: item.price,
        imageOriginalUrl: item.imageOriginalUrl,
        inStock: item.inStock,
        condition: item.condition,
        partSource: item.partSource,
        externalSourceUrl: item.externalSourceUrl,
      },
    })
    itemsUpserted += 1
  }
  return { vendorId: vendor.id, itemsUpserted }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestJumia(
  opts: { dryRun?: boolean; productLimit?: number; maxPages?: number } = {},
): Promise<JumiaStats> {
  const dryRun = opts.dryRun ?? true
  const stats: JumiaStats = {
    productsScanned: 0,
    pagesScanned: 0,
    normalized: 0,
    skippedNoName: 0,
    skippedNoPrice: 0,
    outputPath: null,
    vendorId: null,
    itemsUpserted: 0,
  }

  const normalized: JumiaNormalized[] = []
  for await (const page of streamAllProducts({ maxPages: opts.maxPages })) {
    stats.pagesScanned += 1
    for (const p of page.products) {
      stats.productsScanned += 1
      const item = normalizeJumiaProduct(p)
      if (!item) {
        stats.skippedNoName += 1
        continue
      }
      if (item.price == null) stats.skippedNoPrice += 1
      normalized.push(item)
      stats.normalized += 1
      if (opts.productLimit && stats.normalized >= opts.productLimit) break
    }
    console.log(`[jumia] page ${page.page}/${page.totalPages} — ${stats.normalized} normalisés`)
    if (opts.productLimit && stats.normalized >= opts.productLimit) break
  }

  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `jumia-pieces-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify(
        { source: 'jumia-pieces', fetchedAt: new Date().toISOString(), count: normalized.length, items: normalized },
        null,
        2,
      ),
      'utf8',
    )
    stats.outputPath = outPath
    console.log(`[jumia] dump écrit dans ${outPath}`)
  } else {
    console.log(`[jumia] commit en DB de ${normalized.length} produits…`)
    const { vendorId, itemsUpserted } = await loadJumiaItems(normalized)
    stats.vendorId = vendorId
    stats.itemsUpserted = itemsUpserted
    console.log(`[jumia] ${itemsUpserted} produits upserted sous vendor ${vendorId}`)
  }
  return stats
}
