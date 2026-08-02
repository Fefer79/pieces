import { randomBytes } from 'crypto'
import type { Prisma, PurchaseOrderStatus } from '@prisma/client'
import {
  createStockLocationSchema,
  updateStockLocationSchema,
  stockLevelsQuerySchema,
  stockAdjustmentSchema,
  stockMovementsQuerySchema,
  vendorStockAlertsQuerySchema,
  createSupplierSchema,
  updateSupplierSchema,
  suppliersQuerySchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  receivePurchaseOrderSchema,
  purchaseOrdersQuerySchema,
  estimateLandedCostSchema,
} from 'shared/validators'
import {
  LOGISTICS_MODES,
  CUSTOMS_DUTY_RATE,
  LAST_MILE_FEE,
  type LogisticsMode,
  type LogisticsModeSpec,
} from 'shared/constants'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'

const DAY_MS = 24 * 60 * 60 * 1000
const THIRTY_DAYS_MS = 30 * DAY_MS

// Même convention d'arrondi que le moteur d'arbitrage (constants/logistics.ts,
// où l'helper est privé) : on arrondit les frais à la centaine de FCFA.
const roundTo100 = (n: number) => Math.round(n / 100) * 100

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

/** Statut affiché d'un niveau de stock : rupture (0), bas (≤ seuil), ok. */
export function computeLevelStatus(qtyOnHand: number, seuilBas: number): 'rupture' | 'bas' | 'ok' {
  if (qtyOnHand <= 0) return 'rupture'
  if (qtyOnHand <= seuilBas) return 'bas'
  return 'ok'
}

const isImportMode = (mode: string) => mode.startsWith('AIR_') || mode === 'SEA_LCL'

/**
 * Coût « rendu entrepôt » d'un approvisionnement, en FCFA.
 * fret = max(poids × tarif/kg, minimum de perception) + forfait dossier ;
 * douane = 20 % de (valeur + fret) pour les modes d'import, 0 en LOCAL ;
 * lastMile = livraison finale Abidjan (import uniquement).
 */
export function computeLandedCost(mode: LogisticsMode, poidsTotalKg: number, montantFcfa: number) {
  const spec = LOGISTICS_MODES[mode]
  const isImport = isImportMode(mode)
  const fret = roundTo100(
    Math.max(poidsTotalKg * spec.ratePerKg, spec.minimumCharge) + spec.handlingFee,
  )
  const douane = isImport ? roundTo100(CUSTOMS_DUTY_RATE * (montantFcfa + fret)) : 0
  const lastMile = isImport ? LAST_MILE_FEE : 0
  return {
    fret,
    douane,
    lastMile,
    total: montantFcfa + fret + douane + lastMile,
    delaiJours: spec.transitDays,
  }
}

// ---------------------------------------------------------------------------
// Vue d'ensemble
// ---------------------------------------------------------------------------

/**
 * Huit compteurs du cockpit « Stock, achats & fournisseurs ».
 * Les niveaux sont chargés en entier (stock interne, volumes modestes) :
 * rupture/bas/valeur sont des comparaisons inter-colonnes que Prisma ne sait
 * pas exprimer en `where`, elles se calculent donc en mémoire.
 */
export async function getStockOverview() {
  const [emplacementsActifs, levels, mouvements30j, fournisseursActifs, bcEnCours] =
    await Promise.all([
      prisma.stockLocation.count({ where: { actif: true } }),
      prisma.stockLevel.findMany({
        select: { catalogItemId: true, qtyOnHand: true, seuilBas: true, cumpFcfa: true },
      }),
      prisma.stockMovement.count({
        where: { createdAt: { gte: new Date(Date.now() - THIRTY_DAYS_MS) } },
      }),
      prisma.supplier.count({ where: { actif: true } }),
      prisma.purchaseOrder.count({
        where: { statut: { in: ['ENVOYEE', 'EN_TRANSIT', 'RECEPTION_PARTIELLE'] } },
      }),
    ])

  const referencesSuivies = new Set(levels.map((l) => l.catalogItemId)).size
  const ruptures = levels.filter(
    (l) => computeLevelStatus(l.qtyOnHand, l.seuilBas) === 'rupture',
  ).length
  const stockBas = levels.filter(
    (l) => computeLevelStatus(l.qtyOnHand, l.seuilBas) === 'bas',
  ).length
  const valeurStockFcfa = levels.reduce((sum, l) => sum + l.qtyOnHand * (l.cumpFcfa ?? 0), 0)

  return {
    emplacementsActifs,
    referencesSuivies,
    ruptures,
    stockBas,
    valeurStockFcfa,
    mouvements30j,
    fournisseursActifs,
    bcEnCours,
  }
}

