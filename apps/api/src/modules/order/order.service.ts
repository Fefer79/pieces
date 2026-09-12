import { randomBytes } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { canTransition, isImportOnlyStatus } from './order.stateMachine.js'
import { recomputeVendorScore } from '../vendor/vendorScore.service.js'
import { getOrCreateInvoiceForOrder } from '../enterprise/invoice.service.js'
import { consumeStockForOrder, restockForOrder } from '../catalog/stock.service.js'
import { refundAllHeldEscrows } from '../payment/payment.service.js'
import {
  computeDeliveryFee,
  DELIVERY_MODES,
  type DeliveryPricingMode,
  type DeliveryPricingTier,
  type DeliveryVendorGroup,
  computeImportQuote,
  computePreorderSchedule,
  importQuoteOptions,
  parseImportFreightMode,
  type ImportFreightMode,
  type ImportQuoteItem,
} from 'shared/constants'
import { currentTier } from '../enterprise/subscription.service.js'

const DELIVERED_STATUSES = new Set(['DELIVERED', 'CONFIRMED', 'COMPLETED'])

// Fire-and-forget rescore for every vendor referenced by an order's items.
// Errors are swallowed: a scoring miss should never break the parent flow.
function rescoreOrderVendors(orderId: string) {
  void (async () => {
    try {
      const items = await prisma.orderItem.findMany({
        where: { orderId },
        select: { vendorId: true },
        distinct: ['vendorId'],
      })
      await Promise.all(items.map((i) => recomputeVendorScore(i.vendorId)))
    } catch {
      // Swallow — scoring is best-effort.
    }
  })()
}

const COD_MAX_AMOUNT = 75_000

/** Mode retenu quand l'acheteur n'a pas encore tranché — le compromis délai/prix. */
const DEFAULT_DELIVERY_MODE: DeliveryPricingMode = 'STANDARD'

/**
 * Champs de ligne de commande exposables à un client ou à un vendeur.
 *
 * L'énumération est explicite pour EXCLURE `sourceCostSnapshot` — notre coût
 * d'achat chez le partenaire d'import. Un `items: true` le ferait remonter dans
 * la charge utile de /choose, du panier et de l'historique, et la marge de
 * 100 % se lirait dans l'onglet réseau du navigateur. Toute nouvelle colonne
 * interne s'ajoute au schéma, pas ici.
 */
const ORDER_ITEM_PUBLIC_SELECT = {
  id: true,
  orderId: true,
  catalogItemId: true,
  vendorId: true,
  vendorShopName: true,
  name: true,
  category: true,
  subcategory: true,
  priceSnapshot: true,
  quantity: true,
  imageThumbUrl: true,
  condition: true,
  partSource: true,
  supplyMode: true,
  originCountry: true,
  warrantyValue: true,
  warrantyUnit: true,
  commissionAmount: true,
  createdAt: true,
} as const

/** Inclusion des lignes, expurgée des champs internes. */
const publicItemsInclude = { items: { select: ORDER_ITEM_PUBLIC_SELECT } } as const

/**
 * Regroupe les lignes d'une commande par vendeur : chacun expédie séparément,
 * donc chacun a son sous-total (taux) et son gabarit (plancher). Même forme en
 * entrée de `computeDeliveryFee` que la commande soit en cours de création
 * (lignes à créer) ou déjà persistée (OrderItem).
 */
function vendorGroupsOf(
  items: Array<{
    vendorId: string
    priceSnapshot: number
    quantity: number
    category: string | null
  }>,
): DeliveryVendorGroup[] {
  const byVendor = new Map<string, DeliveryVendorGroup>()
  for (const i of items) {
    const group = byVendor.get(i.vendorId) ?? { subtotal: 0, categories: [] }
    group.subtotal += i.priceSnapshot * i.quantity
    group.categories.push(i.category)
    byVendor.set(i.vendorId, group)
  }
  return [...byVendor.values()]
}

/** Palier de livraison d'une commande déjà créée (l'abonnement peut avoir changé depuis). */
async function tierOfOrder(enterpriseId: string | null): Promise<DeliveryPricingTier> {
  return enterpriseId ? currentTier(enterpriseId) : 'FREE'
}

/**
 * Tarif des trois modes pour une commande donnée. Calculé serveur-side avec le
 * même helper que `createOrder`, pour que l'acheteur qui paie voie exactement
 * ce qui lui sera facturé s'il change de mode.
 */
