// Suivi d'expédition — phase 4 de docs/logistique-as-a-service.md.
//
// Pas d'intégration transporteur : l'ops saisit les étapes, le lien de suivi
// est construit depuis `buildTrackingUrl`. Le jour où une API alimente
// `ShipmentEvent`, le modèle ne bouge pas.
//
// ⚠ Règle produit : le partenaire transitaire n'est jamais nommé au client. Les
// projections publiques passent donc par `publicCarrierLabel()`.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { notifyWhatsAppUser } from '../whatsapp/whatsapp.service.js'
import {
  shipmentCreateSchema,
  shipmentUpdateSchema,
  shipmentTransitionSchema,
  adminShipmentsQuerySchema,
} from 'shared/validators'
import {
  buildTrackingUrl,
  publicCarrierLabel,
  canTransitionShipment,
  chargeableWeightKg,
  SHIPMENT_STATUS_LABEL,
  type ShipmentStatusKey,
  type LogisticsMode,
} from 'shared/constants'
import type { Prisma, ShipmentCarrier, ShipmentStatus } from '@prisma/client'

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1

/** « EXP-20260803-8F3K » — même convention que LOG- et BC-. */
export function buildShipmentReference(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const suffix = Array.from(
    randomBytes(4),
    (b) => REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length],
  ).join('')
  return `EXP-${yyyy}${mm}${dd}-${suffix}`
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
}

/** Horodatage métier posé par chaque transition. */
const STATUS_TIMESTAMP: Partial<Record<ShipmentStatusKey, keyof Prisma.ShipmentUpdateInput>> = {
  COLLECTED: 'departedAt',
  CUSTOMS: 'arrivedAt',
  LOCAL_DELIVERY: 'customsClearedAt',
  DELIVERED: 'deliveredAt',
}

const totalCost = (freight?: number | null, customs?: number | null, lastMile?: number | null) => {
  const parts = [freight, customs, lastMile].filter((n): n is number => n != null)
  return parts.length > 0 ? parts.reduce((a, b) => a + b, 0) : null
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function createShipment(raw: unknown, actorUserId: string) {
  const input = shipmentCreateSchema.parse(raw)

  if (input.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: { id: true },
    })
    if (!po) throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
  }
  if (input.quoteRequestId) {
    const lead = await prisma.logisticsQuoteRequest.findUnique({
      where: { id: input.quoteRequestId },
      select: { id: true },
    })
    if (!lead) {
      throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
    }
  }

  const publicToken = randomBytes(32).toString('hex')
  const chargeable =
    input.weightKg != null
      ? chargeableWeightKg(input.mode as LogisticsMode, input.weightKg, input.volumeDm3 ?? 0)
      : null

  const shipment = await prisma.shipment.create({
    data: {
      reference: buildShipmentReference(),
      purchaseOrderId: input.purchaseOrderId ?? null,
      quoteRequestId: input.quoteRequestId ?? null,
      carrier: input.carrier,
      carrierOther: input.carrierOther ?? null,
      trackingNumber: input.trackingNumber ?? null,
      trackingUrl: buildTrackingUrl(input.carrier, input.trackingNumber),
      mode: input.mode,
      originCountry: input.originCountry ?? null,
      originCity: input.originCity ?? null,
      etaAt: input.etaAt ? new Date(input.etaAt) : null,
      weightKg: input.weightKg ?? null,
      volumeDm3: input.volumeDm3 ?? null,
      chargeableWeightKg: chargeable,
      freightCostFcfa: input.freightCostFcfa ?? null,
      customsCostFcfa: input.customsCostFcfa ?? null,
      lastMileCostFcfa: input.lastMileCostFcfa ?? null,
      totalCostFcfa: totalCost(input.freightCostFcfa, input.customsCostFcfa, input.lastMileCostFcfa),
      publicTokenHash: hashToken(publicToken),
      notes: input.notes ?? null,
      createdById: actorUserId,
      events: {
        create: {
          toStatus: 'SOURCING',
          label: 'Expédition créée',
          actorUserId,
        },
      },
    },
    include: { events: { orderBy: { occurredAt: 'asc' } } },
  })

  // Le jeton en clair n'est renvoyé qu'ici : il n'est stocké que haché.
  return { ...shipment, publicToken }
}

// ---------------------------------------------------------------------------
// Lectures
// ---------------------------------------------------------------------------

const ADMIN_INCLUDE = {
  events: { orderBy: { occurredAt: 'asc' as const } },
  purchaseOrder: {
    select: { id: true, numero: true, statut: true, supplier: { select: { id: true, nom: true } } },
  },
  quoteRequest: {
    select: { id: true, reference: true, contactName: true, phone: true, whatsapp: true },
  },
} satisfies Prisma.ShipmentInclude

export async function getShipment(id: string) {
  const shipment = await prisma.shipment.findUnique({ where: { id }, include: ADMIN_INCLUDE })
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }
  return shipment
}