// ---------------------------------------------------------------------------
// Emplacements
// ---------------------------------------------------------------------------

export async function listStockLocations() {
  return prisma.stockLocation.findMany({
    orderBy: { nom: 'asc' },
    include: { _count: { select: { levels: true } } },
  })
}

export async function createStockLocation(body: unknown) {
  const parsed = createStockLocationSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  return prisma.stockLocation.create({
    data: {
      nom: parsed.data.nom,
      type: parsed.data.type,
      commune: parsed.data.commune ?? null,
      adresse: parsed.data.adresse ?? null,
    },
  })
}

export async function updateStockLocation(id: string, body: unknown) {
  const parsed = updateStockLocationSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const existing = await prisma.stockLocation.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new AppError('STOCK_LOCATION_NOT_FOUND', 404, { message: 'Emplacement introuvable' })
  }
  return prisma.stockLocation.update({ where: { id }, data: parsed.data })
}

// ---------------------------------------------------------------------------
// Niveaux de stock
// ---------------------------------------------------------------------------

/**
 * Liste des niveaux avec statut calculé et valorisation. La pagination se fait
 * en mémoire : le statut (rupture/bas/ok) compare qtyOnHand et seuilBas, ce que
 * Prisma ne sait pas filtrer côté SQL — volumes de stock interne modestes.
 */
export async function listStockLevels(rawQuery: unknown) {
  const query = stockLevelsQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50

  const where: Prisma.StockLevelWhereInput = {}
  if (query.locationId) where.locationId = query.locationId
  if (query.q) {
    where.catalogItem = {
      OR: [
        { name: { contains: query.q, mode: 'insensitive' } },
        { oemReference: { contains: query.q, mode: 'insensitive' } },
      ],
    }
  }

  const levels = await prisma.stockLevel.findMany({
    where,
    orderBy: [{ qtyOnHand: 'asc' }, { updatedAt: 'desc' }],
    include: {
      catalogItem: {
        select: { id: true, name: true, oemReference: true, imageThumbUrl: true },
      },
      location: { select: { id: true, nom: true, type: true } },
    },
  })

  const rows = levels.map((l) => ({
    ...l,
    statut: computeLevelStatus(l.qtyOnHand, l.seuilBas),
    valeurFcfa: l.cumpFcfa == null ? null : l.qtyOnHand * l.cumpFcfa,
  }))
  const filtered = query.statut ? rows.filter((r) => r.statut === query.statut) : rows

  const skip = (page - 1) * limit
  return { levels: filtered.slice(skip, skip + limit), total: filtered.length, page, limit }
}

// ---------------------------------------------------------------------------
// Ajustements manuels
// ---------------------------------------------------------------------------

/**
 * Ajustement de stock (inventaire, casse, correction) sur un emplacement.
 * Transactionnel : niveau upserté + mouvement AJUSTEMENT tracé. Refuse tout
 * ajustement qui ferait passer le solde sous zéro (STOCK_INSUFFICIENT).
 *
 * CUMP : recalculé uniquement sur une entrée valorisée (delta > 0 avec coût) —
 *   (qOld × cumpOld + delta × coût) / (qOld + delta).
 *   Un CUMP inconnu n'est jamais remplacé par 0 dans la moyenne : à solde nul
 *   le coût fourni devient la base, sinon on adopte le dernier coût connu.
 */