function deliveryOptionsFor(args: {
  tier: DeliveryPricingTier
  commune: string | null
  vendors: DeliveryVendorGroup[]
}): Array<{ mode: DeliveryPricingMode; label: string; detail: string; fee: number | null }> {
  return DELIVERY_MODES.map(({ mode, label, detail }) => ({
    mode,
    label,
    detail,
    fee: computeDeliveryFee({
      tier: args.tier,
      mode,
      commune: args.commune,
      vendors: args.vendors,
    }),
  }))
}

/**
 * Lot d'import d'une commande déjà persistée, pour re-chiffrer fret et douane.
 *
 * Requête DÉDIÉE plutôt que réutilisation des lignes déjà chargées : celles-ci
 * partent au client et n'embarquent donc pas `sourceCostSnapshot`
 * (ORDER_ITEM_PUBLIC_SELECT). Or c'est précisément le coût d'achat qui sert de
 * base douanière. Le résultat de cette requête ne quitte jamais le serveur.
 *
 * Le poids n'est pas figé dans l'OrderItem : il est réestimé depuis le nom et
 * la catégorie, comme au moment de la commande.
 */
async function loadImportQuoteItems(orderId: string): Promise<ImportQuoteItem[]> {
  const items = await prisma.orderItem.findMany({
    where: { orderId, supplyMode: 'IMPORT' },
    select: {
      name: true,
      category: true,
      quantity: true,
      weightKg: true,
      sourceCostSnapshot: true,
      priceSnapshot: true,
    },
  })
  return items.map((i) => ({
    name: i.name,
    category: i.category,
    quantity: i.quantity,
    weightKg: i.weightKg,
    customsValue: i.sourceCostSnapshot ?? i.priceSnapshot,
  }))
}

/**
 * Les trois acheminements chiffrés pour une commande d'import, avec l'échéancier
 * que chacun implique. Le client arbitre là-dessus ; le coût d'achat qui sert de
 * base douanière ne sort pas d'ici.
 */
function importOptionsFor(args: {
  importItems: ImportQuoteItem[]
  partsTotal: number
  deliveryFee: number
}) {
  return importQuoteOptions(args.importItems).map((quote) => ({
    mode: quote.mode,
    label: quote.label,
    detail: quote.detail,
    transitDays: quote.transitDays,
    freightFee: quote.freightFee,
    customsFee: quote.customsFee,
    available: quote.available,
    warnings: quote.warnings,
    ...computePreorderSchedule({
      partsTotal: args.partsTotal,
      freightFee: quote.freightFee,
      customsFee: quote.customsFee,
      deliveryFee: args.deliveryFee,
    }),
  }))
}

function generateShareToken(): string {
  return randomBytes(16).toString('hex')
}

// Identité du demandeur pour les contrôles d'accès commande.
export type OrderRequester = { id: string; roles: string[] }

// Le user possède-t-il un des vendeurs présents sur la commande ?
async function userOwnsVendorOnOrder(
  userId: string,
  items: { vendorId: string }[],
): Promise<boolean> {
  const vendorIds = [...new Set(items.map((i) => i.vendorId))]
  if (vendorIds.length === 0) return false
  const vendor = await prisma.vendor.findFirst({
    where: { userId, id: { in: vendorIds } },
    select: { id: true },
  })
  return vendor !== null
}

// Autorise la LECTURE d'une commande : admin, initiateur, membre de l'entreprise
// rattachée, ou vendeur d'un article. Sinon 403. Empêche l'IDOR (lecture par id).
async function assertOrderReadAccess(
  order: { initiatorId: string; enterpriseId: string | null; items: { vendorId: string }[] },
  requester: OrderRequester,
): Promise<void> {
  if (requester.roles.includes('ADMIN')) return
  if (order.initiatorId === requester.id) return
  if (order.enterpriseId) {
    const member = await prisma.enterpriseMember.findUnique({
      where: { uq_enterprise_member: { enterpriseId: order.enterpriseId, userId: requester.id } },
      select: { id: true },
    })
    if (member) return
  }
  if (await userOwnsVendorOnOrder(requester.id, order.items)) return
  throw new AppError('ORDER_FORBIDDEN', 403, { message: "Vous n'avez pas accès à cette commande" })
}

// Somme des quantités par pièce (un même catalogItemId peut apparaître plusieurs fois).
function qtyMapFromItems(
  items: { catalogItemId: string; quantity?: number }[],
): Map<string, number> {
  const qtyById = new Map<string, number>()
  for (const i of items) {
    const qty = i.quantity && i.quantity > 0 ? i.quantity : 1
    qtyById.set(i.catalogItemId, (qtyById.get(i.catalogItemId) ?? 0) + qty)
  }
  return qtyById
}

