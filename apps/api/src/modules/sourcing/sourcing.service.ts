// Module Sourcing — de la demande client aux offres arbitrées, puis au bon de
// commande. Mise en œuvre de docs/sourcing-expeditions-plan-2026-08.md.
//
// ⚠ Le moteur d'arbitrage n'est PAS redéfini ici : `buildOfferMatrix` se
// contente de traduire des offres en `ArbitrageOptionInput[]` et délègue à
// `computeArbitrageMatrix()` (packages/shared/constants/logistics.ts). Toute
// règle de coût qui divergerait entre les deux serait un bug de confiance.

import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { enqueue } from '../queue/queueService.js'
import { createPurchaseOrder } from '../stock/stock.service.js'
import { draftSupplierMessage as draftSupplierMessageAgent } from './sourcing.agent.js'
import {
  sourcingSearchCreateSchema,
  offerUpdateSchema,
  adminSourcingListQuerySchema,
  createPurchaseOrderFromOfferSchema,
  sourcingOffersOutputSchema,
} from 'shared/validators'
import type { SourcingOffersOutput } from 'shared/validators'
import {
  computeArbitrageMatrix,
  matchLogisticsFamily,
  resolveEconomyCategory,
  toFcfa,
  currencyRate,
  DOWNTIME_COST_PER_DAY,
  LOGISTICS_MODES,
  type ArbitrageOptionInput,
  type LogisticsMode,
  type PartLogisticsFamily,
} from 'shared/constants'
import type { PartCondition, Prisma, SourcingOffer } from '@prisma/client'

// ---------------------------------------------------------------------------
// Devises
// ---------------------------------------------------------------------------

/**
 * Taux surchargeables par l'environnement (`CURRENCY_RATE_USD=612`). C'est la
 * soupape entre deux déploiements : les constantes de `shared` dérivent avec le
 * marché, l'ops corrige sans toucher au code.
 */
export function currencyOverridesFromEnv(): Record<string, number> {
  const overrides: Record<string, number> = {}
  for (const [key, value] of Object.entries(process.env)) {
    const match = /^CURRENCY_RATE_([A-Z]{3})$/.exec(key)
    if (!match?.[1] || !value) continue
    const rate = Number(value)
    if (Number.isFinite(rate) && rate > 0) overrides[match[1]] = rate
  }
  return overrides
}

const offerPriceFcfa = (amount: number | null | undefined, currency: string | null | undefined) =>
  toFcfa(amount, currency, currencyOverridesFromEnv())

// ---------------------------------------------------------------------------
// Condition
// ---------------------------------------------------------------------------

/**
 * Rattache le libellé brut d'une source à `PartCondition`. La chip de condition
 * est un élément de premier plan (DESIGN.md) : quand le mapping échoue on
 * conserve le libellé d'origine et on n'affiche pas de chip inventée.
 */
export function mapCondition(label: string | null | undefined): PartCondition | null {
  if (!label) return null
  const s = label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
  if (/(reusine|re-usine|reconditionn|refurb|remanufactur|rebuilt)/.test(s)) return 'REFURBISHED'
  if (/(occasion|used|second hand|seconde main|salvage)/.test(s)) return 'USED'
  if (/(neuf|new|genuine|oem|origine|original|aftermarket|brand new)/.test(s)) return 'NEW'
  return null
}

// ---------------------------------------------------------------------------
// Création d'une recherche
// ---------------------------------------------------------------------------

/**
 * Crée la recherche et enqueue son exécution. Une recherche coûte un appel
 * Claude + jusqu'à 12 recherches web : on refuse d'en lancer une seconde tant
 * qu'une est en attente ou en cours sur la même demande (point d'attention n°1
 * du plan).
 */