export async function adjustStock(actorId: string, body: unknown) {
  const parsed = stockAdjustmentSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  const [item, location] = await Promise.all([
    prisma.catalogItem.findUnique({ where: { id: data.catalogItemId }, select: { id: true } }),
    prisma.stockLocation.findUnique({ where: { id: data.locationId }, select: { id: true } }),
  ])
  if (!item) {
    throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, { message: 'Fiche catalogue introuvable' })
  }
  if (!location) {
    throw new AppError('STOCK_LOCATION_NOT_FOUND', 404, { message: 'Emplacement introuvable' })
  }

  const uq = { catalogItemId: data.catalogItemId, locationId: data.locationId }

  return prisma.$transaction(async (tx) => {
    const level = await tx.stockLevel.findUnique({
      where: { uq_stock_levels_item_location: uq },
    })
    const qOld = level?.qtyOnHand ?? 0
    const newQty = qOld + data.delta
    if (newQty < 0) {
      throw new AppError('STOCK_INSUFFICIENT', 422, {
        message: `Stock insuffisant : solde ${qOld}, retrait ${-data.delta}`,
      })
    }

    let cumpFcfa = level?.cumpFcfa ?? null
    if (data.delta > 0 && data.coutUnitaireFcfa != null) {
      if (qOld <= 0 || cumpFcfa == null) {
        cumpFcfa = data.coutUnitaireFcfa
      } else {
        cumpFcfa = Math.round((qOld * cumpFcfa + data.delta * data.coutUnitaireFcfa) / newQty)
      }
    }

    const saved = await tx.stockLevel.upsert({
      where: { uq_stock_levels_item_location: uq },
      create: {
        ...uq,
        qtyOnHand: newQty,
        cumpFcfa,
        ...(data.seuilBas !== undefined && { seuilBas: data.seuilBas }),
      },
      update: {
        qtyOnHand: newQty,
        cumpFcfa,
        ...(data.seuilBas !== undefined && { seuilBas: data.seuilBas }),
      },
    })

    // quantite est toujours positive (le sens est donné par le type) ; le delta
    // signé est conservé dans le payload du journal d'activité côté route.
    const movement = await tx.stockMovement.create({
      data: {
        type: 'AJUSTEMENT',
        ...uq,
        quantite: Math.abs(data.delta),
        coutUnitaireFcfa: data.coutUnitaireFcfa ?? null,
        refType: 'MANUEL',
        note: data.note ?? null,
        actorId,
      },
    })

    return { level: saved, movement }
  })
}

// ---------------------------------------------------------------------------
// Mouvements
// ---------------------------------------------------------------------------

export async function listStockMovements(rawQuery: unknown) {
  const query = stockMovementsQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.StockMovementWhereInput = {}
  if (query.catalogItemId) where.catalogItemId = query.catalogItemId
  if (query.locationId) where.locationId = query.locationId
  if (query.type) where.type = query.type

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        catalogItem: { select: { id: true, name: true, oemReference: true } },
        location: { select: { id: true, nom: true } },
        actor: { select: { id: true, name: true } },
      },
    }),
    prisma.stockMovement.count({ where }),
  ])

  return { movements, total, page, limit }
}

// ---------------------------------------------------------------------------
// Alertes stock vendeurs (marketplace)
// ---------------------------------------------------------------------------

/**
 * Fiches vendeurs à quantité suivie en rupture ou sous leur seuil d'alerte.
 * Ruptures d'abord, puis quantité croissante. Filtrage en mémoire : le seuil
 * est une colonne (lowStockThreshold), non exprimable en `where` Prisma.
 */
export async function listVendorStockAlerts(rawQuery: unknown) {
  const query = vendorStockAlertsQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50

  const items = await prisma.catalogItem.findMany({
    where: { stockQuantity: { not: null } },
    select: {
      id: true,
      name: true,
      oemReference: true,
      stockQuantity: true,
      lowStockThreshold: true,
      vendor: { select: { id: true, shopName: true, phone: true, isInternal: true } },
    },
  })

  const alerts = items.flatMap((i) => {
    const qty = i.stockQuantity
    if (qty === null) return []
    const type = qty <= 0 ? 'rupture' : qty <= i.lowStockThreshold ? 'bas' : null
    if (!type || (query.type && query.type !== type)) return []
    return [{ ...i, stockQuantity: qty, type }]
  })
  alerts.sort((a, b) =>
    a.type === b.type ? a.stockQuantity - b.stockQuantity : a.type === 'rupture' ? -1 : 1,
  )

  const skip = (page - 1) * limit
  return { alerts: alerts.slice(skip, skip + limit), total: alerts.length, page, limit }
}

// ---------------------------------------------------------------------------
// Fournisseurs
// ---------------------------------------------------------------------------