// Verrouille les prix depuis le catalogue (pièces publiées + en stock) et
// construit le payload OrderItem + le total. Partagé entre createOrder et upsertDraft.
async function buildOrderItems(qtyById: Map<string, number>) {
  const catalogItems = await prisma.catalogItem.findMany({
    where: {
      id: { in: [...qtyById.keys()] },
      status: 'PUBLISHED',
      inStock: true,
    },
    select: {
      id: true,
      name: true,
      category: true,
      subcategory: true,
      price: true,
      imageThumbUrl: true,
      condition: true,
      partSource: true,
      supplyMode: true,
      originCountry: true,
      supplierLeadDays: true,
      weightKg: true,
      sourceCostFcfa: true,
      vendorId: true,
      commissionAmount: true,
      stockQuantity: true,
      warrantyValue: true,
      warrantyUnit: true,
      vendor: { select: { id: true, shopName: true, status: true } },
    },
  })

  if (catalogItems.length === 0) {
    throw new AppError('ORDER_NO_VALID_ITEMS', 400, { message: 'Aucun article valide trouvé' })
  }

  // Quantité suivie : impossible de commander plus que le stock disponible.
  for (const item of catalogItems) {
    const requested = qtyById.get(item.id) ?? 1
    if (item.stockQuantity !== null && requested > item.stockQuantity) {
      throw new AppError('ORDER_INSUFFICIENT_STOCK', 400, {
        message: `Stock insuffisant pour « ${item.name ?? 'Pièce'} » : ${item.stockQuantity} disponible(s), ${requested} demandée(s)`,
      })
    }
  }

  const totalAmount = catalogItems.reduce(
    (sum, item) => sum + (item.price ?? 0) * (qtyById.get(item.id) ?? 1),
    0,
  )

  const create = catalogItems.map((item) => ({
    catalogItemId: item.id,
    vendorId: item.vendorId,
    vendorShopName: item.vendor.shopName,
    name: item.name ?? 'Pièce',
    category: item.category,
    subcategory: item.subcategory,
    priceSnapshot: item.price ?? 0,
    quantity: qtyById.get(item.id) ?? 1,
    condition: item.condition,
    partSource: item.partSource,
    supplyMode: item.supplyMode,
    originCountry: item.originCountry,
    // Coût d'achat figé — INTERNE (marge réalisée, reporting finance). Ne doit
    // apparaître dans aucune réponse acheteur.
    sourceCostSnapshot: item.sourceCostFcfa,
    // Figé pour que le fret ne soit pas recalculé sur une estimation de
    // famille au moment du paiement — le montant annoncé ne doit pas bouger.
    weightKg: item.weightKg,
    // Snapshot de la garantie : ce qui a été promis à l'achat reste opposable.
    warrantyValue: item.warrantyValue,
    warrantyUnit: item.warrantyUnit,
    commissionAmount: item.commissionAmount,
    imageThumbUrl: item.imageThumbUrl,
  }))

  // Lot d'import, pour le devis fret + douane. La valeur en douane est le coût
  // d'achat réel (repli sur le prix public si la fiche n'en a pas) : elle ne
  // quitte jamais le serveur.
  const importItems: ImportQuoteItem[] = catalogItems
    .filter((item) => item.supplyMode === 'IMPORT')
    .map((item) => ({
      name: item.name,
      category: item.category,
      weightKg: item.weightKg,
      quantity: qtyById.get(item.id) ?? 1,
      customsValue: item.sourceCostFcfa ?? item.price ?? 0,
    }))

  // Une commande est entièrement locale ou entièrement d'import : les deux
  // n'ont ni le même échéancier de paiement (une fois / acompte + solde) ni le
  // même délai (48 h / plusieurs semaines). Les mélanger obligerait à bloquer
  // des pièces disponibles en attendant un bateau.
  const importCount = importItems.length
  if (importCount > 0 && importCount < catalogItems.length) {
    throw new AppError('ORDER_MIXED_SUPPLY_MODE', 400, {
      message:
        'Les pièces à importer se commandent séparément des pièces disponibles à Abidjan',
    })
  }

  return { create, totalAmount, importItems, isImport: importCount > 0 }
}

/**
 * Chiffrage d'une précommande d'import : acheminement choisi, fret, douane, et
 * l'échéancier acompte / solde qui en découle.
 *
 * Si l'acheminement demandé n'est pas praticable pour ce lot (bateau sur une
 * petite pièce, aérien sur une batterie), on bascule sur la première option
 * disponible plutôt que de vendre un acheminement impossible.
 */
