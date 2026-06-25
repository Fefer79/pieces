import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { streamAllProducts } from '../sources/bcg.ts'
import {
  normalizeBcgProduct,
  EXTERNAL_SOURCE_SLUG,
  type BcgNormalized,
} from '../normalizers/bcg.ts'
import { prisma } from '../lib/prisma.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

const SHADOW_VENDOR_SHOP_NAME = 'BCG Pièces Auto'
const SHADOW_VENDOR_PHONE = '+22500000099BC'

export type BcgStats = {
  productsScanned: number
  pagesScanned: number
  normalized: number
  skippedNoName: number
  skippedNoPrice: number
  outputPath: string | null
  vendorId: string | null
  itemsUpserted: number
  fitmentsCreated: number
}

type BcgPrisma = Pick<PrismaClient, 'vendor' | 'catalogItem' | 'catalogItemFitment'>

export async function loadBcgItems(
  items: BcgNormalized[],
  db: BcgPrisma = prisma,
): Promise<{ vendorId: string; itemsUpserted: number; fitmentsCreated: number }> {
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
    update: { isExternal: true },
  })

  let itemsUpserted = 0
  let fitmentsCreated = 0
  for (const item of items) {
    const row = await db.catalogItem.upsert({
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
    itemsUpserted += 1

    // Remplace les fitments en bloc — synchronise la table avec l'amont.
    await db.catalogItemFitment.deleteMany({ where: { catalogItemId: row.id } })
    if (item.fitments.length > 0) {
      await db.catalogItemFitment.createMany({
        data: item.fitments.map((f) => ({
          catalogItemId: row.id,
          brand: f.brand,
          model: f.model,
          yearFrom: f.yearFrom,
          yearTo: f.yearTo,
          engine: f.engine,
        })),
      })
      fitmentsCreated += item.fitments.length
    }
  }
  return { vendorId: vendor.id, itemsUpserted, fitmentsCreated }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestBcg(
  opts: { dryRun?: boolean; productLimit?: number; maxPages?: number } = {},
): Promise<BcgStats> {
  const dryRun = opts.dryRun ?? true
  const stats: BcgStats = {
    productsScanned: 0,
    pagesScanned: 0,
    normalized: 0,
    skippedNoName: 0,
    skippedNoPrice: 0,
    outputPath: null,
    vendorId: null,
    itemsUpserted: 0,
    fitmentsCreated: 0,
  }

  const normalized: BcgNormalized[] = []
  for await (const page of streamAllProducts({ maxPages: opts.maxPages })) {
    stats.pagesScanned += 1
    for (const p of page.products) {
      stats.productsScanned += 1
      const item = normalizeBcgProduct(p)
      if (!item) {
        stats.skippedNoName += 1
        continue
      }
      if (item.price == null) stats.skippedNoPrice += 1
      normalized.push(item)
      stats.normalized += 1
      if (opts.productLimit && stats.normalized >= opts.productLimit) break
    }
    console.log(`[bcg] page ${page.page} — ${stats.normalized} normalisés`)
    if (opts.productLimit && stats.normalized >= opts.productLimit) break
  }

  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `bcg-pieces-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify({
        source: 'bcg-pieces',
        fetchedAt: new Date().toISOString(),
        count: normalized.length,
        items: normalized,
      }, null, 2),
      'utf8',
    )
    stats.outputPath = outPath
    console.log(`[bcg] dump écrit dans ${outPath}`)
  } else {
    console.log(`[bcg] commit en DB de ${normalized.length} produits…`)
    const { vendorId, itemsUpserted, fitmentsCreated } = await loadBcgItems(normalized)
    stats.vendorId = vendorId
    stats.itemsUpserted = itemsUpserted
    stats.fitmentsCreated = fitmentsCreated
    console.log(`[bcg] ${itemsUpserted} items + ${fitmentsCreated} fitments sous vendor ${vendorId}`)
  }
  return stats
}