export async function listSuppliers(rawQuery: unknown) {
  const query = suppliersQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.SupplierWhereInput = {}
  if (query.q) {
    where.OR = [
      { nom: { contains: query.q, mode: 'insensitive' } },
      { pays: { contains: query.q, mode: 'insensitive' } },
      { ville: { contains: query.q, mode: 'insensitive' } },
    ]
  }
  if (query.actif) where.actif = query.actif === 'true'

  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: { nom: 'asc' },
      skip,
      take: limit,
      include: { _count: { select: { purchaseOrders: true } } },
    }),
    prisma.supplier.count({ where }),
  ])

  return { suppliers, total, page, limit }
}

export async function createSupplier(body: unknown) {
  const parsed = createSupplierSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  // Le schéma épouse les colonnes du modèle : undefined est ignoré par Prisma.
  return prisma.supplier.create({ data: parsed.data })
}

export async function updateSupplier(id: string, body: unknown) {
  const parsed = updateSupplierSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new AppError('SUPPLIER_NOT_FOUND', 404, { message: 'Fournisseur introuvable' })
  }
  return prisma.supplier.update({ where: { id }, data: parsed.data })
}

/** Fiche fournisseur : les 20 derniers bons de commande + le volume cumulé (hors annulés). */
export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({ where: { id } })
  if (!supplier) {
    throw new AppError('SUPPLIER_NOT_FOUND', 404, { message: 'Fournisseur introuvable' })
  }
  const [bonsCommande, volume] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { destination: { select: { id: true, nom: true } } },
    }),
    prisma.purchaseOrder.aggregate({
      where: { supplierId: id, statut: { not: 'ANNULEE' } },
      _sum: { montantEstimeFcfa: true },
    }),
  ])
  return { ...supplier, bonsCommande, volumeFcfa: volume._sum.montantEstimeFcfa ?? 0 }
}

// ---------------------------------------------------------------------------
// Bons de commande
// ---------------------------------------------------------------------------

// Matrice des transitions autorisées (la réception se fait via /receive).
const PO_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['EN_TRANSIT', 'ANNULEE'],
  EN_TRANSIT: ['ANNULEE'],
  RECEPTION_PARTIELLE: ['RECEPTIONNEE'],
  RECEPTIONNEE: [],
  ANNULEE: [],
}

const PO_REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1 (comme les références LOG-)

/** « BC-20260731-8F3K » — daté, dictable, sans caractère ambigu. */
export function buildPoNumber(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const bytes = randomBytes(4)
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    const byte = bytes[i] ?? 0
    suffix += PO_REF_ALPHABET[byte % PO_REF_ALPHABET.length] ?? ''
  }
  return `BC-${yyyy}${mm}${dd}-${suffix}`
}

/** Collision quasi impossible (30⁴/jour) mais le numéro est unique en base : on retente. */
async function generateUniquePoNumber(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const numero = buildPoNumber()
    const exists = await prisma.purchaseOrder.findUnique({
      where: { numero },
      select: { id: true },
    })
    if (!exists) return numero
  }
  return buildPoNumber()
}

export async function estimateLandedCost(body: unknown) {
  const parsed = estimateLandedCostSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  return computeLandedCost(parsed.data.mode, parsed.data.poidsTotalKg, parsed.data.montantFcfa)
}

export async function listPurchaseOrders(rawQuery: unknown) {
  const query = purchaseOrdersQuerySchema.parse(rawQuery)
  const page = query.page ?? 1
  const limit = query.limit ?? 50
  const skip = (page - 1) * limit

  const where: Prisma.PurchaseOrderWhereInput = {}
  if (query.statut) where.statut = query.statut
  if (query.supplierId) where.supplierId = query.supplierId

  const [purchaseOrders, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        supplier: { select: { id: true, nom: true } },
        destination: { select: { id: true, nom: true } },
        _count: { select: { lines: true } },
      },
    }),
    prisma.purchaseOrder.count({ where }),
  ])

  return { purchaseOrders, total, page, limit }
}

export async function getPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      supplier: true,
      destination: true,
      createdBy: { select: { id: true, name: true } },
      lines: { include: { catalogItem: { select: { id: true, name: true } } } },
    },
  })
  if (!po) {
    throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
  }
  return po
}

