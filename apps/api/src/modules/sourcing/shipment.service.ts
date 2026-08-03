// Suivi d'expédition — phase 4 de docs/logistique-as-a-service.md.
//
// Saisie ops + lien transporteur, AUCUNE intégration API : on stocke le numéro
// de suivi et on construit l'URL publique du transporteur. Une intégration
// pourra plus tard alimenter `ShipmentEvent` sans changer le modèle.
//
// ⚠ À ne pas confondre avec `Delivery`, qui est la course d'un coursier dans
// Abidjan. Ici c'est le transport international jusqu'à l'entrepôt.

import { randomBytes } from 'crypto'
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
  publicCarrierLabel,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatusCode,
} from 'shared/constants'
import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../lib/appError.js'
import { PO_TRANSITIONS } from '../stock/stock.service.js'
import { notifyWhatsAppUser } from '../whatsapp/whatsapp.service.js'

function validationError(error: { issues: { message: string }[] }): AppError {
  return new AppError('VALIDATION', 422, {
    message: error.issues[0]?.message ?? 'Données invalides',
  })
}

// Même alphabet que les références LOG- et BC- : sans I, O, 0, 1.
const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** « EXP-20260803-8F3K » — daté, dictable, sans caractère ambigu. */
export function buildShipmentReference(now = new Date()): string {
  const yyyy = now.getUTCFullYear()
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const bytes = randomBytes(4)
  let suffix = ''
  for (let i = 0; i < 4; i++) {
    const byte = bytes[i] ?? 0
    suffix += REF_ALPHABET[byte % REF_ALPHABET.length] ?? ''
  }
  return `EXP-${yyyy}${mm}${dd}-${suffix}`
}

/** Collision quasi impossible (32⁴/jour) mais la référence est unique : on retente. */
async function generateUniqueReference(): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const reference = buildShipmentReference()
    const exists = await prisma.shipment.findUnique({ where: { reference }, select: { id: true } })
    if (!exists) return reference
  }
  return buildShipmentReference()
}

/**
 * Horodatage posé à l'entrée dans chaque étape. `COLLECTED` n'en a pas : le
 * colis est chez le fournisseur, il n'a encore rien quitté.
 */
const STATUS_TIMESTAMP: Partial<Record<ShipmentStatus, keyof Prisma.ShipmentUncheckedUpdateInput>> =
  {
    IN_TRANSIT: 'departedAt',
    CUSTOMS: 'arrivedAt', // arrivé dans le pays, en cours de dédouanement
    LOCAL_DELIVERY: 'customsClearedAt', // dédouané, parti en livraison Abidjan
    DELIVERED: 'deliveredAt',
  }

const SHIPMENT_SELECT = {
  id: true,
  reference: true,
  purchaseOrderId: true,
  quoteRequestId: true,
  carrier: true,
  carrierOther: true,
  trackingNumber: true,
  trackingUrl: true,
  mode: true,
  status: true,
  originCountry: true,
  originCity: true,
  departedAt: true,
  etaAt: true,
  customsClearedAt: true,
  arrivedAt: true,
  deliveredAt: true,
  weightKg: true,
  volumeDm3: true,
  chargeableWeightKg: true,
  freightCostFcfa: true,
  customsCostFcfa: true,
  lastMileCostFcfa: true,
  totalCostFcfa: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ShipmentSelect

const EVENT_SELECT = {
  id: true,
  fromStatus: true,
  toStatus: true,
  label: true,
  location: true,
  occurredAt: true,
  note: true,
  actorUserId: true,
} satisfies Prisma.ShipmentEventSelect

function sumCosts(s: {
  freightCostFcfa?: number | null
  customsCostFcfa?: number | null
  lastMileCostFcfa?: number | null
}): number | null {
  const parts = [s.freightCostFcfa, s.customsCostFcfa, s.lastMileCostFcfa]
  if (parts.every((p) => p == null)) return null
  return parts.reduce<number>((sum, p) => sum + (p ?? 0), 0)
}

// ---------------------------------------------------------------------------
// Création & lectures
// ---------------------------------------------------------------------------

export async function createShipment(actorId: string, body: unknown) {
  const parsed = shipmentCreateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const input = parsed.data

  if (!input.purchaseOrderId && !input.quoteRequestId) {
    throw new AppError('SHIPMENT_NO_LINK', 422, {
      message: 'Rattachez l\'expédition à un bon de commande ou à une demande de cotation',
    })
  }

  // Le rattachement à la demande est ce qui rend l'expédition visible du client
  // sur sa page de suivi : on le déduit du BC quand il n'est pas fourni.
  let quoteRequestId = input.quoteRequestId ?? null
  if (input.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      select: { id: true, sourcingOffers: { select: { search: { select: { quoteRequestId: true } } } } },
    })
    if (!po) {
      throw new AppError('PO_NOT_FOUND', 404, { message: 'Bon de commande introuvable' })
    }
    quoteRequestId ??= po.sourcingOffers[0]?.search.quoteRequestId ?? null
  }

  const reference = await generateUniqueReference()
  const trackingUrl = buildTrackingUrl(input.carrier, input.trackingNumber)

  const shipment = await prisma.shipment.create({
    data: {
      reference,
      purchaseOrderId: input.purchaseOrderId ?? null,
      quoteRequestId,
      carrier: input.carrier,
      carrierOther: input.carrierOther ?? null,
      trackingNumber: input.trackingNumber ?? null,
      trackingUrl,
      mode: input.mode,
      originCountry: input.originCountry ?? null,
      originCity: input.originCity ?? null,
      etaAt: input.etaAt ? new Date(input.etaAt) : null,
      weightKg: input.weightKg ?? null,
      volumeDm3: input.volumeDm3 ?? null,
      freightCostFcfa: input.freightCostFcfa ?? null,
      customsCostFcfa: input.customsCostFcfa ?? null,
      lastMileCostFcfa: input.lastMileCostFcfa ?? null,
      totalCostFcfa: sumCosts(input),
      notes: input.notes ?? null,
      createdById: actorId,
      events: {
        create: {
          toStatus: 'SOURCING',
          label: SHIPMENT_STATUS_LABELS.SOURCING,
          actorUserId: actorId,
          note: 'Expédition créée',
        },
      },
    },
    select: SHIPMENT_SELECT,
  })

  return shipment
}