export async function createSearch(raw: unknown, actorUserId: string) {
  const input = sourcingSearchCreateSchema.parse(raw)

  if (!input.quoteRequestId && !input.partRequestId && !input.partName) {
    throw new AppError('SOURCING_SEARCH_EMPTY', 422, {
      message: 'Indiquez une demande de cotation, une demande de pièce, ou un nom de pièce',
    })
  }

  let snapshot = {
    partName: input.partName ?? '',
    oemReference: input.oemReference ?? null,
    vehicleBrand: input.vehicleBrand ?? null,
    vehicleModel: input.vehicleModel ?? null,
    vehicleYear: input.vehicleYear ?? null,
    quantity: input.quantity ?? 1,
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
    snapshot = {
      partName: input.partName ?? lead.partName,
      oemReference: input.oemReference ?? lead.oemReference,
      vehicleBrand: input.vehicleBrand ?? lead.vehicleBrand,
      vehicleModel: input.vehicleModel ?? lead.vehicleModel,
      vehicleYear: input.vehicleYear ?? lead.vehicleYear,
      quantity: input.quantity ?? lead.quantity,
    }
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
      partName: input.partName ?? pr.partName ?? pr.description ?? '',
      oemReference: input.oemReference ?? pr.oemReference,
      vehicleBrand: input.vehicleBrand ?? pr.vehicle?.brand ?? null,
      vehicleModel: input.vehicleModel ?? pr.vehicle?.model ?? null,
      vehicleYear: input.vehicleYear ?? pr.vehicle?.year ?? null,
      quantity: input.quantity ?? 1,
    }
  }

  if (snapshot.partName.trim().length < 2) {
    throw new AppError('SOURCING_SEARCH_EMPTY', 422, {
      message: 'Nom de pièce manquant : précisez-le pour lancer la recherche',
    })
  }

  const inFlight = await prisma.sourcingSearch.findFirst({
    where: {
      status: { in: ['PENDING', 'RUNNING'] },
      ...(input.quoteRequestId
        ? { quoteRequestId: input.quoteRequestId }
        : input.partRequestId
          ? { partRequestId: input.partRequestId }
          : { partName: snapshot.partName }),
    },
    select: { id: true },
  })
  if (inFlight) {
    throw new AppError('SOURCING_SEARCH_IN_FLIGHT', 409, {
      message: 'Une recherche est déjà en cours pour cette demande',
      searchId: inFlight.id,
    })
  }

  const search = await prisma.sourcingSearch.create({
    data: {
      quoteRequestId: input.quoteRequestId ?? null,
      partRequestId: input.partRequestId ?? null,
      ...snapshot,
      createdById: actorUserId,
    },
  })

  await enqueue('SOURCING_SEARCH_RUN', { searchId: search.id }, { maxAttempts: 1 })

  return search
}

// ---------------------------------------------------------------------------
// Persistance des résultats (appelée par le handler de job)
// ---------------------------------------------------------------------------

/**
 * Écrit les offres d'une recherche. La conversion FCFA est figée ici : le prix
 * affiché plus tard ne bouge pas parce qu'un taux a changé entre-temps.
 * `priceConfirmed` reste faux — seule une vérification ops le passe à vrai.
 */