export async function createPurchaseOrder(actorId: string, body: unknown) {
  const parsed = createPurchaseOrderSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  const supplier = await prisma.supplier.findUnique({
    where: { id: data.supplierId },
    select: { id: true },
  })
  if (!supplier) {
    throw new AppError('SUPPLIER_NOT_FOUND', 404, { message: 'Fournisseur introuvable' })
  }
  if (data.destinationId) {
    const destination = await prisma.stockLocation.findUnique({
      where: { id: data.destinationId },
      select: { id: true },
    })
    if (!destination) {
      throw new AppError('STOCK_LOCATION_NOT_FOUND', 404, { message: 'Emplacement introuvable' })
    }
  }

  // Vérifie les fiches liées d'un coup : une FK cassée donnerait une erreur Prisma opaque.
  const itemIds = [
    ...new Set(data.lines.map((l) => l.catalogItemId).filter((id): id is string => id != null)),
  ]
  if (itemIds.length > 0) {
    const found = await prisma.catalogItem.findMany({
      where: { id: { in: itemIds } },
      select: { id: true },
    })
    if (found.length !== itemIds.length) {
      throw new AppError('CATALOG_ITEM_NOT_FOUND', 404, {
        message: 'Une fiche catalogue liée est introuvable',
      })
    }
  }

  const taux = data.tauxChange ?? 1
  const montantEstimeFcfa = Math.round(
    data.lines.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0) * taux,
  )
  const poidsTotalKg = data.lines.reduce((sum, l) => sum + (l.poidsEstimeKg ?? 0) * l.quantite, 0)
  const fraisEstimes = computeLandedCost(data.mode, poidsTotalKg, montantEstimeFcfa)
  const numero = await generateUniquePoNumber()

  return prisma.purchaseOrder.create({
    data: {
      numero,
      supplierId: data.supplierId,
      destinationId: data.destinationId ?? null,
      mode: data.mode,
      devise: data.devise,
      tauxChange: data.tauxChange ?? null,
      montantEstimeFcfa,
      fraisEstimes,
      etaAt: data.etaAt ? new Date(data.etaAt) : null,
      notes: data.notes ?? null,
      createdById: actorId,
      lines: {
        create: data.lines.map((l) => ({
          catalogItemId: l.catalogItemId ?? null,
          designation: l.designation,
          oemReference: l.oemReference ?? null,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          poidsEstimeKg: l.poidsEstimeKg ?? null,
        })),
      },
    },
    include: { supplier: true, destination: true, lines: true },
  })
}

export async function updatePurchaseOrder(id: string, body: unknown) {
  const parsed = updatePurchaseOrderSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  const po = await prisma.purchaseOrder.findUnique({ where: { id } })
  if (!po) {
    throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
  }

  const updateData: Prisma.PurchaseOrderUncheckedUpdateInput = {}
  if (data.destinationId !== undefined) updateData.destinationId = data.destinationId
  if (data.etaAt !== undefined) updateData.etaAt = data.etaAt === null ? null : new Date(data.etaAt)
  if (data.notes !== undefined) updateData.notes = data.notes

  if (data.statut && data.statut !== po.statut) {
    const allowed = PO_TRANSITIONS[po.statut]
    if (!allowed.includes(data.statut)) {
      throw new AppError('PO_INVALID_TRANSITION', 422, {
        message: `Transition invalide : ${po.statut} → ${data.statut}`,
      })
    }
    updateData.statut = data.statut
    if (data.statut === 'ENVOYEE') {
      updateData.envoyeAt = new Date()
      // ETA par défaut = délai du mode logistique, sauf si déjà fixé ou fourni.
      if (!po.etaAt && data.etaAt === undefined) {
        const spec: LogisticsModeSpec | undefined = LOGISTICS_MODES[po.mode as LogisticsMode]
        updateData.etaAt = new Date(Date.now() + (spec?.transitDays ?? 0) * DAY_MS)
      }
    }
  }

  return prisma.purchaseOrder.update({
    where: { id },
    data: updateData,
    include: { supplier: true, destination: true, lines: true },
  })
}

