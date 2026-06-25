import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { streamAllProducts, fetchAdDetail, parseAdDetail } from '../sources/coinafrique.ts'
import {
  normalizeCoinAfriqueProduct,
  EXTERNAL_SOURCE_SLUG,
  type CoinAfriqueNormalized,
} from '../normalizers/coinafrique.ts'
import { prisma } from '../lib/prisma.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

// Vendeur fallback : reçoit les annonces dont on n'a pas pu déterminer le vendeur
// (page détail KO, pas de data-user-id). Sentinel '__shadow__' sur la clé composite.
const SHADOW_VENDOR_SHOP_NAME = 'CoinAfrique CI'
const SHADOW_VENDOR_PHONE = '+22500000099CA'

export type CoinAfriqueStats = {
  productsScanned: number
  pagesScanned: number
  normalized: number
  skippedNoName: number
  skippedNoPrice: number
  outputPath: string | null
  vendorIds: string[]
  sellersResolved: number
  sellersEnrichFailed: number
  itemsUpserted: number
  fitmentsCreated: number
}

type IngestPrisma = Pick<PrismaClient, 'vendor' | 'catalogItem' | 'catalogItemFitment'>

/**
 * Résout l'id du vendeur pour une annonce, en upsertant un Vendor par vendeur réel
 * sur la clé composite `(externalSource, externalSellerId)`. Sans `sellerId` (détail
 * KO), on retombe sur le vendeur fantôme `__shadow__`. Le `cache` évite de réupserter
 * le même vendeur à chaque annonce dans un même run.
 */
export async function resolveCoinAfriqueVendorId(
  seller: { sellerId: string | null; sellerName: string | null; sellerPhone: string | null },
  db: IngestPrisma,
  cache: Map<string, string>,
): Promise<string> {
  const sellerId = seller.sellerId || SHADOW_SELLER_ID
  const cached = cache.get(sellerId)
  if (cached) return cached

  const isShadow = sellerId === SHADOW_SELLER_ID
  const shopName = isShadow ? SHADOW_VENDOR_SHOP_NAME : seller.sellerName?.trim() || 'Vendeur CoinAfrique'
  const phone = isShadow ? SHADOW_VENDOR_PHONE : seller.sellerPhone ?? ''

  const vendor = await db.vendor.upsert({
    where: {
      uq_vendors_external_seller: {
        externalSource: EXTERNAL_SOURCE_SLUG,
        externalSellerId: sellerId,
      },
    },
    create: {
      shopName,
      contactName: isShadow ? SHADOW_VENDOR_SHOP_NAME : seller.sellerName?.trim() || '',
      phone,
      vendorType: 'INFORMAL',
      status: 'ACTIVE',
      isExternal: true,
      externalSource: EXTERNAL_SOURCE_SLUG,
      externalSellerId: sellerId,
    },
    // On rafraîchit nom/téléphone scrapés SANS écraser une correction admin :
    // n'écrase que si on a une nouvelle valeur non vide. (Le fantôme reste figé.)
    update: isShadow
      ? { isExternal: true }
      : {
          isExternal: true,
          ...(seller.sellerName?.trim() ? { shopName: seller.sellerName.trim() } : {}),
          ...(seller.sellerPhone ? { phone: seller.sellerPhone } : {}),
        },
  })

  cache.set(sellerId, vendor.id)
  return vendor.id
}