export async function listShipments(rawQuery: unknown) {
  const query = adminShipmentsQuerySchema.parse(rawQuery)

  const where: Prisma.ShipmentWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.carrier && { carrier: query.carrier }),
    ...(query.q && {
      OR: [
        { reference: { contains: query.q, mode: 'insensitive' as const } },
        { trackingNumber: { contains: query.q, mode: 'insensitive' as const } },
        { purchaseOrder: { numero: { contains: query.q, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        purchaseOrder: { select: { id: true, numero: true } },
        quoteRequest: { select: { id: true, reference: true } },
        _count: { select: { events: true } },
      },
    }),
    prisma.shipment.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function shipmentStats() {
  const byStatus = await prisma.shipment.groupBy({ by: ['status'], _count: { _all: true } })
  const enCours = byStatus
    .filter((g) => !['DELIVERED', 'CANCELLED'].includes(g.status))
    .reduce((n, g) => n + g._count._all, 0)
  return {
    byStatus: Object.fromEntries(byStatus.map((g) => [g.status, g._count._all])),
    total: byStatus.reduce((n, g) => n + g._count._all, 0),
    enCours,
  }
}

// ---------------------------------------------------------------------------
// Mise à jour
// ---------------------------------------------------------------------------

export async function updateShipment(id: string, raw: unknown) {
  const patch = shipmentUpdateSchema.parse(raw)
  const current = await prisma.shipment.findUnique({ where: { id } })
  if (!current) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  const carrier = (patch.carrier ?? current.carrier) as ShipmentCarrier
  const trackingNumber =
    patch.trackingNumber !== undefined ? patch.trackingNumber : current.trackingNumber
  const trackingTouched = patch.carrier !== undefined || patch.trackingNumber !== undefined

  const freight =
    patch.freightCostFcfa !== undefined ? patch.freightCostFcfa : current.freightCostFcfa
  const customs =
    patch.customsCostFcfa !== undefined ? patch.customsCostFcfa : current.customsCostFcfa
  const lastMile =
    patch.lastMileCostFcfa !== undefined ? patch.lastMileCostFcfa : current.lastMileCostFcfa

  const weightKg = patch.weightKg !== undefined ? patch.weightKg : current.weightKg
  const volumeDm3 = patch.volumeDm3 !== undefined ? patch.volumeDm3 : current.volumeDm3

  return prisma.shipment.update({
    where: { id },
    data: {
      ...(patch.carrier !== undefined && { carrier: patch.carrier }),
      ...(patch.carrierOther !== undefined && { carrierOther: patch.carrierOther }),
      ...(patch.trackingNumber !== undefined && { trackingNumber: patch.trackingNumber }),
      ...(trackingTouched && { trackingUrl: buildTrackingUrl(carrier, trackingNumber) }),
      ...(patch.etaAt !== undefined && { etaAt: patch.etaAt ? new Date(patch.etaAt) : null }),
      ...(patch.weightKg !== undefined && { weightKg: patch.weightKg }),
      ...(patch.volumeDm3 !== undefined && { volumeDm3: patch.volumeDm3 }),
      ...((patch.weightKg !== undefined || patch.volumeDm3 !== undefined) && {
        chargeableWeightKg:
          weightKg != null
            ? chargeableWeightKg(current.mode as LogisticsMode, weightKg, volumeDm3 ?? 0)
            : null,
      }),
      ...(patch.freightCostFcfa !== undefined && { freightCostFcfa: patch.freightCostFcfa }),
      ...(patch.customsCostFcfa !== undefined && { customsCostFcfa: patch.customsCostFcfa }),
      ...(patch.lastMileCostFcfa !== undefined && { lastMileCostFcfa: patch.lastMileCostFcfa }),
      ...((patch.freightCostFcfa !== undefined ||
        patch.customsCostFcfa !== undefined ||
        patch.lastMileCostFcfa !== undefined) && {
        totalCostFcfa: totalCost(freight, customs, lastMile),
      }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    },
    include: ADMIN_INCLUDE,
  })
}

/**
 * Transition d'étape : écrit l'événement, horodate le champ correspondant et
 * propage au bon de commande lié. La réception (et donc le mouvement de stock)
 * reste l'écran stock existant — on ne la déclenche pas depuis ici.
 */
export async function transitionShipment(id: string, raw: unknown, actorUserId: string) {
  const input = shipmentTransitionSchema.parse(raw)
  const current = await prisma.shipment.findUnique({
    where: { id },
    select: { id: true, status: true, purchaseOrderId: true },
  })
  if (!current) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  const from = current.status as ShipmentStatusKey
  const to = input.status as ShipmentStatusKey
  if (from === to) {
    throw new AppError('SHIPMENT_SAME_STATUS', 409, { message: 'L\'expédition est déjà à cette étape' })
  }
  if (!canTransitionShipment(from, to)) {
    throw new AppError('SHIPMENT_INVALID_TRANSITION', 409, {
      message: `Transition impossible : ${SHIPMENT_STATUS_LABEL[from]} → ${SHIPMENT_STATUS_LABEL[to]}`,
    })
  }

  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()
  const stamp = STATUS_TIMESTAMP[to]

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      status: to as ShipmentStatus,
      ...(stamp ? { [stamp]: occurredAt } : {}),
      events: {
        create: {
          fromStatus: from as ShipmentStatus,
          toStatus: to as ShipmentStatus,
          label: input.label ?? SHIPMENT_STATUS_LABEL[to],
          location: input.location ?? null,
          occurredAt,
          actorUserId,
          note: input.note ?? null,
        },
      },
    },
    include: ADMIN_INCLUDE,
  })

  // Le BC passe EN_TRANSIT quand la pièce part. On ne le passe PAS en
  // RECEPTIONNEE à la livraison : la réception crée des mouvements de stock et
  // reste une action explicite de l'écran achats.
  if (current.purchaseOrderId && to === 'IN_TRANSIT') {
    await prisma.purchaseOrder
      .updateMany({
        where: { id: current.purchaseOrderId, statut: { in: ['BROUILLON', 'ENVOYEE'] } },
        data: { statut: 'EN_TRANSIT', envoyeAt: occurredAt },
      })
      .catch(() => {})
  }

  return updated
}

// ---------------------------------------------------------------------------
// Suivi public
// ---------------------------------------------------------------------------

/**
 * Projection client d'une expédition. Ni coûts internes, ni note ops, ni nom du
 * transitaire — seulement l'avancement.
 */
export async function getShipmentPublic(reference: string, token: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { reference },
    select: {
      reference: true,
      status: true,
      carrier: true,
      trackingNumber: true,
      trackingUrl: true,
      etaAt: true,
      departedAt: true,
      deliveredAt: true,
      publicTokenHash: true,
      events: {
        select: { id: true, toStatus: true, label: true, location: true, occurredAt: true },
        orderBy: { occurredAt: 'asc' },
      },
    },
  })
  // Même erreur que « introuvable » : aucune énumération de références possible.
  if (!shipment?.publicTokenHash || !safeEqualHex(hashToken(token), shipment.publicTokenHash)) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  return {
    reference: shipment.reference,
    status: shipment.status,
    statusLabel: SHIPMENT_STATUS_LABEL[shipment.status as ShipmentStatusKey],
    carrierLabel: publicCarrierLabel(shipment.carrier),
    // Numéro et lien de suivi seulement pour les intégrateurs nommables.
    trackingNumber: shipment.trackingUrl ? shipment.trackingNumber : null,
    trackingUrl: shipment.trackingUrl,
    etaAt: shipment.etaAt,
    departedAt: shipment.departedAt,
    deliveredAt: shipment.deliveredAt,
    events: shipment.events,
  }
}