function buildPreorder(input: {
  importItems: ImportQuoteItem[]
  logisticsMode?: ImportFreightMode
  partsTotal: number
  deliveryFee: number
}) {
  const requested = parseImportFreightMode(input.logisticsMode)
  let quote = computeImportQuote(input.importItems, requested)
  if (!quote.available) {
    const fallback = importQuoteOptions(input.importItems).find((o) => o.available)
    if (fallback) quote = fallback
  }

  return {
    mode: quote.mode,
    freightFee: quote.freightFee,
    customsFee: quote.customsFee,
    schedule: computePreorderSchedule({
      partsTotal: input.partsTotal,
      freightFee: quote.freightFee,
      customsFee: quote.customsFee,
      deliveryFee: input.deliveryFee,
    }),
  }
}

export async function createOrder(
  initiatorId: string,
  items: { catalogItemId: string; quantity?: number }[],
  options: {
    ownerPhone?: string
    laborCost?: number
    vehicleId?: string
    deliveryCommune?: string
    deliveryMode?: DeliveryPricingMode
    logisticsMode?: ImportFreightMode
    payerMode?: 'SELF' | 'OWNER_LINK'
  } = {},
) {
  const qtyById = qtyMapFromItems(items)

  // Validate vehicle access if a vehicleId is provided
  let vehicleId: string | undefined
  let enterpriseId: string | undefined
  if (options.vehicleId) {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: options.vehicleId },
      select: { id: true, userId: true, enterpriseId: true },
    })
    if (!vehicle) {
      throw new AppError('VEHICLE_NOT_FOUND', 404, { message: 'Véhicule introuvable' })
    }

    const ownsDirectly = vehicle.userId === initiatorId
    let memberOfEnterprise = false
    if (vehicle.enterpriseId) {
      const membership = await prisma.enterpriseMember.findUnique({
        where: {
          uq_enterprise_member: { enterpriseId: vehicle.enterpriseId, userId: initiatorId },
        },
        select: { id: true },
      })
      memberOfEnterprise = membership !== null
    }
    if (!ownsDirectly && !memberOfEnterprise) {
      throw new AppError('VEHICLE_FORBIDDEN', 403, {
        message: "Vous n'avez pas accès à ce véhicule",
      })
    }

    vehicleId = vehicle.id
    enterpriseId = vehicle.enterpriseId ?? undefined
  }

  const { create, totalAmount, importItems, isImport } = await buildOrderItems(qtyById)
  const shareToken = generateShareToken()

  // Frais de livraison : % du sous-total par vendeur (chacun expédie séparément),
  // plancher zone / plafond palier — voir shared/constants/delivery-pricing.ts.
  // Le palier vient de l'abonnement actif de l'entreprise rattachée au véhicule
  // (essai 30 j inclus). Calculé serveur-side, jamais confié au client.
  const deliveryCommune = options.deliveryCommune?.trim() || undefined
  const deliveryMode: DeliveryPricingMode = options.deliveryMode ?? DEFAULT_DELIVERY_MODE
  const tier: DeliveryPricingTier = enterpriseId ? await currentTier(enterpriseId) : 'FREE'
  const deliveryFee =
    computeDeliveryFee({
      tier,
      mode: deliveryMode,
      commune: deliveryCommune,
      vendors: vendorGroupsOf(create),
    }) ?? 0

  // Précommande d'import : fret et douane s'ajoutent au prix des pièces, et le
  // paiement se fait en deux temps (cf. shared/constants/import-pricing).
  const preorder = isImport
    ? buildPreorder({
        importItems,
        logisticsMode: options.logisticsMode,
        partsTotal: totalAmount,
        deliveryFee,
      })
    : null

  const order = await prisma.order.create({
    data: {
      initiatorId,
      ownerPhone: options.ownerPhone,
      shareToken,
      totalAmount,
      deliveryFee,
      deliveryCommune,
      deliveryMode,
      orderType: isImport ? 'IMPORT_PREORDER' : 'STANDARD',
      logisticsMode: preorder?.mode ?? null,
      freightFee: preorder?.freightFee ?? 0,
      customsFee: preorder?.customsFee ?? 0,
      depositAmount: preorder?.schedule.depositAmount ?? 0,
      balanceAmount: preorder?.schedule.balanceAmount ?? 0,
      payerMode: options.payerMode ?? 'SELF',
      laborCost: options.laborCost,
      vehicleId,
      enterpriseId,
      items: { create },
      events: {
        create: {
          toStatus: 'DRAFT',
          actor: initiatorId,
          note: 'Commande créée',
        },
      },
    },
    include: publicItemsInclude,
  })

  return order
}

