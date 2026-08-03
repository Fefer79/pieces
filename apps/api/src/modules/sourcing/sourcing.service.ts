import type { Prisma, PartCondition } from '@prisma/client'
import {
  sourcingSearchCreateSchema,
  adminSourcingListQuerySchema,
  offerUpdateSchema,
  offerToPurchaseOrderSchema,
} from 'shared/validators'
import type { SourcingOffersOutput } from 'shared/validators'
import {
  toFcfa,
  normalizeCurrency,
  CURRENCY_RATES_FCFA,
  matchLogisticsFamily,
  resolveEconomyCategory,
  DOWNTIME_COST_PER_DAY,
  computeArbitrageMatrix,
  type LogisticsMode,
  type ArbitrageOptionInput,
} from 'shared/constants'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { enqueue } from '../queue/queueService.js'
import { createPurchaseOrder } from '../stock/stock.service.js'
import { runOfferSearch, draftSupplierMessage, sourcingModel } from './sourcing.agent.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

const SEARCH_INCLUDE = {
  offers: { orderBy: [{ status: 'asc' as const }, { confidence: 'desc' as const }] },
  quoteRequest: {
    select: {
      id: true,
      reference: true,
      partName: true,
      vehicleBrand: true,
      vehicleModel: true,
      vehicleYear: true,
      economyCategory: true,
      downtimeCostPerDay: true,
      vehicleImmobilized: true,
    },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.SourcingSearchInclude

// ---------------------------------------------------------------------------
// Recherches
// ---------------------------------------------------------------------------

/**
 * Lance une recherche d'offres sur un besoin. Le snapshot de la requête est figé
 * ici : la demande peut être corrigée ensuite, les offres restent rattachées à
 * ce qui a réellement été cherché.
 *
 * Garde-fou coût (plan, point d'attention n° 1) : une seule recherche active à
 * la fois par demande. Une recherche = 1 appel sonnet + jusqu'à 12 recherches
 * web ; sans cette borne, un double clic double la facture.
 */
export async function createSearch(body: unknown, actorId: string) {
  const parsed = sourcingSearchCreateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const input = parsed.data

  let snapshot = {
    partName: input.partName ?? null,
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
    const request = await prisma.partRequest.findUnique({
      where: { id: input.partRequestId },
      select: {
        partName: true,
        description: true,
        oemReference: true,
        vehicle: { select: { brand: true, model: true, year: true } },
      },
    })
    if (!request) {
      throw new AppError('PART_REQUEST_NOT_FOUND', 404, { message: 'Demande de pièce introuvable' })
    }
    snapshot = {
      partName: input.partName ?? request.partName ?? request.description ?? null,
      oemReference: input.oemReference ?? request.oemReference,
      vehicleBrand: input.vehicleBrand ?? request.vehicle?.brand ?? null,
      vehicleModel: input.vehicleModel ?? request.vehicle?.model ?? null,
      vehicleYear: input.vehicleYear ?? request.vehicle?.year ?? null,
      quantity: input.quantity ?? 1,
    }
  }

  if (!snapshot.partName || snapshot.partName.trim().length < 2) {
    throw new AppError('SOURCING_PART_NAME_REQUIRED', 422, {
      message: 'Le nom de la pièce est requis pour lancer une recherche',
    })
  }

  if (input.quoteRequestId || input.partRequestId) {
    const active = await prisma.sourcingSearch.findFirst({
      where: {
        status: { in: ['PENDING', 'RUNNING'] },
        ...(input.quoteRequestId
          ? { quoteRequestId: input.quoteRequestId }
          : { partRequestId: input.partRequestId }),
      },
      select: { id: true },
    })
    if (active) {
      throw new AppError('SOURCING_SEARCH_ALREADY_RUNNING', 409, {
        message: 'Une recherche est déjà en cours sur cette demande',
        searchId: active.id,
      })
    }
  }

  const search = await prisma.sourcingSearch.create({
    data: {
      quoteRequestId: input.quoteRequestId ?? null,
      partRequestId: input.partRequestId ?? null,
      partName: snapshot.partName.trim(),
      oemReference: snapshot.oemReference,
      vehicleBrand: snapshot.vehicleBrand,
      vehicleModel: snapshot.vehicleModel,
      vehicleYear: snapshot.vehicleYear,
      quantity: snapshot.quantity ?? 1,
      model: sourcingModel(),
      createdById: actorId,
    },
    include: SEARCH_INCLUDE,
  })

  await enqueue('SOURCING_SEARCH_RUN', { searchId: search.id })
  return search
}

/** Condition catalogue déduite du libellé libre renvoyé par l'agent. */
export function mapCondition(label: string | null | undefined): PartCondition | null {
  if (!label) return null
  const normalized = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (/(neuf|new|neuve|brand ?new|nouveau)/.test(normalized)) return 'NEW'
  if (/(reusine|reconditionne|refurb|remanufactur|rebuilt|echange standard)/.test(normalized)) {
    return 'REFURBISHED'
  }
  if (/(occasion|used|second ?hand|depose|salvage)/.test(normalized)) return 'USED'
  return null
}

/** Exécuté par le worker (handler SOURCING_SEARCH_RUN). Renvoie le nombre d'offres écrites. */
export async function runSourcingSearch(searchId: string, logger?: Logger): Promise<number> {
  const search = await prisma.sourcingSearch.findUnique({ where: { id: searchId } })
  if (!search) {
    throw new AppError('SOURCING_SEARCH_NOT_FOUND', 404, { message: 'Recherche introuvable' })
  }

  await prisma.sourcingSearch.update({
    where: { id: searchId },
    data: { status: 'RUNNING', startedAt: new Date(), error: null },
  })

  const result = await runOfferSearch(
    {
      partName: search.partName,
      oemReference: search.oemReference,
      vehicleBrand: search.vehicleBrand,
      vehicleModel: search.vehicleModel,
      vehicleYear: search.vehicleYear,
      quantity: search.quantity,
    },
    logger,
  )

  if (!result) {
    await prisma.sourcingSearch.update({
      where: { id: searchId },
      data: {
        status: 'FAILED',
        finishedAt: new Date(),
        error: 'Aucune sortie exploitable de l\'agent',
      },
    })
    throw new AppError('SOURCING_AGENT_FAILED', 502, {
      message: 'L\'agent de recherche n\'a rien renvoyé d\'exploitable',
    })
  }

  const rows = buildOfferRows(searchId, result)
  if (rows.length > 0) {
    await prisma.sourcingOffer.createMany({ data: rows })
  }

  await prisma.sourcingSearch.update({
    where: { id: searchId },
    data: {
      status: 'DONE',
      finishedAt: new Date(),
      error: rows.length === 0 ? (result.note ?? 'Aucune offre trouvée') : null,
    },
  })

  return rows.length
}

/**
 * Conversion sortie agent → lignes SourcingOffer. Extrait pour être testable
 * sans base : c'est ici que se fait la bascule FCFA, et que `priceConfirmed`
 * reste à false — un prix issu du web n'engage personne tant qu'un opérateur
 * ne l'a pas vérifié.
 */
export function buildOfferRows(
  searchId: string,
  result: SourcingOffersOutput,
): Prisma.SourcingOfferCreateManyInput[] {
  return result.offres.map((o) => ({
    searchId,
    supplierName: o.fournisseur,
    channel: o.canal,
    country: o.pays ?? null,
    city: o.ville ?? null,
    url: o.url ?? null,
    sourceSite: o.site ?? null,
    title: o.titre ?? null,
    brand: o.marque ?? null,
    oemReference: o.reference_oem ?? null,
    conditionLabel: o.etat ?? null,
    condition: mapCondition(o.etat),
    priceAmount: o.prix ?? null,
    priceCurrency: normalizeCurrency(o.devise) ?? o.devise ?? null,
    priceFcfa: toFcfa(o.prix, o.devise),
    priceConfirmed: false,
    shippingAmount: o.frais_livraison ?? null,
    moq: o.quantite_minimale ?? null,
    leadTimeDays: o.delai_jours != null ? Math.round(o.delai_jours) : null,
    weightKg: o.poids_kg ?? null,
    availability: o.disponibilite ?? null,
    contactPhone: o.telephone ?? null,
    contactEmail: o.email ?? null,
    contactWhatsapp: o.whatsapp ?? null,
    confidence: o.confiance,
  }))
}

export async function getSearch(id: string) {
  const search = await prisma.sourcingSearch.findUnique({ where: { id }, include: SEARCH_INCLUDE })
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
        { vehicleBrand: { contains: query.q, mode: 'insensitive' as const } },
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
  const [byStatus, offersByStatus] = await Promise.all([
    prisma.sourcingSearch.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.sourcingOffer.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    offersByStatus: Object.fromEntries(offersByStatus.map((g) => [g.status, g._count._all])),
    total: byStatus.reduce((n, g) => n + g._count._all, 0),
  }
}

// ---------------------------------------------------------------------------
// Offres
// ---------------------------------------------------------------------------

export async function updateOffer(id: string, body: unknown) {
  const parsed = offerUpdateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const patch = parsed.data

  const offer = await prisma.sourcingOffer.findUnique({ where: { id } })
  if (!offer) throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  if (offer.status === 'ORDERED' && patch.status && patch.status !== 'ORDERED') {
    throw new AppError('SOURCING_OFFER_ORDERED', 409, {
      message: 'Cette offre a déjà donné lieu à un bon de commande',
    })
  }

  // Un prix corrigé à la main par l'ops repasse toujours par la conversion :
  // priceFcfa ne doit jamais désigner autre chose que priceAmount × taux.
  const priceAmount = patch.priceAmount !== undefined ? patch.priceAmount : offer.priceAmount
  const priceCurrency =
    patch.priceCurrency !== undefined ? patch.priceCurrency : offer.priceCurrency
  const priceTouched = patch.priceAmount !== undefined || patch.priceCurrency !== undefined

  return prisma.sourcingOffer.update({
    where: { id },
    data: {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.opsNote !== undefined && { opsNote: patch.opsNote }),
      ...(patch.chosenMode !== undefined && { chosenMode: patch.chosenMode }),
      ...(patch.priceConfirmed !== undefined && { priceConfirmed: patch.priceConfirmed }),
      ...(patch.leadTimeDays !== undefined && { leadTimeDays: patch.leadTimeDays }),
      ...(patch.weightKg !== undefined && { weightKg: patch.weightKg }),
      ...(priceTouched && {
        priceAmount,
        priceCurrency,
        priceFcfa: toFcfa(priceAmount, priceCurrency),
      }),
    },
  })
}

/**
 * Mode logistique d'une offre — le point le plus fragile du module, puisque
 * c'est lui qui décide de l'arbitrage.
 *
 * Règles, dans l'ordre :
 * 1. Un mode forcé par l'ops gagne toujours.
 * 2. Côte d'Ivoire → achat local (pas de fret, pas de douane).
 * 3. Colis lourd (> 100 kg) → maritime groupage : l'aérien y devient absurde.
 * 4. Délai annoncé très court (≤ 5 j) depuis l'étranger → aérien express.
 * 5. Sinon aérien standard.
 */
export function resolveOfferMode(offer: {
  chosenMode?: string | null
  country?: string | null
  weightKg?: number | null
  leadTimeDays?: number | null
}): LogisticsMode {
  if (offer.chosenMode) return offer.chosenMode as LogisticsMode

  const country = (offer.country ?? '').trim().toLowerCase()
  const isLocal =
    country === 'ci' ||
    country === 'civ' ||
    country.includes("côte d'ivoire") ||
    country.includes('cote d\'ivoire') ||
    country.includes('ivory coast')
  if (isLocal) return 'LOCAL'

  if ((offer.weightKg ?? 0) > 100) return 'SEA_LCL'
  if (offer.leadTimeDays != null && offer.leadTimeDays <= 5) return 'AIR_NOW'
  return 'AIR_STANDARD'
}

/**
 * Matrice d'arbitrage d'une recherche : compare les offres retenues au coût
 * RENDU Abidjan, immobilisation comprise. Le calcul lui-même reste dans
 * computeArbitrageMatrix() — ici on ne fait que le mapping.
 *
 * Ne prend que les offres shortlistées (ou toutes celles qui ont un prix si
 * aucune ne l'est encore) : arbitrer sur des candidats non triés n'a pas de sens.
 */
export async function buildOfferMatrix(searchId: string) {
  const search = await prisma.sourcingSearch.findUnique({
    where: { id: searchId },
    include: {
      offers: true,
      quoteRequest: {
        select: {
          economyCategory: true,
          downtimeCostPerDay: true,
          energyType: true,
          vehicleModel: true,
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

  const family = matchLogisticsFamily(search.partName, search.oemReference)
  const category =
    search.quoteRequest?.economyCategory ??
    resolveEconomyCategory({
      energyType: search.quoteRequest?.energyType,
      model: search.quoteRequest?.vehicleModel ?? search.vehicleModel,
    })
  const downtimeCostPerDay =
    search.quoteRequest?.downtimeCostPerDay ?? DOWNTIME_COST_PER_DAY[category]

  // Poids : le plus fiable des poids annoncés par les offres retenues, sinon
  // laissé à l'estimation par famille du moteur.
  const weights = retained.map((o) => o.weightKg).filter((w): w is number => w != null && w > 0)
  const weightKg = weights.length > 0 ? Math.max(...weights) : undefined

  const options: ArbitrageOptionInput[] = retained.map((offer) => ({
    mode: resolveOfferMode(offer),
    partPrice: offer.priceFcfa ?? 0,
    ...(offer.leadTimeDays != null && { transitDays: offer.leadTimeDays }),
    available: offer.status !== 'REJECTED',
  }))

  const matrix =
    options.length > 0
      ? computeArbitrageMatrix({ downtimeCostPerDay, family, weightKg, options })
      : null

  // L'index d'origine se perd au tri du moteur : on ré-associe par mode + prix.
  const offersByKey = new Map(
    retained.map((o) => [`${resolveOfferMode(o)}|${o.priceFcfa}`, o] as const),
  )

  return {
    searchId,
    downtimeCostPerDay,
    familyId: family?.id ?? null,
    /** Vrai tant qu'aucun prix retenu n'a été confirmé par l'ops. */
    allPricesUnconfirmed: retained.length > 0 && retained.every((o) => !o.priceConfirmed),
    unconfirmedCount: retained.filter((o) => !o.priceConfirmed).length,
    matrix,
    options:
      matrix?.options.map((option) => {
        const offer = offersByKey.get(`${option.mode}|${option.partPrice}`)
        return {
          ...option,
          offerId: offer?.id ?? null,
          supplierName: offer?.supplierName ?? null,
          country: offer?.country ?? null,
          url: offer?.url ?? null,
          condition: offer?.condition ?? null,
          conditionLabel: offer?.conditionLabel ?? null,
          priceConfirmed: offer?.priceConfirmed ?? false,
        }
      }) ?? [],
  }
}

/**
 * Génère le bon de commande à partir d'une offre retenue. Le fournisseur est
 * créé s'il n'existe pas encore (find-or-create sur le nom + pays) : l'ops ne
 * doit pas avoir à créer une fiche fournisseur à la main avant de commander.
 */
export async function createPurchaseOrderFromOffer(offerId: string, body: unknown, actorId: string) {
  const parsed = offerToPurchaseOrderSchema.safeParse(body ?? {})
  if (!parsed.success) throw validationError(parsed.error)
  const input = parsed.data

  const offer = await prisma.sourcingOffer.findUnique({
    where: { id: offerId },
    include: { search: true },
  })
  if (!offer) throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })
  if (offer.purchaseOrderId) {
    throw new AppError('SOURCING_OFFER_ORDERED', 409, {
      message: 'Cette offre a déjà un bon de commande',
      purchaseOrderId: offer.purchaseOrderId,
    })
  }
  if (offer.priceAmount == null) {
    throw new AppError('SOURCING_OFFER_NO_PRICE', 422, {
      message: 'Renseignez un prix sur l\'offre avant de générer le bon de commande',
    })
  }

  const supplier =
    (await prisma.supplier.findFirst({
      where: {
        nom: { equals: offer.supplierName, mode: 'insensitive' },
        ...(offer.country ? { pays: offer.country } : {}),
      },
    })) ??
    (await prisma.supplier.create({
      data: {
        nom: offer.supplierName,
        pays: offer.country ?? null,
        ville: offer.city ?? null,
        telephone: offer.contactPhone ?? null,
        whatsapp: offer.contactWhatsapp ?? null,
        email: offer.contactEmail ?? null,
        site: offer.url ?? null,
        devise: normalizeCurrency(offer.priceCurrency) ?? 'FCFA',
        delaiTypiqueJours: offer.leadTimeDays ?? null,
      },
    }))

  const devise = normalizeCurrency(offer.priceCurrency) ?? 'FCFA'
  const tauxChange = input.tauxChange ?? Math.round(CURRENCY_RATES_FCFA[devise] ?? 1)
  const quantite = input.quantite ?? offer.search.quantity ?? 1
  const mode = resolveOfferMode(offer)

  const po = await createPurchaseOrder(actorId, {
    supplierId: supplier.id,
    ...(input.destinationId && { destinationId: input.destinationId }),
    mode,
    devise,
    tauxChange,
    notes:
      input.notes ??
      `Généré depuis l'offre « ${offer.title ?? offer.supplierName} »${offer.url ? ` — ${offer.url}` : ''}`,
    lines: [
      {
        designation: offer.title ?? offer.search.partName,
        oemReference: offer.oemReference ?? offer.search.oemReference ?? undefined,
        quantite,
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

/**
 * Brouillon de message d'enquête. On renvoie le texte ET les liens d'envoi :
 * l'envoi reste une action explicite de l'ops, jamais un effet de bord de la
 * génération.
 */
export async function buildSupplierMessage(offerId: string, logger?: Logger) {
  const offer = await prisma.sourcingOffer.findUnique({
    where: { id: offerId },
    include: { search: true },
  })
  if (!offer) throw new AppError('SOURCING_OFFER_NOT_FOUND', 404, { message: 'Offre introuvable' })

  const vehicle = [offer.search.vehicleBrand, offer.search.vehicleModel, offer.search.vehicleYear]
    .filter(Boolean)
    .join(' ')

  const message = await draftSupplierMessage(
    {
      supplierName: offer.supplierName,
      country: offer.country,
      partName: offer.search.partName,
      oemReference: offer.oemReference ?? offer.search.oemReference,
      vehicle: vehicle || null,
      quantity: offer.search.quantity,
      offerUrl: offer.url,
    },
    logger,
  )

  if (!message) {
    throw new AppError('SOURCING_MESSAGE_FAILED', 502, {
      message: 'Le brouillon n\'a pas pu être généré',
    })
  }

  const digits = (offer.contactWhatsapp ?? offer.contactPhone ?? '').replace(/[^\d]/g, '')
  return {
    message,
    whatsappUrl: digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null,
    mailtoUrl: offer.contactEmail
      ? `mailto:${offer.contactEmail}?subject=${encodeURIComponent(
          `Demande de prix — ${offer.search.partName}`,
        )}&body=${encodeURIComponent(message)}`
      : null,
  }
}