/** Trouve l'expédition rattachée à une cotation, pour la page de suivi client. */
export async function getShipmentForQuoteRequest(quoteRequestId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { quoteRequestId },
    orderBy: { createdAt: 'desc' },
    select: {
      reference: true,
      status: true,
      carrier: true,
      trackingUrl: true,
      trackingNumber: true,
      etaAt: true,
      departedAt: true,
      deliveredAt: true,
      events: {
        select: { id: true, toStatus: true, label: true, location: true, occurredAt: true },
        orderBy: { occurredAt: 'asc' },
      },
    },
  })
  if (!shipment) return null
  return {
    reference: shipment.reference,
    status: shipment.status,
    statusLabel: SHIPMENT_STATUS_LABEL[shipment.status as ShipmentStatusKey],
    carrierLabel: publicCarrierLabel(shipment.carrier),
    trackingNumber: shipment.trackingUrl ? shipment.trackingNumber : null,
    trackingUrl: shipment.trackingUrl,
    etaAt: shipment.etaAt,
    departedAt: shipment.departedAt,
    deliveredAt: shipment.deliveredAt,
    events: shipment.events,
  }
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

/**
 * Prévient le demandeur de l'avancement. Action ops explicite (bouton), jamais
 * automatique sur transition : c'est l'opérateur qui décide si l'étape mérite
 * un message.
 */
export async function notifyShipmentUpdate(id: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: {
      reference: true,
      status: true,
      etaAt: true,
      quoteRequest: { select: { reference: true, phone: true, whatsapp: true } },
    },
  })
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  const phone = shipment.quoteRequest?.whatsapp ?? shipment.quoteRequest?.phone
  if (!phone) {
    throw new AppError('SHIPMENT_NO_RECIPIENT', 422, {
      message: 'Aucun numéro rattaché à cette expédition',
    })
  }

  const eta = shipment.etaAt
    ? `\nArrivée estimée : ${shipment.etaAt.toLocaleDateString('fr-FR')}`
    : ''
  const text = `Pièces — votre commande ${shipment.quoteRequest?.reference ?? shipment.reference}\nÉtape : ${
    SHIPMENT_STATUS_LABEL[shipment.status as ShipmentStatusKey]
  }${eta}`

  const result = await notifyWhatsAppUser(phone, text)
  return { ...result, reference: shipment.reference }
}
