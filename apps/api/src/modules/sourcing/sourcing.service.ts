// Sourcing — du besoin client aux offres comparées.
//
// Le mode nominal est la SAISIE MANUELLE : l'ops cherche lui-même sur les
// marketplaces, colle les liens des pages vendeur, puis complète prix et délai.
// La recherche agentique (origin AGENT) écrira exactement les mêmes lignes ;
// rien ici ne dépend d'ANTHROPIC_API_KEY.
//
// ⚠ À ne pas confondre avec modules/enrichment/enrichment.sourcing.ts, qui
// cherche des FOURNISSEURS pour une fiche catalogue, en batch nocturne, sans
// prix et sans rattachement à une demande client.

import type { Prisma, SourcingOfferStatus } from '@prisma/client'
import {
  sourcingSearchCreateSchema,
  adminSourcingListQuerySchema,
  offerUrlsSchema,
  offerUpdateSchema,
  offerToPurchaseOrderSchema,
} from 'shared/validators'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  resolveEconomyCategory,
  toFcfa,
  CURRENCY_RATES_FCFA,
  DOWNTIME_COST_PER_DAY,
  type ArbitrageOptionInput,
  type CurrencyCode,
  type LogisticsMode,
  type VehicleEconomyCategory,
} from 'shared/constants'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { createPurchaseOrder } from '../stock/stock.service.js'

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

// ---------------------------------------------------------------------------
// Dossier de sourcing
// ---------------------------------------------------------------------------

