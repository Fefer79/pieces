import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import type { Prisma, ShipmentStatus } from '@prisma/client'
import {
  shipmentCreateSchema,
  shipmentUpdateSchema,
  shipmentTransitionSchema,
  adminShipmentListQuerySchema,
} from 'shared/validators'
import {
  buildTrackingUrl,
  canTransitionShipment,
  SHIPMENT_STATUSES,
  publicCarrierLabel,
  type ShipmentCarrierKey,
  type ShipmentStatusKey,
} from 'shared/constants'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { notifyWhatsAppUser } from '../whatsapp/whatsapp.service.js'

type Logger = {
  info: (obj: Record<string, unknown>, msg: string) => void
  warn: (obj: Record<string, unknown>, msg: string) => void
}

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans I, O, 0, 1

/** « EXP-20260803-8F3K » — daté, dictable, sans caractère ambigu (cf. buildReference). */
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

const SHIPMENT_INCLUDE = {
  events: { orderBy: { occurredAt: 'asc' as const } },
  purchaseOrder: {
    select: {
      id: true,
      numero: true,
      statut: true,
      supplier: { select: { id: true, nom: true } },
    },
  },
  quoteRequest: {
    select: { id: true, reference: true, partName: true, contactName: true, phone: true, whatsapp: true },
  },
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.ShipmentInclude

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

/**
 * Crée l'expédition et son premier événement. Le jeton de suivi public est
 * renvoyé EN CLAIR une seule fois (seul son hash est stocké) : c'est ce jeton
 * qu'on met dans le lien envoyé au client.
 */
export async function createShipment(body: unknown, actorId: string) {
  const parsed = shipmentCreateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const data = parsed.data

  if (data.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: data.purchaseOrderId },
      select: { id: true },
    })
    if (!po) throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
  }
  if (data.quoteRequestId) {
    const lead = await prisma.logisticsQuoteRequest.findUnique({
      where: { id: data.quoteRequestId },
      select: { id: true },
    })
    if (!lead) {
      throw new AppError('LOGISTICS_LEAD_NOT_FOUND', 404, { message: 'Cotation introuvable' })
    }
  }

  const token = randomBytes(24).toString('hex')
  const shipment = await prisma.shipment.create({
    data: {
      reference: await generateUniqueReference(),
      purchaseOrderId: data.purchaseOrderId ?? null,
      quoteRequestId: data.quoteRequestId ?? null,
      carrier: data.carrier,
      carrierOther: data.carrierOther ?? null,
      trackingNumber: data.trackingNumber ?? null,
      trackingUrl: buildTrackingUrl(data.carrier, data.trackingNumber),
      mode: data.mode,
      originCountry: data.originCountry ?? null,
      originCity: data.originCity ?? null,
      etaAt: data.etaAt ? new Date(data.etaAt) : null,
      weightKg: data.weightKg ?? null,
      volumeDm3: data.volumeDm3 ?? null,
      notes: data.notes ?? null,
      publicTokenHash: hashToken(token),
      createdById: actorId,
      events: {
        create: {
          toStatus: 'SOURCING',
          label: 'Expédition créée',
          actorUserId: actorId,
        },
      },
    },
    include: SHIPMENT_INCLUDE,
  })

  return { ...shipment, publicToken: token }
}

async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = buildShipmentReference()
    const exists = await prisma.shipment.findUnique({ where: { reference }, select: { id: true } })
    if (!exists) return reference
  }
  return buildShipmentReference()
}