export async function persistSearchResults(searchId: string, output: SourcingOffersOutput) {
  const parsed = sourcingOffersOutputSchema.parse(output)

  if (parsed.offers.length > 0) {
    await prisma.sourcingOffer.createMany({
      data: parsed.offers.map((offer) => ({
        searchId,
        supplierName: offer.supplierName,
        channel: offer.channel,
        country: offer.country ?? null,
        city: offer.city ?? null,
        url: offer.url ?? null,
        sourceSite: offer.sourceSite ?? null,
        title: offer.title ?? null,
        brand: offer.brand ?? null,
        oemReference: offer.oemReference ?? null,
        conditionLabel: offer.conditionLabel ?? null,
        condition: mapCondition(offer.conditionLabel),
        priceAmount: offer.priceAmount ?? null,
        priceCurrency: offer.priceCurrency?.toUpperCase() ?? null,
        priceFcfa: offerPriceFcfa(offer.priceAmount, offer.priceCurrency),
        shippingAmount: offer.shippingAmount ?? null,
        moq: offer.moq ?? null,
        leadTimeDays: offer.leadTimeDays ?? null,
        weightKg: offer.weightKg ?? null,
        availability: offer.availability ?? null,
        contactPhone: offer.contactPhone ?? null,
        contactEmail: offer.contactEmail ?? null,
        contactWhatsapp: offer.contactWhatsapp ?? null,
        confidence: offer.confidence,
      })),
    })
  }

  return prisma.sourcingSearch.update({
    where: { id: searchId },
    data: {
      status: 'DONE',
      finishedAt: new Date(),
      error: parsed.offers.length === 0 ? (parsed.note ?? 'Aucune offre trouvée') : null,
    },
  })
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

const OFFER_ORDER = [
  { status: 'asc' as const },
  { priceFcfa: 'asc' as const },
] satisfies Prisma.SourcingOfferOrderByWithRelationInput[]

export async function getSearch(id: string) {
  const search = await prisma.sourcingSearch.findUnique({
    where: { id },
    include: {
      offers: { orderBy: OFFER_ORDER },
      quoteRequest: {
        select: {
          id: true,
          reference: true,
          status: true,
          contactName: true,
          phone: true,
          whatsapp: true,
          downtimeCostPerDay: true,
          economyCategory: true,
          energyType: true,
          vehicleModel: true,
          partCategory: true,
          vehicleImmobilized: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
  })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Recherche introuvable' })
  }
  return search
}

export async function adminListSearches(rawQuery: unknown) {
  const query = adminSourcingListQuerySchema.parse(rawQuery)

  const where: Prisma.SourcingSearchWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.quoteRequestId && { quoteRequestId: query.quoteRequestId }),
    ...(query.q && {
      OR: [
        { partName: { contains: query.q, mode: 'insensitive' as const } },
        { oemReference: { contains: query.q, mode: 'insensitive' as const } },
        { vehicleModel: { contains: query.q, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.sourcingSearch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        quoteRequest: { select: { id: true, reference: true } },
        _count: { select: { offers: true } },
      },
    }),
    prisma.sourcingSearch.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function adminSearchStats() {
  const [byStatus, offersByStatus, withPrice] = await Promise.all([
    prisma.sourcingSearch.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sourcingOffer.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sourcingOffer.count({ where: { priceFcfa: { not: null } } }),
  ])

  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    offersByStatus: Object.fromEntries(offersByStatus.map((g) => [g.status, g._count._all])),
    searches: byStatus.reduce((n, g) => n + g._count._all, 0),
    offers: offersByStatus.reduce((n, g) => n + g._count._all, 0),
    offersWithPrice: withPrice,
  }
}

// ---------------------------------------------------------------------------
// Offres
// ---------------------------------------------------------------------------

export async function updateOffer(id: string, raw: unknown) {
  const patch = offerUpdateSchema.parse(raw)
  const current = await prisma.sourcingOffer.findUnique({ where: { id } })
  if (!current) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }
  if (current.status === 'ORDERED' && patch.status && patch.status !== 'ORDERED') {
    throw new AppError('SOURCING_OFFER_LOCKED', 409, {
      message: 'Cette offre est déjà commandée',
    })
  }

  // Un prix corrigé à la main est un prix vérifié : on recalcule le FCFA et on
  // considère l'offre confirmée, sauf indication contraire explicite.
  const priceTouched = patch.priceAmount !== undefined || patch.priceCurrency !== undefined
  const amount = patch.priceAmount !== undefined ? patch.priceAmount : current.priceAmount
  const currency =
    patch.priceCurrency !== undefined ? patch.priceCurrency : current.priceCurrency

  return prisma.sourcingOffer.update({
    where: { id },
    data: {
      ...(patch.status && { status: patch.status }),
      ...(patch.opsNote !== undefined && { opsNote: patch.opsNote }),
      ...(patch.chosenMode !== undefined && { chosenMode: patch.chosenMode }),
      ...(patch.leadTimeDays !== undefined && { leadTimeDays: patch.leadTimeDays }),
      ...(patch.weightKg !== undefined && { weightKg: patch.weightKg }),
      ...(priceTouched && {
        priceAmount: amount,
        priceCurrency: currency?.toUpperCase() ?? null,
        priceFcfa: offerPriceFcfa(amount, currency),
      }),
      ...(patch.priceConfirmed !== undefined
        ? { priceConfirmed: patch.priceConfirmed }
        : priceTouched
          ? { priceConfirmed: true }
          : {}),
    },
  })
}

// ---------------------------------------------------------------------------
// Arbitrage
// ---------------------------------------------------------------------------

/** Pays d'où une pièce arrive par la route, sans fret aérien ni douane import. */
const LOCAL_COUNTRIES = new Set(['CI', 'CIV', "COTE D'IVOIRE", 'COTE DIVOIRE', 'IVORY COAST'])

const normalizeCountry = (country: string | null | undefined) =>
  (country ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()

/**
 * Mode logistique d'une offre — le point le plus sensible de l'arbitrage :
 * c'est lui qui décide du fret, de la douane et du délai, donc du gagnant.
 *
 * Ordre des règles :
 *  1. le mode forcé par l'ops gagne toujours ;
 *  2. vendeur en Côte d'Ivoire → achat local (ni fret ni douane d'import) ;
 *  3. matière restreinte en aérien (batteries, amortisseurs à gaz, composants
 *     HT) → maritime, sinon on chiffrerait un acheminement irréalisable ;
 *  4. colis volumineux (> 150 dm³ ou > 80 kg) → maritime : l'aérien y devient
 *     absurde bien avant que le calcul ne le dise ;
 *  5. sinon aérien standard.
 */
export function resolveOfferMode(
  offer: Pick<SourcingOffer, 'chosenMode' | 'country' | 'weightKg'>,
  family: PartLogisticsFamily | null,
): LogisticsMode {
  if (offer.chosenMode && offer.chosenMode in LOGISTICS_MODES) {
    return offer.chosenMode as LogisticsMode
  }
  if (LOCAL_COUNTRIES.has(normalizeCountry(offer.country))) return 'LOCAL'
  if (family?.airRestricted) return 'SEA_LCL'

  const weight = offer.weightKg ?? family?.weightKgMax ?? 0
  const volume = family?.volumeDm3Max ?? 0
  if (weight > 80 || volume > 150) return 'SEA_LCL'

  return 'AIR_STANDARD'
}

export interface OfferMatrixRow {
  offerId: string
  supplierName: string
  country: string | null
  url: string | null
  condition: PartCondition | null
  conditionLabel: string | null
  priceConfirmed: boolean
  option: ReturnType<typeof computeArbitrageMatrix>['options'][number]
}

/**
 * Matrice d'arbitrage d'une recherche : une ligne par offre retenue, classée
 * par coût total rendu Abidjan (immobilisation comprise).
 *
 * Les offres retenues sont les SHORTLISTED s'il y en a, sinon toutes les
 * candidates avec un prix — arbitrer sur des offres sans prix n'a aucun sens.
 */
export async function buildOfferMatrix(searchId: string) {
  const search = await prisma.sourcingSearch.findUnique({
    where: { id: searchId },
    include: {
      offers: true,
      quoteRequest: {
        select: {
          downtimeCostPerDay: true,
          economyCategory: true,
          energyType: true,
          vehicleModel: true,
          partCategory: true,
        },
      },
    },
  })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Recherche introuvable' })
  }

  const priced = search.offers.filter((o) => o.priceFcfa != null && o.status !== 'REJECTED')
  const shortlisted = priced.filter((o) => o.status === 'SHORTLISTED' || o.status === 'ORDERED')
  const retained = shortlisted.length > 0 ? shortlisted : priced

  const family = matchLogisticsFamily(
    search.partName,
    search.quoteRequest?.partCategory,
    search.oemReference,
  )

  const downtimeCostPerDay =
    search.quoteRequest?.downtimeCostPerDay ??
    DOWNTIME_COST_PER_DAY[
      search.quoteRequest?.economyCategory ??
        resolveEconomyCategory({
          energyType: search.quoteRequest?.energyType ?? null,
          model: search.quoteRequest?.vehicleModel ?? null,
        })
    ]

  // Poids : la première valeur réelle rapportée par une offre fait foi pour
  // toutes (une même pièce pèse le même poids quel que soit le vendeur) ;
  // à défaut, le moteur retombe sur le gabarit de la famille.
  const weightKg = retained.find((o) => o.weightKg != null)?.weightKg ?? undefined

  const inputs = retained.map((offer) => {
    const mode = resolveOfferMode(offer, family)
    // Le délai total = préparation annoncée par le vendeur + acheminement du
    // mode. Ne compter que l'acheminement sous-estimerait l'immobilisation.
    const transitDays = LOGISTICS_MODES[mode].transitDays + (offer.leadTimeDays ?? 0)
    const option: ArbitrageOptionInput = {
      mode,
      partPrice: (offer.priceFcfa ?? 0) * search.quantity,
      transitDays,
      available: offer.status !== 'REJECTED',
    }
    return { offer, option }
  })

  const matrix = computeArbitrageMatrix({
    downtimeCostPerDay,
    weightKg: weightKg ?? undefined,
    family,
    options: inputs.map((i) => i.option),
  })

  // `computeArbitrageMatrix` trie ses options par coût : on réassocie chaque
  // ligne à son offre en consommant les entrées correspondantes, ce qui reste
  // déterministe même quand deux offres partagent mode, prix et délai.
  const pool = [...inputs]
  const rows: OfferMatrixRow[] = matrix.options.map((option) => {
    const index = pool.findIndex(
      (i) =>
        i.option.mode === option.mode &&
        i.option.partPrice === option.partPrice &&
        i.option.transitDays === option.transitDays,
    )
    const matched = index >= 0 ? pool.splice(index, 1)[0] : undefined
    const offer = matched?.offer
    return {
      offerId: offer?.id ?? '',
      supplierName: offer?.supplierName ?? '—',
      country: offer?.country ?? null,
      url: offer?.url ?? null,
      condition: offer?.condition ?? null,
      conditionLabel: offer?.conditionLabel ?? null,
      priceConfirmed: offer?.priceConfirmed ?? false,
      option,
    }
  })

  return {
    searchId: search.id,
    partName: search.partName,
    quantity: search.quantity,
    familyId: matrix.familyId,
    familyLabel: matrix.familyLabel,
    weightKg: matrix.weightKg,
    volumeDm3: matrix.volumeDm3,
    confidence: matrix.confidence,
    downtimeCostPerDay: matrix.downtimeCostPerDay,
    /** Vrai tant qu'AUCUNE offre retenue n'a de prix vérifié — l'UI le signale. */
    pricesUnconfirmed: rows.length > 0 && rows.every((r) => !r.priceConfirmed),
    rows,
  }
}

// ---------------------------------------------------------------------------
// Commande
// ---------------------------------------------------------------------------

/** Fournisseur existant portant ce nom, sinon créé depuis l'offre. */
async function findOrCreateSupplier(offer: SourcingOffer) {
  const existing = await prisma.supplier.findFirst({
    where: { nom: { equals: offer.supplierName, mode: 'insensitive' } },
    select: { id: true },
  })
  if (existing) return existing.id

  const created = await prisma.supplier.create({
    data: {
      nom: offer.supplierName,
      pays: offer.country ?? null,
      ville: offer.city ?? null,
      telephone: offer.contactPhone ?? null,
      whatsapp: offer.contactWhatsapp ?? null,
      email: offer.contactEmail ?? null,
      site: offer.url ?? null,
      devise: offer.priceCurrency ?? 'AED',
      delaiTypiqueJours: offer.leadTimeDays ?? null,
      notes: `Créé automatiquement depuis une offre de sourcing${
        offer.sourceSite ? ` (${offer.sourceSite})` : ''
      }`,
    },
    select: { id: true },
  })
  return created.id
}

/**
 * Transforme une offre en bon de commande. Réutilise `createPurchaseOrder` du
 * module stock : numérotation, frais estimés et calcul du montant restent en un
 * seul endroit.
 */
export async function createPurchaseOrderFromOffer(
  offerId: string,
  actorUserId: string,
  raw: unknown,
) {
  const input = createPurchaseOrderFromOfferSchema.parse(raw ?? {})

  const offer = await prisma.sourcingOffer.findUnique({
    where: { id: offerId },
    include: { search: { select: { id: true, partName: true, quantity: true, oemReference: true, partRequestId: true } } },
  })
  if (!offer) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }
  if (offer.purchaseOrderId) {
    throw new AppError('SOURCING_OFFER_ALREADY_ORDERED', 409, {
      message: 'Un bon de commande existe déjà pour cette offre',
      purchaseOrderId: offer.purchaseOrderId,
    })
  }
  if (offer.priceAmount == null) {
    throw new AppError('SOURCING_OFFER_NO_PRICE', 422, {
      message: 'Prix manquant : confirmez le prix auprès du fournisseur avant de commander',
    })
  }

  const supplierId = await findOrCreateSupplier(offer)
  const family = matchLogisticsFamily(offer.search.partName, offer.oemReference)
  const mode = resolveOfferMode(offer, family)
  const devise = (offer.priceCurrency ?? 'XOF').toUpperCase()
  const taux =
    input.tauxChange ?? Math.round(currencyRate(devise, currencyOverridesFromEnv()) ?? 1)

  const po = await createPurchaseOrder(actorUserId, {
    supplierId,
    ...(input.destinationId ? { destinationId: input.destinationId } : {}),
    mode,
    devise,
    tauxChange: taux,
    notes:
      input.notes ??
      `Issu de la recherche de sourcing ${offer.search.id}${offer.url ? `\n${offer.url}` : ''}`,
    lines: [
      {
        designation: offer.title ?? offer.search.partName,
        ...(offer.oemReference ? { oemReference: offer.oemReference } : {}),
        quantite: offer.search.quantity,
        prixUnitaire: offer.priceAmount,
        ...(offer.weightKg != null ? { poidsEstimeKg: offer.weightKg } : {}),
      },
    ],
  })

  await prisma.sourcingOffer.update({
    where: { id: offer.id },
    data: { status: 'ORDERED', purchaseOrderId: po.id },
  })

  return po
}

// ---------------------------------------------------------------------------
// Message fournisseur
// ---------------------------------------------------------------------------

/**
 * Brouillon d'enquête pour une offre. Rien n'est envoyé ici : la réponse porte
 * le texte et les canaux disponibles (`wa.me`, `mailto:`), l'envoi est une
 * action ops explicite.
 */
export async function draftMessageForOffer(offerId: string) {
  const offer = await prisma.sourcingOffer.findUnique({
    where: { id: offerId },
    include: {
      search: {
        select: {
          partName: true,
          oemReference: true,
          vehicleBrand: true,
          vehicleModel: true,
          vehicleYear: true,
          quantity: true,
        },
      },
    },
  })
  if (!offer) {
    throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  }

  const message = await draftSupplierMessageAgent({
    supplierName: offer.supplierName,
    country: offer.country,
    partName: offer.search.partName,
    oemReference: offer.oemReference ?? offer.search.oemReference,
    vehicle:
      [offer.search.vehicleBrand, offer.search.vehicleModel, offer.search.vehicleYear]
        .filter(Boolean)
        .join(' ') || null,
    quantity: offer.search.quantity,
    offerTitle: offer.title,
    offerUrl: offer.url,
  })

  if (!message) {
    throw new AppError('SOURCING_MESSAGE_UNAVAILABLE', 503, {
      message: 'Rédaction indisponible — réessayez ou écrivez le message à la main',
    })
  }

  const whatsapp = offer.contactWhatsapp ?? offer.contactPhone
  return {
    offerId: offer.id,
    message,
    channels: {
      whatsappUrl: whatsapp
        ? `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
        : null,
      mailto: offer.contactEmail
        ? `mailto:${offer.contactEmail}?body=${encodeURIComponent(message)}`
        : null,
    },
  }
}