const SEARCH_SELECT = {
  id: true,
  origin: true,
  status: true,
  quoteRequestId: true,
  partRequestId: true,
  partName: true,
  oemReference: true,
  vehicleBrand: true,
  vehicleModel: true,
  vehicleYear: true,
  quantity: true,
  model: true,
  startedAt: true,
  finishedAt: true,
  error: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SourcingSearchSelect

const OFFER_SELECT = {
  id: true,
  searchId: true,
  origin: true,
  url: true,
  sourceSite: true,
  supplierName: true,
  channel: true,
  country: true,
  city: true,
  title: true,
  brand: true,
  oemReference: true,
  condition: true,
  source: true,
  priceAmount: true,
  priceCurrency: true,
  priceFcfa: true,
  priceConfirmed: true,
  shippingAmount: true,
  moq: true,
  leadTimeDays: true,
  weightKg: true,
  availability: true,
  contactPhone: true,
  contactEmail: true,
  contactWhatsapp: true,
  confidence: true,
  status: true,
  opsNote: true,
  chosenMode: true,
  purchaseOrderId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.SourcingOfferSelect

/**
 * Crée le dossier de sourcing d'un besoin, ou renvoie celui qui existe déjà :
 * une demande n'a qu'un dossier, sinon les offres se dispersent entre plusieurs
 * écrans et la matrice ne compare plus rien.
 *
 * Un dossier manuel naît en `DONE` — il n'y a rien à attendre, l'ops peut
 * coller ses liens immédiatement.
 */
export async function createSearch(actorId: string, body: unknown) {
  const parsed = sourcingSearchCreateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const input = parsed.data

  const existing = await prisma.sourcingSearch.findFirst({
    where: input.quoteRequestId
      ? { quoteRequestId: input.quoteRequestId }
      : { partRequestId: input.partRequestId },
    orderBy: { createdAt: 'desc' },
    select: SEARCH_SELECT,
  })
  if (existing) return existing

  let snapshot: {
    partName: string
    oemReference: string | null
    vehicleBrand: string | null
    vehicleModel: string | null
    vehicleYear: number | null
    quantity: number
  }

  if (input.quoteRequestId) {
    const lead = await prisma.logisticsQuoteRequest.findUnique({
      where: { id: input.quoteRequestId },
      select: {
        partName: true,
        oemReference: true,
        vehicleBrand: true,
        vehicleModel: true,
        vehicleYear: true,
        quantity: true,
      },
    })
    if (!lead) {
      throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
    }
    snapshot = lead
  } else if (input.partRequestId) {
    const pr = await prisma.partRequest.findUnique({
      where: { id: input.partRequestId },
      select: {
        partName: true,
        description: true,
        oemReference: true,
        vehicle: { select: { brand: true, model: true, year: true } },
      },
    })
    if (!pr) {
      throw new AppError('PART_REQUEST_NOT_FOUND', 404, { message: 'Demande de pièce introuvable' })
    }
    snapshot = {
      partName: pr.partName ?? pr.description ?? 'Pièce non précisée',
      oemReference: pr.oemReference,
      vehicleBrand: pr.vehicle?.brand ?? null,
      vehicleModel: pr.vehicle?.model ?? null,
      vehicleYear: pr.vehicle?.year ?? null,
      quantity: 1,
    }
  } else {
    // Inatteignable : le `refine` du schéma impose l'un des deux rattachements.
    throw new AppError('SOURCING_NO_LINK', 422, {
      message: 'Rattachez le dossier à une demande de cotation ou à une demande de pièce',
    })
  }

  return prisma.sourcingSearch.create({
    data: {
      origin: input.origin,
      status: input.origin === 'MANUAL' ? 'DONE' : 'PENDING',
      quoteRequestId: input.quoteRequestId ?? null,
      partRequestId: input.partRequestId ?? null,
      ...snapshot,
      createdById: actorId,
    },
    select: SEARCH_SELECT,
  })
}

export async function getSearch(id: string) {
  const search = await prisma.sourcingSearch.findUnique({
    where: { id },
    select: {
      ...SEARCH_SELECT,
      offers: { select: OFFER_SELECT, orderBy: { createdAt: 'asc' } },
      quoteRequest: {
        select: {
          id: true,
          reference: true,
          status: true,
          contactName: true,
          phone: true,
          whatsapp: true,
          economyCategory: true,
          energyType: true,
          partCategory: true,
          vehicleImmobilized: true,
        },
      },
    },
  })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Dossier de sourcing introuvable' })
  }
  return search
}

export async function adminListSearches(rawQuery: unknown) {
  const parsed = adminSourcingListQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw validationError(parsed.error)
  const query = parsed.data

  const where: Prisma.SourcingSearchWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.origin && { origin: query.origin }),
    ...(query.q && {
      OR: [
        { partName: { contains: query.q, mode: 'insensitive' as const } },
        { oemReference: { contains: query.q, mode: 'insensitive' as const } },
        { quoteRequest: { reference: { contains: query.q, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.sourcingSearch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...SEARCH_SELECT,
        quoteRequest: { select: { id: true, reference: true, status: true } },
        _count: { select: { offers: true } },
      },
    }),
    prisma.sourcingSearch.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function adminSearchStats() {
  const [byStatus, byOrigin, offersByStatus] = await Promise.all([
    prisma.sourcingSearch.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sourcingSearch.groupBy({ by: ['origin'], _count: { _all: true } }),
    prisma.sourcingOffer.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    byOrigin: Object.fromEntries(byOrigin.map((g) => [g.origin, g._count._all])),
    offersByStatus: Object.fromEntries(offersByStatus.map((g) => [g.status, g._count._all])),
    total: byStatus.reduce((n, g) => n + g._count._all, 0),
  }
}

// ---------------------------------------------------------------------------
// Offres — collage de liens
// ---------------------------------------------------------------------------

/**
 * Canal déduit du domaine. Grossier volontairement : l'ops corrige d'un clic si
 * besoin, et une mauvaise devinette n'a aucune conséquence sur le calcul (seul
 * le pays décide entre achat local et import).
 */
const CHANNEL_BY_HOST: { match: RegExp; channel: 'MARKETPLACE_INTL' | 'LOCAL' | 'EXPORTER' }[] = [
  { match: /(ebay|aliexpress|amazon|alibaba|autodoc|rockauto|partsouq|oscaro|mister-auto)\./, channel: 'MARKETPLACE_INTL' },
  { match: /(goafricaonline|coinafrique|jiji)\./, channel: 'LOCAL' },
  { match: /\.ci$/, channel: 'LOCAL' },
  { match: /(dubizzle|hepsiburada|indiamart)\./, channel: 'EXPORTER' },
]

/** `https://www.ebay.de/itm/123` → `ebay.de`. */
export function hostnameOf(rawUrl: string): string {
  const host = new URL(rawUrl).hostname.toLowerCase()
  return host.startsWith('www.') ? host.slice(4) : host
}

export function guessChannel(sourceSite: string): 'MARKETPLACE_INTL' | 'LOCAL' | 'EXPORTER' {
  return CHANNEL_BY_HOST.find((r) => r.match.test(sourceSite))?.channel ?? 'MARKETPLACE_INTL'
}

/**
 * Le geste central du module : coller des liens de pages vendeur.
 *
 * Une offre n'exige QUE son URL. Le prix, le pays et le délai se complètent
 * ligne par ligne ensuite — exiger un formulaire complet par lien rendrait le
 * collage en masse inutilisable, et c'est précisément l'usage.
 *
 * Recoller un lien déjà présent ne crée pas de doublon (contrainte unique
 * `searchId + url`) : on le compte dans `skipped`.
 */
export async function addOffersFromUrls(searchId: string, actorId: string, body: unknown) {
  const parsed = offerUrlsSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)

  const search = await prisma.sourcingSearch.findUnique({
    where: { id: searchId },
    select: { id: true },
  })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Dossier de sourcing introuvable' })
  }

  // Dédoublonnage à l'intérieur du collage lui-même : la même URL deux fois
  // dans le presse-papier ne doit pas faire échouer le createMany.
  const seen = new Set<string>()
  const rows: Prisma.SourcingOfferCreateManyInput[] = []
  for (const raw of parsed.data.urls) {
    const url = raw.trim()
    let sourceSite: string
    try {
      sourceSite = hostnameOf(url)
    } catch {
      throw new AppError('SOURCING_INVALID_URL', 422, { message: `Lien invalide : ${url}` })
    }
    if (seen.has(url)) continue
    seen.add(url)
    rows.push({
      searchId,
      origin: 'MANUAL',
      url,
      sourceSite,
      channel: guessChannel(sourceSite),
      createdById: actorId,
    })
  }

  const { count } = await prisma.sourcingOffer.createMany({ data: rows, skipDuplicates: true })

  const offers = await prisma.sourcingOffer.findMany({
    where: { searchId },
    orderBy: { createdAt: 'asc' },
    select: OFFER_SELECT,
  })

  return { created: count, skipped: parsed.data.urls.length - count, offers }
}

/**
 * Complétion d'une offre. `priceFcfa` est recalculé dès que le montant ou la
 * devise bouge : c'est lui, et pas `priceAmount`, que lit la matrice.
 */
export async function updateOffer(id: string, body: unknown) {
  const parsed = offerUpdateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const patch = parsed.data

  const current = await prisma.sourcingOffer.findUnique({
    where: { id },
    select: { id: true, priceAmount: true, priceCurrency: true, status: true },
  })
  if (!current) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }
  if (current.status === 'ORDERED' && patch.status && patch.status !== 'ORDERED') {
    throw new AppError('SOURCING_OFFER_ORDERED', 422, {
      message: 'Cette offre a déjà donné lieu à un bon de commande',
    })
  }

  const data: Prisma.SourcingOfferUncheckedUpdateInput = { ...patch }

  const priceTouched = patch.priceAmount !== undefined || patch.priceCurrency !== undefined
  if (priceTouched) {
    const amount = patch.priceAmount !== undefined ? patch.priceAmount : current.priceAmount
    const currency = patch.priceCurrency ?? current.priceCurrency
    data.priceFcfa = toFcfa(amount, currency)
  }

  return prisma.sourcingOffer.update({ where: { id }, data, select: OFFER_SELECT })
}

/** Un lien collé par erreur doit pouvoir disparaître — sauf s'il a été commandé. */
export async function deleteOffer(id: string) {
  const offer = await prisma.sourcingOffer.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!offer) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }
  if (offer.status === 'ORDERED') {
    throw new AppError('SOURCING_OFFER_ORDERED', 422, {
      message: 'Impossible de supprimer une offre commandée',
    })
  }
  await prisma.sourcingOffer.delete({ where: { id } })
  return { id }
}