// Palier de livraison applicable au panier : abonnement actif (essai inclus) de
// l'entreprise du véhicule sélectionné, si l'utilisateur en est membre. Sert au
// front pour afficher les frais par mode — le calcul autoritaire reste createOrder.
export async function getDeliveryTier(
  userId: string,
  vehicleId?: string,
): Promise<DeliveryPricingTier> {
  if (!vehicleId) return 'FREE'
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { enterpriseId: true },
  })
  if (!vehicle?.enterpriseId) return 'FREE'
  const membership = await prisma.enterpriseMember.findUnique({
    where: { uq_enterprise_member: { enterpriseId: vehicle.enterpriseId, userId } },
    select: { id: true },
  })
  if (!membership) return 'FREE'
  return currentTier(vehicle.enterpriseId)
}

// Note d'événement qui distingue un brouillon-panier d'une commande envoyée au
// propriétaire (note 'Commande créée'). Les deux sont en statut DRAFT — seul ce
// marqueur permet à getOpenDraft de ne réhydrater que le panier, pas une commande.
const CART_DRAFT_NOTE = 'Brouillon panier'

function cartDraftWhere(userId: string) {
  return {
    initiatorId: userId,
    status: 'DRAFT' as const,
    events: { some: { note: CART_DRAFT_NOTE } },
  }
}

/**
 * Récupère le brouillon (panier serveur) ouvert de l'utilisateur — le plus
 * récent. Ne renvoie que les paniers (marqueur CART_DRAFT_NOTE), jamais une
 * commande déjà envoyée au propriétaire. Sert à réhydrater le panier.
 */
export async function getOpenDraft(userId: string) {
  return prisma.order.findFirst({
    where: cartDraftWhere(userId),
    orderBy: { updatedAt: 'desc' },
    include: publicItemsInclude,
  })
}

/**
 * Upsert idempotent du brouillon ouvert de l'utilisateur : remplace les items
 * et quantités à partir du payload panier. Reste en statut DRAFT. Sans items,
 * supprime le brouillon ouvert (panier vidé).
 */