/**
 * Réception (totale ou partielle) d'un bon de commande.
 * Par ligne liée à une fiche catalogue ET avec destination : mouvement
 * RECEPTION + niveau upserté (CUMP recalculé au coût réel) + compteur
 * marketplace (CatalogItem.stockQuantity) crédité. Les lignes libres ne
 * trackent que le coût et la quantité reçue.
 */
export async function receivePurchaseOrder(actorId: string, id: string, body: unknown) {
  const parsed = receivePurchaseOrderSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  const po = await prisma.purchaseOrder.findUnique({ where: { id }, include: { lines: true } })
  if (!po) {
    throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
  }
  if (!['ENVOYEE', 'EN_TRANSIT', 'RECEPTION_PARTIELLE'].includes(po.statut)) {
    throw new AppError('PO_INVALID_TRANSITION', 422, {
      message: `Réception impossible depuis le statut ${po.statut}`,
    })
  }

  const linesById = new Map(po.lines.map((l) => [l.id, l]))
  const validatedLines: { input: (typeof data.lines)[number]; line: (typeof po.lines)[number] }[] =
    []
  for (const input of data.lines) {
    const line = linesById.get(input.lineId)
    if (!line) {
      throw new AppError('PO_LINE_NOT_FOUND', 404, {
        message: "Une ligne n'appartient pas à ce bon de commande",
      })
    }
    if (line.quantiteRecue + input.quantiteRecue > line.quantite) {
      throw new AppError('PO_OVER_RECEIVE', 422, {
        message: `Sur-réception sur « ${line.designation} » : ${line.quantiteRecue + input.quantiteRecue} reçus pour ${line.quantite} commandés`,
      })
    }
    validatedLines.push({ input, line })
  }

  const taux = po.tauxChange ?? 1

  return prisma.$transaction(async (tx) => {
    let montantReelDelta = 0

    for (const { input, line } of validatedLines) {
      const coutFcfa = input.prixUnitaireReelFcfa ?? Math.round(line.prixUnitaire * taux)
      montantReelDelta += coutFcfa * input.quantiteRecue

      await tx.purchaseOrderItem.update({
        where: { id: line.id },
        data: { quantiteRecue: line.quantiteRecue + input.quantiteRecue },
      })

      // Ligne libre ou sans destination : coût tracké, aucun impact stock.
      if (!line.catalogItemId || !po.destinationId) continue

      const uq = { catalogItemId: line.catalogItemId, locationId: po.destinationId }
      await tx.stockMovement.create({
        data: {
          type: 'RECEPTION',
          ...uq,
          quantite: input.quantiteRecue,
          coutUnitaireFcfa: coutFcfa,
          refType: 'PurchaseOrder',
          refId: po.id,
          actorId,
        },
      })

      const level = await tx.stockLevel.findUnique({
        where: { uq_stock_levels_item_location: uq },
      })
      const qOld = level?.qtyOnHand ?? 0
      const newQty = qOld + input.quantiteRecue
      const cumpFcfa =
        qOld <= 0 || level?.cumpFcfa == null
          ? coutFcfa
          : Math.round((qOld * level.cumpFcfa + input.quantiteRecue * coutFcfa) / newQty)
      await tx.stockLevel.upsert({
        where: { uq_stock_levels_item_location: uq },
        create: { ...uq, qtyOnHand: newQty, cumpFcfa },
        update: { qtyOnHand: newQty, cumpFcfa },
      })

      // Compteur marketplace : une fiche non suivie (null) devient suivie à la réception.
      const item = await tx.catalogItem.findUnique({
        where: { id: line.catalogItemId },
        select: { stockQuantity: true },
      })
      if (item) {
        await tx.catalogItem.update({
          where: { id: line.catalogItemId },
          data: { stockQuantity: (item.stockQuantity ?? 0) + input.quantiteRecue, inStock: true },
        })
      }
    }

    const updatedLines = await tx.purchaseOrderItem.findMany({
      where: { purchaseOrderId: po.id },
    })
    const fullyReceived = updatedLines.every((l) => l.quantiteRecue >= l.quantite)

    return tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        statut: fullyReceived ? 'RECEPTIONNEE' : 'RECEPTION_PARTIELLE',
        recuAt: new Date(), // date de dernière réception
        montantReelFcfa: (po.montantReelFcfa ?? 0) + montantReelDelta,
      },
      include: { supplier: true, destination: true, lines: true },
    })
  })
}
