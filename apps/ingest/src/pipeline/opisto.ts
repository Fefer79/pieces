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

type IngestPrisma = Pick<
  PrismaClient,
  'vendor' | 'catalogItem' | 'catalogItemFitment' | '$transaction'
>

/**
 * Codes Prisma signalant une connexion perdue, pas une donnée invalide.
 * P1017 est celui qui a coupé le premier run complet : Prisma Postgres ferme la
 * connexion au bout d'un certain temps, et une boucle d'écriture longue la tient
 * ouverte bien au-delà.
 */
const CONNECTION_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024'])

function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  if (typeof code === 'string' && CONNECTION_ERROR_CODES.has(code)) return true
  const message = err instanceof Error ? err.message : ''
  return /closed the connection|connection.*(closed|reset|terminated)|ECONNRESET/i.test(message)
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export const DEFAULT_CHUNK_SIZE = 100
const MAX_ATTEMPTS = 5

/**
 * Rejoue une écriture tant que l'échec est une coupure de connexion.
 *
 * On ne retente JAMAIS une erreur métier (contrainte violée, donnée invalide) :
 * la rejouer donnerait le même échec en masquant le vrai défaut. Entre deux
 * tentatives on ferme explicitement le client — sans ça Prisma peut resservir la
 * même connexion morte — et on attend un délai qui double à chaque essai.
 */
export async function withDbRetry<T>(
  label: string,
  run: () => Promise<T>,
  reconnect?: () => Promise<void>,
): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run()
    } catch (err) {
      if (!isConnectionError(err) || attempt >= MAX_ATTEMPTS) throw err
      const delayMs = 500 * 2 ** (attempt - 1)
      console.warn(
        `[opisto] ${label} — connexion perdue (essai ${attempt}/${MAX_ATTEMPTS}), reconnexion dans ${delayMs} ms`,
      )
      if (reconnect) await reconnect().catch(() => undefined)
      await sleep(delayMs)
    }
  }
}

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

/** Champs écrits à l'identique en création comme en mise à jour. */
function catalogItemData(item: OpistoNormalized, vendorId: string) {
  return {
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
}

/**
 * Écrit les pièces en base, par lots.
 *
 * Le premier run complet est mort en P1017 après ~3 500 pièces : une écriture
 * pièce par pièce, c'était trois allers-retours chacune (upsert, purge des
 * fitments, réécriture), soit ~18 000 requêtes sur une connexion tenue vingt
 * minutes. On regroupe donc par lot : un `$transaction` pour tous les upserts du
 * lot, puis DEUX requêtes pour les fitments de tout le lot — trois requêtes par
 * centaine de pièces au lieu de trois par pièce.
 *
 * Chaque lot est atomique et rejouable : `$transaction` annule tout le lot en cas
 * d'échec, et les upserts sont idempotents sur `(externalSource, externalSourceId)`,
 * donc une reprise après coupure réécrit à l'identique sans doublon.
 */
export async function loadOpistoItems(
  items: OpistoNormalized[],
  db: IngestPrisma = prisma,
  opts: { chunkSize?: number; reconnect?: () => Promise<void> } = {},
): Promise<{ vendorIds: string[]; itemsUpserted: number; fitmentsCreated: number }> {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE
  const reconnect =
    opts.reconnect ?? (db === prisma ? () => prisma.$disconnect() : undefined)
  const vendorCache = new Map<string, string>()
  let itemsUpserted = 0
  let fitmentsCreated = 0

  for (let start = 0; start < items.length; start += chunkSize) {
    const chunk = items.slice(start, start + chunkSize)

    // Les vendeurs d'abord : le cache fait qu'au-delà des premiers lots, cette
    // boucle ne touche plus la base du tout (213 casses pour ~6 000 pièces).
    const vendorIds: string[] = []
    for (const item of chunk) {
      vendorIds.push(
        await withDbRetry('vendeur', () => resolveOpistoVendorId(item, db, vendorCache), reconnect),
      )
    }

    const rows = await withDbRetry(
      `upsert lot ${start + 1}-${start + chunk.length}`,
      () =>
        db.$transaction(
          chunk.map((item, i) =>
            db.catalogItem.upsert({
              where: {
                uq_catalog_items_external: {
                  externalSource: item.externalSource,
                  externalSourceId: item.externalSourceId,
                },
              },
              create: {
                ...catalogItemData(item, vendorIds[i] as string),
                status: 'PUBLISHED',
                aiGenerated: false,
                externalSource: item.externalSource,
                externalSourceId: item.externalSourceId,
              },
              update: catalogItemData(item, vendorIds[i] as string),
            }),
          ),
        ),
      reconnect,
    )
    itemsUpserted += rows.length

    // `$transaction` garde l'ordre : rows[i] correspond à chunk[i].
    const ids = rows.map((r) => r.id)
    const fitments = chunk.flatMap((item, i) =>
      item.fitments.map((f) => ({
        catalogItemId: ids[i] as string,
        brand: f.brand,
        model: f.model,
        engine: f.engine,
        yearFrom: f.yearFrom,
        yearTo: f.yearTo,
      })),
    )

    await withDbRetry(
      'purge fitments',
      () => db.catalogItemFitment.deleteMany({ where: { catalogItemId: { in: ids } } }),
      reconnect,
    )
    if (fitments.length > 0) {
      await withDbRetry(
        'écriture fitments',
        () => db.catalogItemFitment.createMany({ data: fitments }),
        reconnect,
      )
      fitmentsCreated += fitments.length
    }

    console.log(
      `[opisto] écrites ${itemsUpserted}/${items.length} (${fitmentsCreated} fitments, ${vendorCache.size} casses)`,
    )
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