export async function loadCoinAfriqueItems(
  items: CoinAfriqueNormalized[],
  db: IngestPrisma = prisma,
): Promise<{ vendorIds: string[]; itemsUpserted: number; fitmentsCreated: number }> {
  const vendorCache = new Map<string, string>()

  let itemsUpserted = 0
  let fitmentsCreated = 0
  for (const item of items) {
    const vendorId = await resolveCoinAfriqueVendorId(item, db, vendorCache)
    const row = await db.catalogItem.upsert({
      where: {
        uq_catalog_items_external: {
          externalSource: item.externalSource,
          externalSourceId: item.externalSourceId,
        },
      },
      create: {
        vendorId,
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
        vendorId,
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

    // Fitments déduits du titre — remplacés en bloc pour rester en phase avec l'upstream.
    await db.catalogItemFitment.deleteMany({ where: { catalogItemId: row.id } })
    if (item.fitments.length > 0) {
      await db.catalogItemFitment.createMany({
        data: item.fitments.map((f) => ({
          catalogItemId: row.id,
          brand: f.brand,
          model: f.model,
          yearFrom: f.yearFrom,
          yearTo: f.yearTo,
        })),
      })
      fitmentsCreated += item.fitments.length
    }
  }
  return { vendorIds: [...vendorCache.values()], itemsUpserted, fitmentsCreated }
}

function isoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function ingestCoinAfrique(
  opts: {
    dryRun?: boolean
    productLimit?: number
    maxPages?: number
    /** Récupère vendeur+téléphone sur chaque page détail. Par défaut actif hors dry-run. */
    enrichSellers?: boolean
  } = {},
): Promise<CoinAfriqueStats> {
  const dryRun = opts.dryRun ?? true
  const enrichSellers = opts.enrichSellers ?? !dryRun
  const stats: CoinAfriqueStats = {
    productsScanned: 0,
    pagesScanned: 0,
    normalized: 0,
    skippedNoName: 0,
    skippedNoPrice: 0,
    outputPath: null,
    vendorIds: [],
    sellersResolved: 0,
    sellersEnrichFailed: 0,
    itemsUpserted: 0,
    fitmentsCreated: 0,
  }

  const normalized: CoinAfriqueNormalized[] = []
  for await (const page of streamAllProducts({ maxPages: opts.maxPages })) {
    stats.pagesScanned += 1
    for (const p of page.products) {
      stats.productsScanned += 1
      const item = normalizeCoinAfriqueProduct(p)
      if (!item) {
        stats.skippedNoName += 1
        continue
      }
      if (item.price == null) stats.skippedNoPrice += 1
      normalized.push(item)
      stats.normalized += 1
      if (opts.productLimit && stats.normalized >= opts.productLimit) break
    }
    console.log(`[coinafrique] page ${page.page} — ${stats.normalized} normalisés`)
    if (opts.productLimit && stats.normalized >= opts.productLimit) break
  }

  // Enrichissement vendeur : une page détail par annonce (rate-limit géré par fetchText).
  if (enrichSellers) {
    for (const item of normalized) {
      try {
        const detail = parseAdDetail(await fetchAdDetail(item.externalSourceUrl))
        item.sellerId = detail.sellerId
        item.sellerName = detail.sellerName
        item.sellerPhone = detail.phone
        if (detail.sellerId) stats.sellersResolved += 1
        else stats.sellersEnrichFailed += 1
      } catch (err) {
        stats.sellersEnrichFailed += 1
        console.warn(
          `[coinafrique] détail KO ${item.externalSourceUrl}:`,
          err instanceof Error ? err.message : err,
        )
      }
    }
    console.log(
      `[coinafrique] vendeurs enrichis: ${stats.sellersResolved} ok, ${stats.sellersEnrichFailed} fallback`,
    )
  }

  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `coinafrique-pieces-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify(
        { source: 'coinafrique-pieces', fetchedAt: new Date().toISOString(), count: normalized.length, items: normalized },
        null,
        2,
      ),
      'utf8',
    )
    stats.outputPath = outPath
    console.log(`[coinafrique] dump écrit dans ${outPath}`)
  } else {
    console.log(`[coinafrique] commit en DB de ${normalized.length} produits…`)
    const { vendorIds, itemsUpserted, fitmentsCreated } = await loadCoinAfriqueItems(normalized)
    stats.vendorIds = vendorIds
    stats.itemsUpserted = itemsUpserted
    stats.fitmentsCreated = fitmentsCreated
    console.log(
      `[coinafrique] ${itemsUpserted} produits upserted (${fitmentsCreated} fitments) sur ${vendorIds.length} vendeurs`,
    )
  }
  return stats
}