export async function updateShipment(id: string, body: unknown) {
  const parsed = shipmentUpdateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const patch = parsed.data

  const current = await prisma.shipment.findUnique({ where: { id } })
  if (!current) throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })

  // Le lien de suivi est dérivé, jamais saisi : il se recalcule dès que le
  // transporteur ou le numéro bouge.
  const carrier = (patch.carrier ?? current.carrier) as ShipmentCarrierKey
  const trackingNumber =
    patch.trackingNumber !== undefined ? patch.trackingNumber : current.trackingNumber
  const trackingTouched = patch.carrier !== undefined || patch.trackingNumber !== undefined

  const costs = {
    freight: patch.freightCostFcfa !== undefined ? patch.freightCostFcfa : current.freightCostFcfa,
    customs: patch.customsCostFcfa !== undefined ? patch.customsCostFcfa : current.customsCostFcfa,
    lastMile:
      patch.lastMileCostFcfa !== undefined ? patch.lastMileCostFcfa : current.lastMileCostFcfa,
  }
  const anyCost = costs.freight != null || costs.customs != null || costs.lastMile != null

  return prisma.shipment.update({
    where: { id },
    data: {
      ...(patch.carrier !== undefined && { carrier: patch.carrier }),
      ...(patch.carrierOther !== undefined && { carrierOther: patch.carrierOther }),
      ...(patch.trackingNumber !== undefined && { trackingNumber: patch.trackingNumber }),
      ...(trackingTouched && { trackingUrl: buildTrackingUrl(carrier, trackingNumber) }),
      ...(patch.mode !== undefined && { mode: patch.mode }),
      ...(patch.originCountry !== undefined && { originCountry: patch.originCountry }),
      ...(patch.originCity !== undefined && { originCity: patch.originCity }),
      ...(patch.etaAt !== undefined && { etaAt: patch.etaAt ? new Date(patch.etaAt) : null }),
      ...(patch.weightKg !== undefined && { weightKg: patch.weightKg }),
      ...(patch.volumeDm3 !== undefined && { volumeDm3: patch.volumeDm3 }),
      ...(patch.freightCostFcfa !== undefined && { freightCostFcfa: patch.freightCostFcfa }),
      ...(patch.customsCostFcfa !== undefined && { customsCostFcfa: patch.customsCostFcfa }),
      ...(patch.lastMileCostFcfa !== undefined && { lastMileCostFcfa: patch.lastMileCostFcfa }),
      ...(anyCost && {
        totalCostFcfa: (costs.freight ?? 0) + (costs.customs ?? 0) + (costs.lastMile ?? 0),
      }),
      ...(patch.notes !== undefined && { notes: patch.notes }),
    },
    include: SHIPMENT_INCLUDE,
  })
}

/**
 * Fait avancer l'expédition : garde de transition, événement horodaté, champ de
 * date correspondant, puis propagation au bon de commande lié.
 *
 * La RÉCEPTION du BC n'est jamais faite ici : elle passe par l'écran stock
 * existant, qui déclenche le mouvement de stock et le CUMP.
 */
export async function transitionShipment(id: string, body: unknown, actorId: string) {
  const parsed = shipmentTransitionSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const { toStatus, label, location, occurredAt, note } = parsed.data

  const shipment = await prisma.shipment.findUnique({ where: { id } })
  if (!shipment) throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })

  const from = shipment.status as ShipmentStatusKey
  if (from === toStatus) {
    throw new AppError('SHIPMENT_SAME_STATUS', 409, {
      message: 'L\'expédition est déjà dans cet état',
    })
  }
  if (!canTransitionShipment(from, toStatus as ShipmentStatusKey)) {
    throw new AppError('SHIPMENT_INVALID_TRANSITION', 409, {
      message: `Transition ${from} → ${toStatus} impossible`,
    })
  }

  const at = occurredAt ? new Date(occurredAt) : new Date()
  const timestampField = SHIPMENT_STATUSES[toStatus as ShipmentStatusKey].timestampField

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      status: toStatus as ShipmentStatus,
      ...(timestampField ? { [timestampField]: at } : {}),
      events: {
        create: {
          fromStatus: from as ShipmentStatus,
          toStatus: toStatus as ShipmentStatus,
          label: label ?? SHIPMENT_STATUSES[toStatus as ShipmentStatusKey].label,
          location: location ?? null,
          occurredAt: at,
          actorUserId: actorId,
          note: note ?? null,
        },
      },
    },
    include: SHIPMENT_INCLUDE,
  })

  // EN_TRANSIT est le seul état du BC qu'on pilote depuis l'expédition, et
  // seulement depuis ENVOYEE : on ne réanime pas un BC annulé ou réceptionné.
  if (toStatus === 'IN_TRANSIT' && updated.purchaseOrderId) {
    await prisma.purchaseOrder.updateMany({
      where: { id: updated.purchaseOrderId, statut: 'ENVOYEE' },
      data: { statut: 'EN_TRANSIT', envoyeAt: shipment.departedAt ?? at },
    })
  }

  return updated
}

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

export async function adminListShipments(rawQuery: unknown) {
  const query = adminShipmentListQuerySchema.parse(rawQuery)

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
        quoteRequest: { select: { id: true, reference: true, partName: true } },
        _count: { select: { events: true } },
      },
    }),
    prisma.shipment.count({ where }),
  ])

  return { items, total, page: query.page, pageSize: query.pageSize }
}