export async function upsertDraft(
  userId: string,
  items: { catalogItemId: string; quantity?: number }[],
) {
  const existing = await prisma.order.findFirst({
    where: cartDraftWhere(userId),
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (items.length === 0) {
    if (existing) {
      // OrderItem et OrderEvent n'ont pas onDelete:Cascade → supprimer les
      // enfants avant l'Order, sinon violation de clé étrangère.
      await prisma.orderItem.deleteMany({ where: { orderId: existing.id } })
      await prisma.orderEvent.deleteMany({ where: { orderId: existing.id } })
      await prisma.order.delete({ where: { id: existing.id } })
    }
    return null
  }

  const qtyById = qtyMapFromItems(items)
  const { create, totalAmount } = await buildOrderItems(qtyById)

  if (existing) {
    await prisma.orderItem.deleteMany({ where: { orderId: existing.id } })
    return prisma.order.update({
      where: { id: existing.id },
      data: { totalAmount, items: { create } },
      include: publicItemsInclude,
    })
  }

  return prisma.order.create({
    data: {
      initiatorId: userId,
      shareToken: generateShareToken(),
      totalAmount,
      items: { create },
      events: { create: { toStatus: 'DRAFT', actor: userId, note: 'Brouillon panier' } },
    },
    include: publicItemsInclude,
  })
}

export async function getOrderByShareToken(shareToken: string) {
  const order = await prisma.order.findUnique({
    where: { shareToken },
    include: {
      items: { select: ORDER_ITEM_PUBLIC_SELECT },
      initiator: { select: { id: true, phone: true } },
      // Suivi physique d'une précommande : le client veut savoir où en est sa
      // pièce, dédouanement compris. Ni les coûts logistiques internes ni le
      // transitaire ne sont exposés — seulement les étapes et leurs dates.
      shipment: {
        select: {
          reference: true,
          status: true,
          mode: true,
          originCountry: true,
          departedAt: true,
          etaAt: true,
          customsClearedAt: true,
          arrivedAt: true,
          events: {
            orderBy: { occurredAt: 'asc' },
            select: { id: true, label: true, location: true, occurredAt: true, toStatus: true },
          },
        },
      },
    },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  // Le tarif des trois modes accompagne la commande : celui qui paie choisit
  // son délai sur cette page, et voit le prix exact avant de payer. Modifiable
  // tant que la commande est en DRAFT (cf. setOrderDeliveryMode).
  const deliveryOptions = deliveryOptionsFor({
    tier: await tierOfOrder(order.enterpriseId),
    commune: order.deliveryCommune,
    vendors: vendorGroupsOf(order.items),
  })

  // Commande d'import : les trois acheminements et leur échéancier, pour que
  // le payeur arbitre bateau / avion avant de régler son acompte.
  const importOptions =
    order.orderType === 'IMPORT_PREORDER'
      ? importOptionsFor({
          importItems: await loadImportQuoteItems(order.id),
          partsTotal: order.totalAmount,
          deliveryFee: order.deliveryFee,
        })
      : null

  return { ...order, deliveryOptions, importOptions }
}

/**
 * L'acheteur qui paie arbitre sa livraison depuis le lien partagé : le délai et
 * la commune où il veut être livré. Les deux font varier le prix, qui est
 * recalculé serveur-side (jamais reçu du client) et n'est modifiable qu'avant
 * paiement — après, le prix affiché ferait foi à tort.
 */
export async function setOrderDelivery(
  shareToken: string,
  choice: { mode?: DeliveryPricingMode; commune?: string; logisticsMode?: ImportFreightMode },
) {
  // Le `.refine` du schéma partagé ne survit pas à la conversion JSON Schema
  // (Fastify ne valide que la forme) — l'invariant se tient donc ici.
  if (
    choice.mode === undefined &&
    choice.commune === undefined &&
    choice.logisticsMode === undefined
  ) {
    throw new AppError('DELIVERY_CHOICE_EMPTY', 400, {
      message: "Précisez au moins le délai, la commune ou l'acheminement",
    })
  }

  const order = await prisma.order.findUnique({
    where: { shareToken },
    include: publicItemsInclude,
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }
  if (order.status !== 'DRAFT') {
    throw new AppError('ORDER_DELIVERY_LOCKED', 409, {
      message: 'La livraison ne peut plus être modifiée après le paiement',
    })
  }

  const deliveryMode =
    choice.mode ?? (order.deliveryMode as DeliveryPricingMode | null) ?? DEFAULT_DELIVERY_MODE
  const deliveryCommune = choice.commune ?? order.deliveryCommune

  const deliveryFee =
    computeDeliveryFee({
      tier: await tierOfOrder(order.enterpriseId),
      mode: deliveryMode,
      commune: deliveryCommune,
      vendors: vendorGroupsOf(order.items),
    }) ?? 0

  // Sur une précommande, changer d'acheminement (ou de commune) rejoue le fret,
  // la douane et l'échéancier : le solde inclut la livraison locale.
  const preorder =
    order.orderType === 'IMPORT_PREORDER'
      ? buildPreorder({
          importItems: await loadImportQuoteItems(order.id),
          logisticsMode: choice.logisticsMode ?? (order.logisticsMode as ImportFreightMode | null) ?? undefined,
          partsTotal: order.totalAmount,
          deliveryFee,
        })
      : null

  await prisma.order.update({
    where: { id: order.id },
    data: {
      deliveryMode,
      deliveryCommune,
      deliveryFee,
      ...(preorder
        ? {
            logisticsMode: preorder.mode,
            freightFee: preorder.freightFee,
            customsFee: preorder.customsFee,
            depositAmount: preorder.schedule.depositAmount,
            balanceAmount: preorder.schedule.balanceAmount,
          }
        : {}),
    },
  })

  return getOrderByShareToken(shareToken)
}

export async function getOrderById(orderId: string, requester: OrderRequester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: ORDER_ITEM_PUBLIC_SELECT },
      events: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  await assertOrderReadAccess(order, requester)

  return order
}

// Confirmation vendeur : seul un vendeur d'un article de la commande (ou un
// admin) peut confirmer. Empêche tout utilisateur connecté de confirmer.
export async function vendorConfirmOrder(orderId: string, requester: OrderRequester) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { vendorId: true } } },
  })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  const isAdmin = requester.roles.includes('ADMIN')
  if (!isAdmin && !(await userOwnsVendorOnOrder(requester.id, order.items))) {
    throw new AppError('ORDER_FORBIDDEN', 403, {
      message: 'Seul le vendeur de la commande peut la confirmer',
    })
  }

  return transitionOrder(orderId, 'VENDOR_CONFIRMED', requester.id, 'Confirmé par le vendeur')
}

export async function getUserOrders(userId: string) {
  return prisma.order.findMany({
    where: { initiatorId: userId },
    orderBy: { createdAt: 'desc' },
    include: publicItemsInclude,
  })
}