// ---------------------------------------------------------------------------
// Arbitrage
// ---------------------------------------------------------------------------

/** Offres retenues pour l'arbitrage : la sélection ops si elle existe, sinon tout. */
const MATRIX_STATUSES: SourcingOfferStatus[] = ['SHORTLISTED', 'CONTACTED', 'ORDERED']

/**
 * Construit la matrice d'arbitrage à partir des offres du dossier.
 *
 * Le calcul lui-même n'est PAS refait ici : on se contente de mapper les offres
 * en options et d'appeler `computeArbitrageMatrix()` (packages/shared) — le
 * moteur reste à un seul endroit.
 *
 * ⚠ `computeArbitrageMatrix` indexe ses options par mode : deux offres du même
 * mode ne peuvent pas coexister dans une matrice. On garde la moins chère par
 * mode et on remonte les écartées dans `ignoredOffers`, sinon l'ops croira
 * avoir perdu des offres.
 */
export async function buildOfferMatrix(searchId: string) {
  const search = await prisma.sourcingSearch.findUnique({
    where: { id: searchId },
    select: {
      id: true,
      partName: true,
      oemReference: true,
      vehicleModel: true,
      quoteRequest: {
        select: { partCategory: true, economyCategory: true, energyType: true },
      },
      offers: { select: OFFER_SELECT },
    },
  })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Dossier de sourcing introuvable' })
  }

  const shortlisted = search.offers.filter((o) => MATRIX_STATUSES.includes(o.status))
  const pool = shortlisted.length > 0 ? shortlisted : search.offers.filter((o) => o.status !== 'REJECTED')

  // Une offre sans prix converti ne peut pas être chiffrée : on la signale
  // plutôt que de la faire passer pour gratuite.
  const priced = pool.filter((o) => o.priceFcfa != null)
  const unpriced = pool.filter((o) => o.priceFcfa == null)

  const bestByMode = new Map<LogisticsMode, (typeof priced)[number]>()
  const ignoredOffers: { id: string; reason: string }[] = unpriced.map((o) => ({
    id: o.id,
    reason: 'Prix manquant',
  }))

  for (const offer of priced) {
    const mode = offerMode(offer)
    const current = bestByMode.get(mode)
    if (!current) {
      bestByMode.set(mode, offer)
      continue
    }
    const loser = (offer.priceFcfa ?? 0) < (current.priceFcfa ?? 0) ? current : offer
    const winner = loser === current ? offer : current
    bestByMode.set(mode, winner)
    ignoredOffers.push({
      id: loser.id,
      reason: `Offre plus chère sur le même mode (${mode})`,
    })
  }

  const options: ArbitrageOptionInput[] = []
  const offerIdByMode: Record<string, string> = {}
  for (const [mode, offer] of bestByMode) {
    options.push({
      mode,
      partPrice: offer.priceFcfa ?? 0,
      ...(offer.leadTimeDays != null && { transitDays: offer.leadTimeDays }),
      available: true,
    })
    offerIdByMode[mode] = offer.id
  }

  const economyCategory: VehicleEconomyCategory =
    (search.quoteRequest?.economyCategory as VehicleEconomyCategory | null) ??
    resolveEconomyCategory({
      energyType: search.quoteRequest?.energyType ?? null,
      model: search.vehicleModel,
    })

  const weights = priced.map((o) => o.weightKg).filter((w): w is number => w != null)

  const result = computeArbitrageMatrix({
    downtimeCostPerDay: DOWNTIME_COST_PER_DAY[economyCategory],
    family: matchLogisticsFamily(
      search.partName,
      search.quoteRequest?.partCategory,
      search.oemReference,
    ),
    // Poids réel dès qu'une offre l'annonce : la confiance passe de FAMILY à MEASURED.
    ...(weights.length > 0 && { weightKg: Math.max(...weights) }),
    options,
  })

  return {
    result,
    offerIdByMode,
    ignoredOffers,
    allPricesConfirmed: priced.length > 0 && priced.every((o) => o.priceConfirmed),
    pricedCount: priced.length,
  }
}