export async function adminShipmentStats() {
  const grouped = await prisma.shipment.groupBy({ by: ['status'], _count: { _all: true } })
  return {
    byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
    total: grouped.reduce((n, g) => n + g._count._all, 0),
    enCours: grouped
      .filter((g) => !['DELIVERED', 'CANCELLED'].includes(g.status))
      .reduce((n, g) => n + g._count._all, 0),
  }
}

export async function adminGetShipment(id: string) {
  const shipment = await prisma.shipment.findUnique({ where: { id }, include: SHIPMENT_INCLUDE })
  if (!shipment) throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  return shipment
}

/**
 * Vue client d'une expédition. Anonymise le transitaire (règle produit :
 * logistique-content.ts), n'expose AUCUN coût, et ne renvoie que les étapes.
 */
export async function getShipmentPublic(reference: string, token: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { reference },
    include: { events: { orderBy: { occurredAt: 'asc' } } },
  })
  if (!shipment?.publicTokenHash || !safeEqualHex(shipment.publicTokenHash, hashToken(token))) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }
  return toPublicShipment(shipment)
}

/** Projection publique — partagée avec la page de suivi d'une cotation. */
export function toPublicShipment(shipment: {
  reference: string
  status: string
  carrier: string
  carrierOther: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  etaAt: Date | null
  departedAt: Date | null
  customsClearedAt: Date | null
  arrivedAt: Date | null
  deliveredAt: Date | null
  events: Array<{
    id: string
    toStatus: string | null
    label: string
    location: string | null
    occurredAt: Date
  }>
}) {
  const carrier = shipment.carrier as ShipmentCarrierKey
  const named = publicCarrierLabel(carrier, shipment.carrierOther)
  const isNamed = named !== 'Notre partenaire logistique'

  return {
    reference: shipment.reference,
    status: shipment.status,
    carrierLabel: named,
    // Numéro et lien de suivi seulement chez les transporteurs nommables :
    // un numéro de LTA transitaire ne veut rien dire pour le client.
    trackingNumber: isNamed ? shipment.trackingNumber : null,
    trackingUrl: isNamed ? shipment.trackingUrl : null,
    etaAt: shipment.etaAt,
    departedAt: shipment.departedAt,
    customsClearedAt: shipment.customsClearedAt,
    arrivedAt: shipment.arrivedAt,
    deliveredAt: shipment.deliveredAt,
    events: shipment.events.map((e) => ({
      id: e.id,
      toStatus: e.toStatus,
      label: e.label,
      location: e.location,
      occurredAt: e.occurredAt,
    })),
  }
}

/** Expédition rattachée à une cotation, pour la page de suivi client existante. */
export async function getShipmentForQuoteRequest(quoteRequestId: string) {
  const shipment = await prisma.shipment.findFirst({
    where: { quoteRequestId, status: { not: 'CANCELLED' } },
    orderBy: { createdAt: 'desc' },
    include: { events: { orderBy: { occurredAt: 'asc' } } },
  })
  return shipment ? toPublicShipment(shipment) : null
}

/**
 * Prévient le demandeur par WhatsApp. Action ops explicite : jamais déclenchée
 * automatiquement par une transition, pour ne pas noyer le client de messages.
 */
export async function notifyShipmentUpdate(id: string, logger?: Logger) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      quoteRequest: { select: { reference: true, contactName: true, phone: true, whatsapp: true } },
    },
  })
  if (!shipment) throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })

  const phone = shipment.quoteRequest?.whatsapp ?? shipment.quoteRequest?.phone
  if (!phone) {
    throw new AppError('SHIPMENT_NO_CONTACT', 422, {
      message: 'Aucun numéro WhatsApp rattaché à cette expédition',
    })
  }

  const spec = SHIPMENT_STATUSES[shipment.status as ShipmentStatusKey]
  const eta = shipment.etaAt
    ? ` Arrivée estimée : ${shipment.etaAt.toLocaleDateString('fr-FR')}.`
    : ''
  const text = `Pièces — suivi ${shipment.quoteRequest?.reference ?? shipment.reference}\n${spec.publicLabel}.${eta}`

  const result = await notifyWhatsAppUser(phone, text)
  logger?.info(
    { event: 'SHIPMENT_NOTIFIED', shipmentId: id, sent: result.sent, channel: result.channel },
    'Notification expédition',
  )
  return result
}
