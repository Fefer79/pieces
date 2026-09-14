import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '@prisma/client'
import { originCountryLabel } from 'shared/constants'
import { streamListings } from '../sources/opisto.ts'
import { normalizeOpistoPart, EXTERNAL_SOURCE_SLUG, type OpistoNormalized } from '../normalizers/opisto.ts'
import { DEFAULT_BRAND_SLUGS, DEFAULT_CATEGORY_SLUGS } from '../data/opisto-targets.ts'
import { prisma } from '../lib/prisma.ts'
import { SHADOW_SELLER_ID } from '../lib/external.ts'

const HERE = dirname(fileURLToPath(import.meta.url))
const RAW_DIR = resolve(HERE, '../../data/raw')

/**
 * Nom affiché d'une casse partenaire.
 *
 * ⚠ ANONYMISATION — décision produit, pas cosmétique. Opisto nomme ses casses
 * (« JAQU'AUTO - FRANCE », « DESGUACES GP - ESPAGNE »). On ne reprend PAS ces
 * noms :
 *  1. ce sont des tiers avec qui nous n'avons aucun accord — les afficher comme
 *     vendeurs Pièces laisserait croire à un partenariat qui n'existe pas ;
 *  2. un acheteur qui lit le nom de la casse commande en direct, et la
 *     précommande d'import n'a plus de raison d'être.
 * L'identité réelle reste en base dans `externalSellerId` (l'id Opisto), donc
 * l'ops sait toujours où acheter.
 */
export function importPartnerShopName(casseId: string | null, originCountry: string): string {
  const country = originCountryLabel(originCountry) ?? originCountry
  return casseId ? `Partenaire import ${country} #${casseId}` : `Partenaire import ${country}`
}

export type OpistoStats = {
  pagesScanned: number
  partsScanned: number
  normalized: number
  skippedNoPrice: number
  outputPath: string | null
  vendorIds: string[]
  itemsUpserted: number
  fitmentsCreated: number
}

type IngestPrisma = Pick<PrismaClient, 'vendor' | 'catalogItem' | 'catalogItemFitment'>

/** Un Vendor par casse, sur la clé composite `(externalSource, externalSellerId)`. */
export async function resolveOpistoVendorId(
  item: Pick<OpistoNormalized, 'casseId' | 'originCountry'>,
  db: IngestPrisma,
  cache: Map<string, string>,
): Promise<string> {
  const sellerId = item.casseId || SHADOW_SELLER_ID
  const cached = cache.get(sellerId)
  if (cached) return cached

  const shopName = importPartnerShopName(item.casseId, item.originCountry)
  const vendor = await db.vendor.upsert({
    where: {
      uq_vendors_external_seller: {
        externalSource: EXTERNAL_SOURCE_SLUG,
        externalSellerId: sellerId,
      },
    },
    create: {
      shopName,
      contactName: '',
      phone: '',
      vendorType: 'FORMAL',
      status: 'ACTIVE',
      isExternal: true,
      isImportPartner: true,
      originCountry: item.originCountry,
      externalSource: EXTERNAL_SOURCE_SLUG,
      externalSellerId: sellerId,
    },
    // Le nom est réaligné à chaque run : c'est ce qui fait migrer d'éventuelles
    // lignes historiques mal nommées. On ne touche à rien d'autre.
    update: { shopName, isExternal: true, isImportPartner: true, originCountry: item.originCountry },
  })
  cache.set(sellerId, vendor.id)
  return vendor.id
}