export async function getShipment(id: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: {
      ...SHIPMENT_SELECT,
      events: { select: EVENT_SELECT, orderBy: { occurredAt: 'asc' } },
      purchaseOrder: {
        select: { id: true, numero: true, statut: true, supplier: { select: { id: true, nom: true } } },
      },
      quoteRequest: {
        select: { id: true, reference: true, partName: true, contactName: true, phone: true, whatsapp: true },
      },
    },
  })
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }
  return shipment
}

export async function adminListShipments(rawQuery: unknown) {
  const parsed = adminShipmentListQuerySchema.safeParse(rawQuery)
  if (!parsed.success) throw validationError(parsed.error)
  const query = parsed.data

  const where: Prisma.ShipmentWhereInput = {
    ...(query.status && { status: query.status }),
    ...(query.carrier && { carrier: query.carrier }),
    ...(query.q && {
      OR: [
        { reference: { contains: query.q, mode: 'insensitive' as const } },
        { trackingNumber: { contains: query.q, mode: 'insensitive' as const } },
        { purchaseOrder: { numero: { contains: query.q, mode: 'insensitive' as const } } },
        { quoteRequest: { reference: { contains: query.q, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const [items, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        ...SHIPMENT_SELECT,
        purchaseOrder: { select: { id: true, numero: true } },
        quoteRequest: { select: { id: true, reference: true, partName: true } },
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

export async function updateShipment(id: string, body: unknown) {
  const parsed = shipmentUpdateSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const patch = parsed.data

  const current = await prisma.shipment.findUnique({
    where: { id },
    select: {
      id: true,
      carrier: true,
      trackingNumber: true,
      freightCostFcfa: true,
      customsCostFcfa: true,
      lastMileCostFcfa: true,
    },
  })
  if (!current) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  const data: Prisma.ShipmentUncheckedUpdateInput = {
    ...patch,
    ...(patch.etaAt !== undefined && { etaAt: patch.etaAt ? new Date(patch.etaAt) : null }),
  }

  // Le lien de suivi se régénère dès que le numéro change — jamais saisi à la main.
  if (patch.trackingNumber !== undefined) {
    data.trackingUrl = buildTrackingUrl(current.carrier, patch.trackingNumber)
  }

  const costsTouched =
    patch.freightCostFcfa !== undefined ||
    patch.customsCostFcfa !== undefined ||
    patch.lastMileCostFcfa !== undefined
  if (costsTouched) {
    data.totalCostFcfa = sumCosts({
      freightCostFcfa: patch.freightCostFcfa !== undefined ? patch.freightCostFcfa : current.freightCostFcfa,
      customsCostFcfa: patch.customsCostFcfa !== undefined ? patch.customsCostFcfa : current.customsCostFcfa,
      lastMileCostFcfa:
        patch.lastMileCostFcfa !== undefined ? patch.lastMileCostFcfa : current.lastMileCostFcfa,
    })
  }

  return prisma.shipment.update({ where: { id }, data, select: SHIPMENT_SELECT })
}

// ---------------------------------------------------------------------------
// Machine à états
// ---------------------------------------------------------------------------

/**
 * Fait avancer l'expédition d'une étape, journalise l'événement et propage au
 * bon de commande lié.
 *
 * ⚠ La propagation respecte `PO_TRANSITIONS` : `EN_TRANSIT` n'est atteignable
 * que depuis `ENVOYEE`. Un BC encore en `BROUILLON` reste en l'état — on le
 * note dans l'événement plutôt que de forcer une transition illégale.
 *
 * `DELIVERED` ne touche pas au BC : la réception est un geste distinct, fait
 * sur l'écran stock, et c'est elle seule qui crée le `StockMovement` et le CUMP.
 */
export async function transitionShipment(id: string, actorId: string, body: unknown) {
  const parsed = shipmentTransitionSchema.safeParse(body)
  if (!parsed.success) throw validationError(parsed.error)
  const input = parsed.data

  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: { id: true, status: true, purchaseOrderId: true },
  })
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }

  const from = shipment.status as ShipmentStatusCode
  const to = input.toStatus as ShipmentStatusCode
  if (!canTransitionShipment(from, to)) {
    throw new AppError('SHIPMENT_INVALID_TRANSITION', 422, {
      message: `Transition invalide : ${SHIPMENT_STATUS_LABELS[from]} → ${SHIPMENT_STATUS_LABELS[to]}`,
    })
  }

  let propagationNote: string | null = null
  if (to === 'IN_TRANSIT' && shipment.purchaseOrderId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: shipment.purchaseOrderId },
      select: { id: true, statut: true, numero: true },
    })
    if (po) {
      if (PO_TRANSITIONS[po.statut].includes('EN_TRANSIT')) {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { statut: 'EN_TRANSIT' },
        })
      } else if (po.statut !== 'EN_TRANSIT') {
        propagationNote = `Bon de commande ${po.numero} laissé en ${po.statut} (transition vers EN_TRANSIT non autorisée)`
      }
    }
  }

  const stamp = STATUS_TIMESTAMP[to]
  const occurredAt = input.occurredAt ? new Date(input.occurredAt) : new Date()

  const updated = await prisma.shipment.update({
    where: { id },
    data: {
      status: to,
      ...(stamp ? { [stamp]: occurredAt } : {}),
      events: {
        create: {
          fromStatus: from,
          toStatus: to,
          label: input.label ?? SHIPMENT_STATUS_LABELS[to],
          location: input.location ?? null,
          occurredAt,
          actorUserId: actorId,
          note: [input.note, propagationNote].filter(Boolean).join(' — ') || null,
        },
      },
    },
    select: { ...SHIPMENT_SELECT, events: { select: EVENT_SELECT, orderBy: { occurredAt: 'asc' } } },
  })

  return updated
}

/**
 * Prévient le demandeur de l'avancement — action ops explicite, jamais
 * automatique : c'est un message WhatsApp, pas une notification système.
 *
 * ⚠ Le transporteur est assaini par `publicCarrierLabel` : le partenaire
 * transitaire n'est jamais nommé au client.
 */
export async function notifyShipmentUpdate(id: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    select: {
      reference: true,
      status: true,
      carrier: true,
      etaAt: true,
      quoteRequest: { select: { reference: true, partName: true, phone: true, whatsapp: true } },
    },
  })
  if (!shipment) {
    throw new AppError('SHIPMENT_NOT_FOUND', 404, { message: 'Expédition introuvable' })
  }
  const target = shipment.quoteRequest?.whatsapp ?? shipment.quoteRequest?.phone
  if (!target) {
    throw new AppError('SHIPMENT_NO_RECIPIENT', 422, {
      message: 'Aucun contact WhatsApp rattaché à cette expédition',
    })
  }

  const eta = shipment.etaAt
    ? `\nArrivée estimée : ${shipment.etaAt.toLocaleDateString('fr-FR')}`
    : ''
  const text =
    `Pièces — suivi ${shipment.quoteRequest?.reference ?? shipment.reference}\n` +
    `${shipment.quoteRequest?.partName ?? 'Votre pièce'}\n` +
    `Étape : ${SHIPMENT_STATUS_LABELS[shipment.status as ShipmentStatusCode]}\n` +
    `Acheminement : ${publicCarrierLabel(shipment.carrier)}${eta}`

  const res = await notifyWhatsAppUser(target, text)
  return { sent: res.sent, channel: res.channel }
}