/**
 * Mode d'acheminement d'une offre : le mode forcé par l'ops s'il existe, sinon
 * `LOCAL` pour un vendeur ivoirien (pas de fret ni de douane) et l'aérien
 * standard par défaut à l'import.
 */
function offerMode(offer: { country: string | null; chosenMode: string | null }): LogisticsMode {
  if (offer.chosenMode) return offer.chosenMode as LogisticsMode
  if (offer.country?.toUpperCase() === 'CI') return 'LOCAL'
  return 'AIR_STANDARD'
}

// ---------------------------------------------------------------------------
// Passage à la commande
// ---------------------------------------------------------------------------

/**
 * Transforme une offre en bon de commande.
 *
 * `fraisEstimes` (fret / douane / last mile) est calculé par
 * `createPurchaseOrder` lui-même via `computeLandedCost` — on ne le recalcule
 * surtout pas ici, sinon les deux chemins divergeraient.
 *
 * ⚠ `PurchaseOrder.tauxChange` est un entier : sur TRY (≈ 16,4 F) l'arrondi
 * décale le montant estimé de ~3 %. L'ops peut corriger le taux sur le BC ;
 * `SourcingOffer.priceFcfa` reste la référence de l'arbitrage.
 */
export async function createPurchaseOrderFromOffer(offerId: string, actorId: string, body: unknown) {
  const parsed = offerToPurchaseOrderSchema.safeParse(body ?? {})
  if (!parsed.success) throw validationError(parsed.error)

  const offer = await prisma.sourcingOffer.findUnique({
    where: { id: offerId },
    select: {
      ...OFFER_SELECT,
      search: { select: { partName: true, quantity: true, oemReference: true } },
    },
  })
  if (!offer) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }
  if (offer.purchaseOrderId) {
    throw new AppError('SOURCING_OFFER_ORDERED', 422, {
      message: 'Cette offre a déjà un bon de commande',
    })
  }
  if (offer.priceAmount == null) {
    throw new AppError('SOURCING_OFFER_NO_PRICE', 422, {
      message: 'Renseignez le prix de l\'offre avant de créer le bon de commande',
    })
  }

  const supplierName = offer.supplierName?.trim() || offer.sourceSite
  const supplier =
    (await prisma.supplier.findFirst({
      where: {
        nom: { equals: supplierName, mode: 'insensitive' },
        ...(offer.country ? { pays: offer.country } : {}),
      },
      select: { id: true },
    })) ??
    (await prisma.supplier.create({
      data: {
        nom: supplierName,
        pays: offer.country,
        ville: offer.city,
        site: offer.url,
        devise: offer.priceCurrency,
        telephone: offer.contactPhone,
        whatsapp: offer.contactWhatsapp,
        email: offer.contactEmail,
        delaiTypiqueJours: offer.leadTimeDays,
      },
      select: { id: true },
    }))

  const mode = offerMode(offer)
  const rate = CURRENCY_RATES_FCFA[offer.priceCurrency as CurrencyCode] ?? 1

  const po = await createPurchaseOrder(actorId, {
    supplierId: supplier.id,
    destinationId: parsed.data.destinationId ?? undefined,
    mode,
    devise: offer.priceCurrency,
    tauxChange: Math.round(rate),
    notes:
      parsed.data.notes ??
      `Issu du sourcing — ${offer.sourceSite}\n${offer.url}`,
    lines: [
      {
        designation: offer.title ?? offer.search.partName,
        oemReference: offer.oemReference ?? offer.search.oemReference ?? undefined,
        quantite: offer.moq && offer.moq > offer.search.quantity ? offer.moq : offer.search.quantity,
        prixUnitaire: offer.priceAmount,
        ...(offer.weightKg != null && { poidsEstimeKg: offer.weightKg }),
      },
    ],
  })

  await prisma.sourcingOffer.update({
    where: { id: offerId },
    data: { status: 'ORDERED', purchaseOrderId: po.id },
  })

  return po
}