export async function transitionOrder(
  orderId: string,
  toStatus: string,
  actor: string,
  note?: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  const fromStatus = order.status
  if (!canTransition(fromStatus, toStatus as typeof fromStatus)) {
    throw new AppError('ORDER_INVALID_TRANSITION', 409, {
      message: `Transition invalide : ${fromStatus} → ${toStatus}`,
    })
  }

  // Les états d'import supposent un acompte et un solde : une commande
  // STANDARD n'en a pas, et les y laisser entrer produirait une commande
  // bloquée en attente d'un solde de zéro franc.
  if (isImportOnlyStatus(toStatus) && order.orderType !== 'IMPORT_PREORDER') {
    throw new AppError('ORDER_INVALID_TRANSITION', 409, {
      message: `L'état ${toStatus} est réservé aux précommandes d'import`,
    })
  }

  const updateData: Record<string, unknown> = { status: toStatus }

  if (toStatus === 'DEPOSIT_PAID') updateData.depositPaidAt = new Date()
  if (toStatus === 'PAID') {
    updateData.paidAt = new Date()
    // Sur une précommande, PAID signifie « solde réglé » : la pièce est
    // dédouanée à Abidjan et le paiement est complet.
    if (order.orderType === 'IMPORT_PREORDER') updateData.balancePaidAt = new Date()
  }
  if (toStatus === 'VENDOR_CONFIRMED') updateData.vendorConfirmedAt = new Date()
  if (toStatus === 'CANCELLED') updateData.cancelledAt = new Date()

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      ...updateData,
      events: {
        create: {
          fromStatus,
          toStatus: toStatus as typeof fromStatus,
          actor,
          note,
        },
      },
    },
    include: publicItemsInclude,
  })

  if (DELIVERED_STATUSES.has(toStatus)) {
    rescoreOrderVendors(orderId)
  }

  if (toStatus === 'PAID') {
    // Fire-and-forget invoice issuance. Idempotent — getOrCreate returns
    // existing invoice if already issued.
    void getOrCreateInvoiceForOrder(orderId).catch((err) => {
      // log only; never let invoice failure rollback the order transition
      // eslint-disable-next-line no-console
      console.error('[invoice] failed to issue', orderId, err)
    })

    // Fire-and-forget : décrémente le stock des pièces à quantité suivie
    // et alerte les vendeurs sous le seuil. Ne throw jamais.
    void consumeStockForOrder(orderId)
  }

  if (toStatus === 'CANCELLED' && order.paidAt) {
    // Annulation après paiement : le stock consommé au passage en PAID est
    // restitué (garde sur l'état AVANT transition, order est relu ci-dessus).
    // Fire-and-forget : ne throw jamais.
    void restockForOrder(orderId)
  }

  return updated
}

export async function selectPaymentMethod(
  orderId: string,
  paymentMethod: string,
  actor: string,
  shareToken: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  // Preuve de possession : le propriétaire agit sans compte via le lien partagé.
  if (order.shareToken !== shareToken) {
    throw new AppError('ORDER_FORBIDDEN', 403, { message: 'Lien de partage invalide' })
  }

  if (order.status !== 'DRAFT') {
    throw new AppError('ORDER_INVALID_STATUS', 400, {
      message: "La commande n'est plus en brouillon",
    })
  }

  // Pas de paiement sans lieu de livraison : sans commune, les frais valent 0 et
  // la commande partirait sans destination facturée. Celui qui paie la renseigne
  // sur la page de validation (setOrderDelivery).
  if (!order.deliveryCommune) {
    throw new AppError('ORDER_DELIVERY_COMMUNE_REQUIRED', 400, {
      message: 'Indiquez votre commune de livraison avant de payer',
    })
  }

  // Une précommande d'import se paie d'avance : l'acompte finance l'achat chez
  // le partenaire et le fret. Payer à la livraison n'a pas de sens ici — il n'y
  // a rien à livrer tant que la marchandise n'est pas achetée.
  if (paymentMethod === 'COD' && order.orderType === 'IMPORT_PREORDER') {
    throw new AppError('ORDER_COD_UNAVAILABLE_ON_PREORDER', 400, {
      message: 'Une pièce à importer se règle par acompte, pas à la livraison',
    })
  }

  if (paymentMethod === 'COD' && order.totalAmount > COD_MAX_AMOUNT) {
    throw new AppError('ORDER_COD_LIMIT', 400, {
      message: `Le paiement à la livraison est limité à ${COD_MAX_AMOUNT.toLocaleString()} FCFA`,
    })
  }

  const toStatus = paymentMethod === 'COD' ? 'PAID' : 'PENDING_PAYMENT'

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: paymentMethod as 'ORANGE_MONEY' | 'MTN_MOMO' | 'WAVE' | 'COD',
      status: toStatus,
      paidAt: paymentMethod === 'COD' ? new Date() : undefined,
      events: {
        create: {
          fromStatus: order.status,
          toStatus,
          actor,
          note: `Paiement sélectionné : ${paymentMethod}`,
        },
      },
    },
    include: publicItemsInclude,
  })

  // Le chemin COD passe en PAID sans transitionOrder : consommer le stock ici aussi.
  if (toStatus === 'PAID') {
    void consumeStockForOrder(orderId)
  }

  return updated
}