export async function loadOpistoItems(
  items: OpistoNormalized[],
  db: IngestPrisma = prisma,
): Promise<{ vendorIds: string[]; itemsUpserted: number; fitmentsCreated: number }> {
  const vendorCache = new Map<string, string>()
  let itemsUpserted = 0
  let fitmentsCreated = 0

  for (const item of items) {
    const vendorId = await resolveOpistoVendorId(item, db, vendorCache)
    const shared = {
      vendorId,
      name: item.name,
      category: item.category,
      oemReference: item.oemReference,
      vehicleCompatibility: item.vehicleCompatibility,
      price: item.price,
      imageOriginalUrl: item.imageOriginalUrl,
      inStock: true,
      // Pièce de casse : d'origine constructeur, démontée sur un véhicule.
      condition: 'USED' as const,
      partSource: 'OEM' as const,
      supplyMode: 'IMPORT' as const,
      originCountry: item.originCountry,
      sourceCostAmount: item.sourceCostAmount,
      sourceCostCurrency: item.sourceCostCurrency,
      sourceCostFcfa: item.sourceCostFcfa,
      importMarginPct: item.importMarginPct,
      warrantyValue: item.warrantyValue,
      warrantyUnit: item.warrantyUnit,
      externalSourceUrl: item.externalSourceUrl,
    }

    const row = await db.catalogItem.upsert({
      where: {
        uq_catalog_items_external: {
          externalSource: item.externalSource,
          externalSourceId: item.externalSourceId,
        },
      },
      create: {
        ...shared,
        status: 'PUBLISHED',
        aiGenerated: false,
        externalSource: item.externalSource,
        externalSourceId: item.externalSourceId,
      },
      update: shared,
    })
    itemsUpserted += 1

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

const isoDate = (): string => new Date().toISOString().slice(0, 10)

export async function ingestOpisto(
  opts: {
    dryRun?: boolean
    productLimit?: number
    maxPagesPerCombo?: number
    brands?: string[]
    categories?: string[]
  } = {},
): Promise<OpistoStats> {
  const dryRun = opts.dryRun ?? true
  const brands = opts.brands?.length ? opts.brands : DEFAULT_BRAND_SLUGS
  const categories = opts.categories?.length ? opts.categories : DEFAULT_CATEGORY_SLUGS

  const stats: OpistoStats = {
    pagesScanned: 0,
    partsScanned: 0,
    normalized: 0,
    skippedNoPrice: 0,
    outputPath: null,
    vendorIds: [],
    itemsUpserted: 0,
    fitmentsCreated: 0,
  }

  const normalized: OpistoNormalized[] = []
  outer: for await (const page of streamListings({
    brands,
    categories,
    maxPagesPerCombo: opts.maxPagesPerCombo,
  })) {
    stats.pagesScanned += 1
    for (const raw of page.parts) {
      stats.partsScanned += 1
      const item = normalizeOpistoPart(raw, {
        brandSlug: page.brandSlug,
        categorySlug: page.categorySlug,
      })
      if (!item) {
        stats.skippedNoPrice += 1
        continue
      }
      normalized.push(item)
      stats.normalized += 1
      if (opts.productLimit && stats.normalized >= opts.productLimit) break outer
    }
    console.log(
      `[opisto] ${page.categorySlug}/${page.brandSlug} page ${page.page} — ${stats.normalized} normalisés`,
    )
  }

  if (dryRun) {
    await mkdir(RAW_DIR, { recursive: true })
    const outPath = resolve(RAW_DIR, `opisto-pieces-${isoDate()}.json`)
    await writeFile(
      outPath,
      JSON.stringify(
        { source: 'opisto-pieces', fetchedAt: new Date().toISOString(), count: normalized.length, items: normalized },
        null,
        2,
      ),
      'utf8',
    )
    stats.outputPath = outPath
    console.log(`[opisto] dump écrit dans ${outPath}`)
  } else {
    console.log(`[opisto] commit en DB de ${normalized.length} pièces…`)
    const loaded = await loadOpistoItems(normalized)
    stats.vendorIds = loaded.vendorIds
    stats.itemsUpserted = loaded.itemsUpserted
    stats.fitmentsCreated = loaded.fitmentsCreated
    console.log(
      `[opisto] ${loaded.itemsUpserted} pièces upserted (${loaded.fitmentsCreated} fitments) sur ${loaded.vendorIds.length} casses`,
    )
  }

  return stats
}