/**
 * Montant appelé à cette étape du paiement. Une commande locale se règle en une
 * fois ; une précommande d'import appelle son acompte, puis son solde.
 */
export function amountDueFor(order: {
  orderType: string
  status: string
  totalAmount: number
  deliveryFee: number
  laborCost: number | null
  depositAmount: number
  balanceAmount: number
}): number {
  if (order.orderType === 'IMPORT_PREORDER') {
    return order.status === 'AWAITING_BALANCE' ? order.balanceAmount : order.depositAmount
  }
  return order.totalAmount + order.deliveryFee + (order.laborCost ?? 0)
}

/**
 * Règlement du solde d'une précommande, une fois la pièce dédouanée à Abidjan.
 *
 * N'est appelable qu'en AWAITING_BALANCE : avant l'arrivée, il n'y a rien à
 * solder, et l'appeler plus tôt reviendrait à encaisser un client dont la pièce
 * pourrait encore être introuvable chez le partenaire.
 */
export async function payImportBalance(
  orderId: string,
  paymentMethod: string,
  actor: string,
  shareToken: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }
  if (order.shareToken !== shareToken) {
    throw new AppError('ORDER_FORBIDDEN', 403, { message: 'Lien de partage invalide' })
  }
  if (order.orderType !== 'IMPORT_PREORDER') {
    throw new AppError('ORDER_NOT_A_PREORDER', 400, {
      message: "Cette commande n'est pas une précommande",
    })
  }
  if (order.status !== 'AWAITING_BALANCE') {
    throw new AppError('ORDER_BALANCE_NOT_DUE', 409, {
      message: "Le solde ne peut être réglé qu'une fois la pièce arrivée à Abidjan",
    })
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      paymentMethod: paymentMethod as 'ORANGE_MONEY' | 'MTN_MOMO' | 'MOOV_MONEY' | 'WAVE',
      events: {
        create: {
          fromStatus: order.status,
          toStatus: order.status,
          actor,
          note: `Solde appelé : ${paymentMethod}`,
        },
      },
    },
    include: publicItemsInclude,
  })
}

/**
 * Annulation d'une précommande que le partenaire ne peut finalement pas fournir.
 *
 * Rembourse INTÉGRALEMENT ce qui a été encaissé — c'est la promesse écrite sur
 * la fiche produit, et elle est la contrepartie du fait de payer avant que la
 * pièce n'existe pour le client.
 */
export async function cancelImportPreorder(orderId: string, actor: string, reason?: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }
  if (order.orderType !== 'IMPORT_PREORDER') {
    throw new AppError('ORDER_NOT_A_PREORDER', 400, {
      message: "Cette commande n'est pas une précommande",
    })
  }

  // Rembourser AVANT de changer d'état : si le remboursement échoue, l'erreur
  // remonte et la commande reste dans un état retentable, plutôt qu'annulée
  // avec l'argent du client encore sous séquestre.
  await refundAllHeldEscrows(orderId)

  return transitionOrder(
    orderId,
    'CANCELLED',
    actor,
    reason ?? 'Pièce indisponible chez le partenaire — acompte remboursé',
  )
}

export async function cancelOrder(
  orderId: string,
  actor: string,
  reason: string | undefined,
  shareToken: string,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404, { message: 'Commande introuvable' })
  }

  // Preuve de possession : annulation par le propriétaire via le lien partagé.
  if (order.shareToken !== shareToken) {
    throw new AppError('ORDER_FORBIDDEN', 403, { message: 'Lien de partage invalide' })
  }

  const cancellableStatuses = ['DRAFT', 'PENDING_PAYMENT', 'PAID', 'VENDOR_CONFIRMED']
  if (!cancellableStatuses.includes(order.status)) {
    throw new AppError('ORDER_CANNOT_CANCEL', 400, {
      message: 'La commande ne peut plus être annulée (livraison en cours)',
    })
  }

  return transitionOrder(orderId, 'CANCELLED', actor, reason ?? 'Annulation demandée')
}
